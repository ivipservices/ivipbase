import type { LocalServer, RouteRequest } from "../../";
export declare class ForgotPasswordError extends Error {
    code: "server_email_config" | "invalid_details" | "invalid_email";
    constructor(code: "server_email_config" | "invalid_details" | "invalid_email", message: string);
}
export type RequestQuery = never;
export type RequestBody = {
    email: string;
};
export type ResponseBody = "OK" | {
    code: string;
    message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoutes: (env: LocalServer) => void;
export default addRoutes;
//# sourceMappingURL=forgot-password.d.ts.map