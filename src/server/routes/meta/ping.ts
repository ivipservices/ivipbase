import { LocalServer, RouteRequest } from "../../";

export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = "pong";
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: LocalServer) => {
	env.router.get(`/ping/:dbName`, (req: Request, res) => {
		// For simple connectivity check
		res.send("pong");
	});
};

export default addRoute;
