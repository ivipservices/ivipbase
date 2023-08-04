import adminOnly from "../../Middleware/admin-only";
import { RouteInitEnvironment, RouteRequest } from "../../types";
import { sendError } from "../../lib/Errors";

export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = { path: string; schema: string; text: string }[]; // 200

export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: RouteInitEnvironment) => {
	env.router.get(`/schema/${env.db.name}`, adminOnly(env), async (req: Request, res) => {
		// Get all defined schemas
		try {
			const schemas = await env.db.schema.all();
			res.contentType("application/json").send(
				schemas.map((schema) => ({
					path: schema.path,
					schema: typeof schema.schema === "string" ? schema.schema : schema.text,
					text: schema.text,
				})),
			);
		} catch (err) {
			sendError(res, err);
		}
	});
};

export default addRoute;
