import type { LocalServer, RouteRequest } from "../../";
import adminOnly from "../../middleware/admin-only";
import { sendError, sendUnauthorizedError } from "../../shared/error";

export type RequestQuery = null;
export type RequestBody = {
	action?: "set"; // deprecated
	path: string;
	schema: string | Record<string, any>;
	warnOnly?: boolean;
};
export type ResponseBody =
	| { success: true } // 200
	| { code: "admin_only"; message: string } // 403
	| { code: "unexpected"; message: string }; // 500
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoutes = (env: LocalServer) => {
	env.router.post(`/schema/:dbName`, adminOnly(env), async (req: Request, res) => {
		const { dbName } = req.params;

		if (!env.hasDatabase(dbName)) {
			return sendError(res, {
				code: "not_found",
				message: `Database '${dbName}' not found`,
			});
		}

		try {
			const data = req.body;
			const { path, schema, warnOnly = false } = data;
			await env.db(dbName).schema.set(path, schema, warnOnly);

			res.contentType("application/json").send({ success: true });
		} catch (err) {
			sendError(res, err as any);
		}
	});
};

export default addRoutes;
