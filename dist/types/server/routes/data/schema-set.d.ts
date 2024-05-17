import type { LocalServer, RouteRequest } from "../../";
export type RequestQuery = null;
export type RequestBody = {
    action?: "set";
    path: string;
    schema: string | Record<string, any>;
    warnOnly?: boolean;
};
export type ResponseBody = {
    success: true;
} | {
    code: "admin_only";
    message: string;
} | {
    code: "unexpected";
    message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoutes: (env: LocalServer) => void;
export default addRoutes;
//# sourceMappingURL=schema-set.d.ts.map