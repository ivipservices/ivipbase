import { Transport, Types } from "ivipbase-core";
import type { LocalServer, RouteRequest } from "../../";
import { sendError, sendUnauthorizedError } from "../../shared/error";

export type RequestQuery = null;
export type RequestBody = {
	map: any;
	val: {
		query: {
			/** result filters */
			filters: Array<{ key: string; op: string; compare: any }>;
			/** number of results to skip, useful for paging */
			skip: number;
			/** max number of results to return */
			take: number;
			/** sort order */
			order: Array<{ key: string; ascending: boolean }>;
		};
		/** client's query id for realtime event notifications through the websocket */
		query_id?: string;
		/** client's socket id for realtime event notifications through websocket */
		client_id?: string;
		options: {
			snapshots?: boolean;
			monitor?: boolean | { add: boolean; change: boolean; remove: boolean };
			include?: string[];
			exclude?: string[];
			child_objects?: boolean;
		};
	};
};
export type ResponseBody = {
	val: {
		count: number;
		list: any[];
	};
	map?: any;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoutes = (env: LocalServer) => {
	env.router.post(`/query/:dbName/*`, async (req: Request, res) => {
		const { dbName } = req.params;

		if (!env.hasDatabase(dbName)) {
			return sendError(res, {
				code: "not_found",
				message: `Database '${dbName}' not found`,
			});
		}

		try {
			const path = req.params["0"];
			const access = await env.rules(dbName).isOperationAllowed(req.user ?? ({} as any), path, "exists", { context: req.context });
			if (!access.allow) {
				return sendUnauthorizedError(res, access.code, access.message);
			}

			const data = Transport.deserialize(req.body);
			if (typeof data !== "object" || typeof data.query !== "object" || typeof data.options !== "object") {
				return sendError(res, { code: "invalid_request", message: "Invalid query request" });
			}
			const query = data.query;
			const options = data.options as Types.QueryOptions;

			if (options.monitor === true) {
				options.monitor = { add: true, change: true, remove: true };
			}

			const { results, context, isMore } = (await env.db(dbName).storage.query(path, query, options)) as any;

			if (!env.settings.transactions?.log && context && context.database_cursor) {
				delete context.database_cursor;
			}
			const response = {
				count: results.length,
				list: results, // []
				isMore,
			};
			res.setHeader("DataBase-Context", JSON.stringify(context));
			res.send(Transport.serialize(response));
		} catch (err) {
			sendError(res, { code: "unknown", message: (err as any)?.message ?? String(err) });
		}
	});
};

export default addRoutes;
