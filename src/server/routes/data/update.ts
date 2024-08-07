import { Transport, Types } from "ivipbase-core";
import type { LocalServer, RouteRequest } from "../../";
import { AccessRuleValidationError, RuleValidationFailCode } from "../../../database/services/rules";
import { sendBadRequestError, sendError, sendUnauthorizedError } from "../../shared/error";
import { SchemaValidationError } from "../../../database";

export class UpdateDataError extends Error {
	constructor(public code: "invalid_serialized_value", message: string) {
		super(message);
	}
}

export type RequestQuery = null;
export type RequestBody = Types.SerializedValue; //{ val: any; map?: string|Record<string, 'date'|'binary'|'reference'|'regexp'|'array'> };
export type ResponseBody =
	| { success: true } // 200
	| { code: "invalid_serialized_value"; message: string } // 400
	| { code: RuleValidationFailCode; message: string } // 403
	| { code: "schema_validation_failed"; message: string } // 422
	| { code: string; message: string };
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoutes = (env: LocalServer) => {
	env.router.post(`/data/:dbName/*`, async (req: Request, res) => {
		const { dbName } = req.params;

		if (!env.hasDatabase(dbName)) {
			return sendError(res, {
				code: "not_found",
				message: `Database '${dbName}' not found`,
			});
		}

		const path = req.params["0"];
		const LOG_ACTION = "data.update";
		const LOG_DETAILS = { ip: req.ip, uid: req.user?.uid ?? null, path };

		try {
			// Pre-check 'write' access
			let access = await env.rules(dbName).isOperationAllowed(req.user ?? ({} as any), path, "update");
			if (!access.allow) {
				throw new AccessRuleValidationError(access);
			}

			const data = req.body;
			if (typeof data?.val === "undefined" || !["string", "object", "undefined"].includes(typeof data?.map)) {
				throw new UpdateDataError("invalid_serialized_value", "The sent value is not properly serialized");
			}
			const val = Transport.deserialize(data);

			if (path === "" && (req.user?.permission_level ?? 0) > 1 && val !== null && typeof val === "object") {
				// Non-admin user: remove any private properties from the update object
				Object.keys(val)
					.filter((key) => key.startsWith("__"))
					.forEach((key) => delete val[key]);
			}

			// Check 'update' access
			access = await env.rules(dbName).isOperationAllowed(req.user ?? ({} as any), path, "update", { value: val, context: req.context });
			if (!access.allow) {
				throw new AccessRuleValidationError(access);
			}

			// Schema validation moved to storage, no need to check here but an early check won't do no harm!
			const validation = await env.db(dbName).schema.check(path, val, true);
			if (!validation.ok) {
				throw new SchemaValidationError(validation.reason ?? "Schema validation failed");
			}

			await env.db(dbName).ref(path).context(req.context).update(val);

			// NEW: add cursor to response context, which was added to the request context in `acebase_cursor` if transaction logging is enabled
			const returnContext = { acebase_cursor: (req as any)?.context?.acebase_cursor };
			res.setHeader("DataBase-Context", JSON.stringify(returnContext));

			res.send({ success: true });
		} catch (err) {
			if (err instanceof AccessRuleValidationError) {
				const access = err.result;
				env.log.error(LOG_ACTION, "unauthorized", { ...LOG_DETAILS, rule_code: access.code, rule_path: access.rulePath ?? null, rule_error: access.details?.message ?? null });
				return sendUnauthorizedError(res, access.code ?? "access_rule", access.message ?? "Unauthorized");
			}
			if (err instanceof SchemaValidationError) {
				env.log.error(LOG_ACTION, "schema_validation_failed", { ...LOG_DETAILS, reason: err.reason });
				res.status(422).send({ code: "schema_validation_failed", message: err.message });
			} else if (err instanceof UpdateDataError) {
				env.log.error(LOG_ACTION, err.code, { ...LOG_DETAILS, message: err.message });
				sendBadRequestError(res, err);
			} else {
				env.debug.error(`failed to update "${path}":`, err);
				env.log.error(LOG_ACTION, "unexpected", LOG_DETAILS, err);
				sendError(res, err as any);
			}
		}
	});
};

export default addRoutes;
