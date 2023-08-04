import { RouteInitEnvironment, RouteRequest } from "../../types";

export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = "pong";
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: RouteInitEnvironment) => {
	env.router.get(`/ping/${env.db.name}`, (req: Request, res) => {
		// For simple connectivity check
		res.send("pong");
	});
};

export default addRoute;
