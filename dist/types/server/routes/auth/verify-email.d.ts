import type { LocalServer, RouteRequest } from "../../";
export declare class VerifyEmailError extends Error {
    code: "invalid_code" | "unknown_user";
    constructor(code: "invalid_code" | "unknown_user", message: string);
}
export type RequestQuery = null;
export type RequestBody = {
    code: string;
};
export type ResponseBody = {
    email: string;
} | {
    code: string;
    message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoutes: (env: LocalServer) => (dbName: string, clientIp: string, code: string) => Promise<string>;
export default addRoutes;
//# sourceMappingURL=verify-email.d.ts.map