import { Transport, Types } from "ivipbase-core";
import type { LocalServer, RouteRequest } from "../../";
import { sendBadRequestError, sendError, sendUnauthorizedError } from "../../shared/error";
import { AccessRuleValidationError, RuleValidationFailCode } from "../../services/rules";
import { SchemaValidationError } from "../../../database";

export class SetDataError extends Error {
	constructor(public code: "invalid_serialized_value", message: string) {
		super(message);
	}
}
export type RequestQuery = null;
export type RequestBody = Types.SerializedValue; // { val: any; map?: string|Record<string, 'date'|'binary'|'reference'|'regexp'|'array'> };
export type ResponseBody =
	| { success: true } // 200
	| { code: "invalid_serialized_value"; message: string } // 400
	| { code: RuleValidationFailCode; message: string } // 403
	| { code: "schema_validation_failed"; message: string } // 422
	| { code: string; message: string }; // 500
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoutes = (env: LocalServer) => {
	env.router.put(`/data/:dbName/*`, async (req: Request, res) => {
		const { dbName } = req.params;

		if (!env.hasDatabase(dbName)) {
			return sendError(res, {
				code: "not_found",
				message: `Database '${dbName}' not found`,
			});
		}

		const path = req.params["0"];
		const LOG_ACTION = "data.set";
		const LOG_DETAILS = { ip: req.ip, uid: req.user?.uid ?? null, path };

		try {
			// Pre-check 'write' access
			let access = await env.rules(dbName).isOperationAllowed(req.user ?? ({} as any), path, "set");
			if (!access.allow) {
				throw new AccessRuleValidationError(access);
			}

			const data = req.body;
			if (typeof data?.val === "undefined" || !["string", "object", "undefined"].includes(typeof data?.map)) {
				throw new SetDataError("invalid_serialized_value", "The sent value is not properly serialized");
			}
			const val = Transport.deserialize(data);

			if (path === "" && (req.user?.permission_level ?? 0) > 1 && val !== null && typeof val === "object") {
				// Non-admin user: remove any private properties from the update object
				Object.keys(val)
					.filter((key) => key.startsWith("__"))
					.forEach((key) => delete val[key]);
			}

			access = await env.rules(dbName).isOperationAllowed(req.user ?? ({} as any), path, "set", { value: val, context: req.context });
			if (!access.allow) {
				throw new AccessRuleValidationError(access);
			}

			// Schema validation moved to storage, no need to check here but an early check won't do no harm!
			const validation = await env.db(dbName).schema.check(path, val, false);
			if (!validation.ok) {
				throw new SchemaValidationError(validation.reason ?? "Schema validation failed");
			}

			await env.db(dbName).ref(path).context(req.context).set(val);

			// NEW: add cursor to response context, which was added to the request context in `database_cursor` if transaction logging is enabled
			const returnContext = { database_cursor: (req as any)?.context?.database_cursor };
			res.setHeader("AceBase-Context", JSON.stringify(returnContext));

			res.send({ success: true });
		} catch (err) {
			if (err instanceof AccessRuleValidationError) {
				const access = err.result;
				env.log.error(LOG_ACTION, "unauthorized", { ...LOG_DETAILS, rule_code: access.code, rule_path: access.rulePath ?? null, rule_error: access.details?.message ?? null });
				return sendUnauthorizedError(res, access.code ?? "access_rule", access.message ?? "Unauthorized");
			} else if (err instanceof SchemaValidationError) {
				env.log.error(LOG_ACTION, "schema_validation_failed", { ...LOG_DETAILS, reason: err.reason });
				res.status(422).send({ code: "schema_validation_failed", message: err.message });
			} else if (err instanceof SetDataError) {
				env.log.error(LOG_ACTION, err.code, { ...LOG_DETAILS, message: err.message });
				sendBadRequestError(res, err);
			} else {
				env.debug.error(`failed to set "${path}":`, err);
				env.log.error(LOG_ACTION, "unexpected", LOG_DETAILS, err);
				sendError(res, err as any);
			}
		}
	});
};

export default addRoutes;
