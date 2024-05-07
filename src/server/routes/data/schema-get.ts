import type { LocalServer, RouteRequest } from "../../";
import adminOnly from "../../middleware/admin-only";
import { sendError, sendUnauthorizedError } from "../../shared/error";

export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody =
	| { path: string; schema: string; text: string } // 200
	| "Not Found"; // 410
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoutes = (env: LocalServer) => {
	env.router.get(`/schema/:dbName/*`, adminOnly(env), async (req: Request, res) => {
		const { dbName } = req.params;

		if (!env.hasDatabase(dbName)) {
			return sendError(res, {
				code: "not_found",
				message: `Database '${dbName}' not found`,
			});
		}
		// Get defined schema for a specifc path
		try {
			const path = req.params["0"];
			const schema = await env.db(dbName).schema.get(path);
			if (!schema) {
				return res.status(410).send("Not Found");
			}
			res.contentType("application/json").send({
				path: schema.path,
				schema: typeof schema.schema === "string" ? schema.schema : schema.text,
				text: schema.text,
			});
		} catch (err) {
			sendError(res, err as any);
		}
	});
};

export default addRoutes;
