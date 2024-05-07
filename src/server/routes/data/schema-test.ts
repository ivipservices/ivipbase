import type { LocalServer, RouteRequest } from "../../";
import adminOnly from "../../middleware/admin-only";
import { sendError, sendUnauthorizedError } from "../../shared/error";
import { SchemaDefinition, Transport, Types } from "ivipbase-core";

export type RequestQuery = null;
export type RequestBody = {
	value: Types.SerializedValue;
	partial: boolean;
	path?: string;
	schema?: Types.SchemaInfo;
};
export type ResponseBody =
	| Types.ISchemaCheckResult // 200
	| { code: "admin_only"; message: string } // 403
	| { code: "unexpected"; message: string }; // 500
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoutes = (env: LocalServer) => {
	env.router.post(`/schema/:dbName/test`, adminOnly(env), async (req: Request, res) => {
		const { dbName } = req.params;

		if (!env.hasDatabase(dbName)) {
			return sendError(res, {
				code: "not_found",
				message: `Database '${dbName}' not found`,
			});
		}

		try {
			const data = req.body;
			if (typeof data.value?.val === "undefined" || !["string", "object", "undefined"].includes(typeof data.value?.map)) {
				return sendError(res, { code: "invalid_serialized_value", message: "The sent value is not properly serialized" });
			}
			const value = Transport.deserialize(data.value);
			const { path, schema, partial } = data;
			if (!path) {
				return sendError(res, { code: "missing_path", message: "Path is required" });
			}
			let result: Types.ISchemaCheckResult;
			if (schema) {
				const definition = new SchemaDefinition(schema);
				result = definition.check(path, value, partial);
			} else {
				result = await env.db(dbName).schema.check(path, schema, partial);
			}

			res.contentType("application/json").send(result);
		} catch (err) {
			sendError(res, err as any);
		}
	});
};

export default addRoutes;
