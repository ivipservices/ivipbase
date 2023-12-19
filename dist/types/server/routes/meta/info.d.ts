import { LocalServer, RouteRequest } from "../../";
export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = {
    version: string;
    time: number;
    process: number;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: LocalServer) => void;
export default addRoute;
//# sourceMappingURL=info.d.ts.map