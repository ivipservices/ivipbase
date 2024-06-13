import type { LocalServer, RouteRequest } from "../../";
import { sendError, sendUnauthorizedError } from "../../shared/error";
import fs from "fs";

export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = {
	message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: LocalServer) => {
	env.router.delete(`/storage/:dbName/*`, async (req: Request, res) => {
		const { dbName } = req.params;

		if (!env.hasDatabase(dbName)) {
			return sendError(res, {
				code: "not_found",
				message: `Database '${dbName}' not found`,
			});
		}

		const path = req.params["0"];

		if (!req.user) {
			return sendUnauthorizedError(res, "storage/unauthorized", "Você deve estar logado para acessar este recurso");
		}

		try {
			const storage = env.storageFile(dbName);
			await storage.delete(path);
			res.send({ message: "Storage removed successfully." });
		} catch (err) {
			res.statusCode = 500;
			res.send(err as any);
		}
	});
};

export default addRoute;
