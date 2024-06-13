import type { LocalServer, RouteRequest } from "../../";
import { sendError } from "../../shared/error";

export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = {
	path: string;
	isFile: boolean;
	url: string | null;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: LocalServer) => {
	env.router.get(`/storage-url/:dbName/*`, async (req: Request, res) => {
		const { dbName } = req.params;

		if (!env.hasDatabase(dbName)) {
			return sendError(res, {
				code: "not_found",
				message: `Database '${dbName}' not found`,
			});
		}

		const path = req.params["0"];

		try {
			const url = await env.storageFile(dbName).getDownloadURL(path);
			res.send({ path: `storage/${dbName}/${path}`, isFile: typeof url === "string", url });
		} catch (err) {
			res.statusCode = 500;
			res.send(err as any);
		}
	});
};

export default addRoute;
