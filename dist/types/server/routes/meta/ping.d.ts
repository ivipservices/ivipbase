import { LocalServer, RouteRequest } from "../../";
export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = "pong";
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: LocalServer) => void;
export default addRoute;
//# sourceMappingURL=ping.d.ts.map