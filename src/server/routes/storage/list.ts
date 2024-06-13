import type { LocalServer, RouteRequest } from "../../";
import { sendError, sendUnauthorizedError } from "../../shared/error";

export type RequestQuery = {
	maxResults?: string;
	page?: string;
};
export type RequestBody = {
	maxResults?: number;
	page?: number;
};
export type ResponseBody = {
	more?: boolean;
	page?: number;
	items: string[];
	prefixes: string[];
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: LocalServer) => {
	env.router.get(`/storage-list/:dbName/*`, async (req: Request, res) => {
		const { dbName } = req.params;

		if (!env.hasDatabase(dbName)) {
			return sendError(res, {
				code: "not_found",
				message: `Database '${dbName}' not found`,
			});
		}

		const path = req.params["0"];

		const maxResults = req.query.maxResults ? parseInt(req.query.maxResults) : typeof req.body.maxResults === "number" ? req.body.maxResults : undefined;
		const page = req.query.page ? parseInt(req.query.page) : typeof req.body.page === "number" ? req.body.page : 0;

		const isAll = typeof maxResults === "undefined" || isNaN(maxResults ?? NaN);

		try {
			if (isAll) {
				const { items, prefixes } = await env.storageFile(dbName).listAll(path);

				res.send({ items: items.map(({ fullPath }) => fullPath), prefixes: prefixes.map(({ fullPath }) => fullPath) });
			} else {
				const { items, prefixes, ...props } = await env.storageFile(dbName).list(path, { maxResults, page });

				res.send({ ...props, items: items.map(({ fullPath }) => fullPath), prefixes: prefixes.map(({ fullPath }) => fullPath) });
			}
		} catch (err) {
			res.statusCode = 500;
			res.send(err as any);
		}
	});
};

export default addRoute;
