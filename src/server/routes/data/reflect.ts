import type { LocalServer, RouteRequest } from "../../";
import { AccessCheckOperation, HasAccessResult } from "../../services/rules";
import { sendError, sendUnauthorizedError } from "../../shared/error";
import { PathInfo, Types } from "ivipbase-core";

export type RequestQuery = { type: "info" | "children"; child_limit?: number; child_skip?: number; impersonate?: string };
export type RequestBody = null;
export type ResponseBody = Types.ReflectionNodeInfo &
	Types.ReflectionChildrenInfo & {
		impersonation: {
			uid: string;
			read: {
				allow: boolean;
				error?: { code: string; message: string };
			};
			write: {
				allow: boolean;
				error?: { code: string; message: string };
			};
		};
	};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoutes = (env: LocalServer) => {
	env.router.get(`/reflect/:dbName/*`, async (req: Request, res) => {
		const { dbName } = req.params;

		if (!env.hasDatabase(dbName)) {
			return sendError(res, {
				code: "not_found",
				message: `Database '${dbName}' not found`,
			});
		}

		const path = "/" + req.params["0"];
		const access = await env.rules(dbName).isOperationAllowed(req.user ?? ({} as any), path, "reflect", { context: req.context, type: req.query.type });
		if (!access.allow) {
			return sendUnauthorizedError(res, access.code, access.message);
		}

		const impersonatedAccess: {
			uid: string | null | undefined;
			operations: Record<AccessCheckOperation, HasAccessResult>;
			read: {
				allow: boolean;
				error: null | { code: "rule" | "no_rule" | "private" | "exception"; message: string };
			};
			write: {
				allow: boolean;
				error: null | { code: "rule" | "no_rule" | "private" | "exception"; message: string };
			};
		} = {
			uid: req.user?.uid !== "admin" ? null : req.query.impersonate,
			/**
			 * NEW, check all possible operations
			 */
			operations: {} as Record<AccessCheckOperation, HasAccessResult>,
			/** Result of `get` operation */
			read: {
				allow: false,
				error: null,
			},
			/** Result of `set` operation */
			write: {
				allow: false,
				error: null,
			},
		};

		const impersonatedUser = impersonatedAccess.uid === "anonymous" ? null : { uid: impersonatedAccess.uid };
		const impersonatedData = { context: { acebase_reflect: true }, value: "[[reflect]]" }; // TODO: Make configurable

		if (impersonatedAccess.uid) {
			for (const operation of ["transact", "get", "update", "set", "delete", "reflect", "exists", "query", "import", "export"] as AccessCheckOperation[]) {
				const access = await env.rules(dbName).isOperationAllowed(impersonatedUser as any, path, operation, impersonatedData);
				impersonatedAccess.operations[operation] = access;
			}
			const readAccess = await env.rules(dbName).isOperationAllowed(impersonatedUser as any, path, "get"); // Use pre-flight 'get' check to mimic legacy 'read' check
			impersonatedAccess.read.allow = readAccess.allow;
			if (!readAccess.allow) {
				impersonatedAccess.read.error = { code: readAccess.code, message: readAccess.message };
			}
			const writeAccess = await env.rules(dbName).isOperationAllowed(impersonatedUser as any, path, "update"); // Use pre-flight 'update' check to mimic legacy 'write' check
			impersonatedAccess.write.allow = writeAccess.allow;
			if (!writeAccess.allow) {
				impersonatedAccess.write.error = { code: writeAccess.code, message: writeAccess.message };
			}
		}

		const type = req.query.type ?? "info";
		const args: any = {};

		Object.keys(req.query).forEach((key) => {
			if (!["type", "impersonate"].includes(key)) {
				let val = (req as any).query[key] as any;
				if (/^(?:true|false|[0-9]+)$/.test(val)) {
					val = JSON.parse(val);
				}
				args[key] = val;
			}
		});

		try {
			const result: ResponseBody = await (env.db(dbName).ref(path).reflect as (type: string, args: any) => any)(type, args);
			if (impersonatedAccess.uid) {
				(result as any).impersonation = impersonatedAccess;
				let list: any;
				if (type === "children") {
					list = result.list;
				} else if (type === "info") {
					list = typeof result.children === "object" && "list" in result.children ? result.children.list : [];
				}
				for (const childInfo of list ?? []) {
					childInfo.access = {
						read: (await env.rules(dbName).isOperationAllowed(impersonatedUser as any, PathInfo.getChildPath(path, childInfo.key), "get")).allow, // Use pre-flight 'get' check to mimic legacy 'read' check
						write: (await env.rules(dbName).isOperationAllowed(impersonatedUser as any, PathInfo.getChildPath(path, childInfo.key), "update")).allow, // Use pre-flight 'update' check to mimic legacy 'write' check
					};
				}
			}
			res.send(result);
		} catch (err) {
			res.statusCode = 500;
			res.send(err as any);
		}
	});
};

export default addRoutes;
