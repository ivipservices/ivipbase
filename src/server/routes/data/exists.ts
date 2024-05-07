import type { LocalServer, RouteRequest } from "../../";
import { sendError, sendUnauthorizedError } from "../../shared/error";

export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = { exists: boolean };
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoutes = (env: LocalServer) => {
	env.router.get(`/exists/:dbName/*`, async (req: Request, res) => {
		const { dbName } = req.params;

		if (!env.hasDatabase(dbName)) {
			return sendError(res, {
				code: "not_found",
				message: `Database '${dbName}' not found`,
			});
		}

		const path = req.params["0"];
		const access = await env.rules(dbName).isOperationAllowed(req.user ?? ({} as any), path, "exists", { context: req.context });
		if (!access.allow) {
			return sendUnauthorizedError(res, access.code, access.message);
		}

		try {
			const exists = await env.db(dbName).ref(path).exists();
			res.send({ exists });
		} catch (err) {
			res.statusCode = 500;
			res.send(err as any);
		}
	});
};

export default addRoutes;
