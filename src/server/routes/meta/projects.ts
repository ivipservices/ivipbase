import { LocalServer, RouteRequest } from "../../";

export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = {
	name: string;
	description: string;
	type: string;
}[];
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: LocalServer) => {
	env.router.get(`/projects`, async (req: Request, res) => {
		const dbs = env.dbNames;
		const list: {
			name: string;
			description: string;
			type: string;
		}[] = [];

		for (const db of dbs) {
			const dbInfo = env.db(db);
			list.push({
				name: db,
				description: dbInfo.description ?? "No description",
				type: "database",
			});
		}

		res.send(list);
	});
};

export default addRoute;
