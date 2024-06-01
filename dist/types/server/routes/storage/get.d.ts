import type { LocalServer, RouteRequest } from "../../";
export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = {
    message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: LocalServer) => void;
export default addRoute;
//# sourceMappingURL=get.d.ts.map