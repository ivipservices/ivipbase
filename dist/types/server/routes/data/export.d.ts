import type { LocalServer, RouteRequest } from "../../";
export type RequestQuery = {
    format?: "json";
    type_safe?: "0" | "1";
};
export type RequestBody = null;
export type ResponseBody = any;
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoutes: (env: LocalServer) => void;
export default addRoutes;
//# sourceMappingURL=export.d.ts.map