import type { LocalServer, RouteRequest } from "../../";
export type RequestQuery = {
    format?: "json";
    suppress_events?: "0" | "1";
};
export type RequestBody = null;
export type ResponseBody = {
    success: boolean;
    reason?: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoutes: (env: LocalServer) => void;
export default addRoutes;
//# sourceMappingURL=import.d.ts.map