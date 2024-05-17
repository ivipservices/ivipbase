import type { LocalServer, RouteRequest } from "../../";
export declare class ChangePasswordError extends Error {
    code: "unknown_uid" | "wrong_password" | "wrong_access_token";
    constructor(code: "unknown_uid" | "wrong_password" | "wrong_access_token", message: string);
}
export type RequestQuery = never;
export type RequestBody = {
    uid: string;
    password: string;
    new_password: string;
};
export type ResponseBody = {
    access_token: string;
} | {
    code: string;
    message: string;
} | string;
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoutes: (env: LocalServer) => void;
export default addRoutes;
//# sourceMappingURL=change-password.d.ts.map