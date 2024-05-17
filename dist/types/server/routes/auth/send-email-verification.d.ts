import type { LocalServer, RouteRequest } from "../../";
export type RequestQuery = null;
export type RequestBody = {
    username?: string;
    email?: string;
};
export type ResponseBody = "Ok" | {
    code: string;
    message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoutes: (env: LocalServer) => void;
export default addRoutes;
//# sourceMappingURL=send-email-verification.d.ts.map