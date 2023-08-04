import adminOnly from "../../Middleware/admin-only";
import { RouteInitEnvironment, RouteRequest } from "../../types";
import { sendError } from "../../lib/Errors";

export interface PublicDataIndex {
	path: string;
	key: string;
	caseSensitive: boolean;
	textLocale: string;
	includeKeys: string[];
	indexMetadataKeys: string[];
	type: "normal" | "array" | "fulltext" | "geo";
	fileName: string;
	description: string;
}
export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = PublicDataIndex[] | { code: string; message: string };
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: RouteInitEnvironment) => {
	env.router.get(`/index/${env.db.name}`, adminOnly(env), async (req: Request, res) => {
		// Get all indexes
		try {
			const indexes = await env.db.indexes.get();
			res.contentType("application/json").send(
				(indexes as any[]).map((index) => {
					const { path, key, caseSensitive, textLocale, includeKeys, indexMetadataKeys, type, fileName, description } = index;
					return { path, key, caseSensitive, textLocale, includeKeys, indexMetadataKeys, type, fileName, description };
				}),
			);
		} catch (err) {
			sendError(res, err);
		}
	});
};

export default addRoute;
