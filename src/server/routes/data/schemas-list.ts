import type { LocalServer, RouteRequest } from "../../";
import adminOnly from "../../middleware/admin-only";
import { sendError, sendUnauthorizedError } from "../../shared/error";

export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = { path: string; schema: string; text: string }[]; // 200
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoutes = (env: LocalServer) => {
	env.router.get(`/schema/:dbName`, adminOnly(env), async (req: Request, res) => {
		const { dbName } = req.params;

		if (!env.hasDatabase(dbName)) {
			return sendError(res, {
				code: "not_found",
				message: `Database '${dbName}' not found`,
			});
		}

		try {
			const schemas = await env.db(dbName).schema.all();
			res.contentType("application/json").send(
				schemas.map((schema) => ({
					path: schema.path,
					schema: typeof schema.schema === "string" ? schema.schema : schema.text,
					text: schema.text,
				})),
			);
		} catch (err) {
			sendError(res, err as any);
		}
	});
};

export default addRoutes;
