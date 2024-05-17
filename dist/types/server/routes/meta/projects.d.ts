import { LocalServer, RouteRequest } from "../../";
export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = {
    name: string;
    description: string;
    type: string;
}[];
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: LocalServer) => void;
export default addRoute;
//# sourceMappingURL=projects.d.ts.map