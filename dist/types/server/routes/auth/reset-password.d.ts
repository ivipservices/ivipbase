import type { LocalServer, RouteRequest } from "../../";
import { DbUserAccountDetails } from "../../schema/user";
export declare class ResetPasswordError extends Error {
    code: "invalid_code" | "unknown_user" | "password_requirement_mismatch";
    constructor(code: "invalid_code" | "unknown_user" | "password_requirement_mismatch", message: string);
}
export type RequestQuery = never;
export type RequestBody = {
    code: string;
    password: string;
};
export type ResponseBody = "OK" | {
    code: string;
    message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoutes: (env: LocalServer) => (dbName: string, clientIp: string, code: string, newPassword: string) => Promise<DbUserAccountDetails>;
export default addRoutes;
//# sourceMappingURL=reset-password.d.ts.map