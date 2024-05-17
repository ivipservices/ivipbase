import type { LocalServer, RouteRequest } from "../../";
import { iVipBaseUser } from "../../schema/user";
export type RequestQuery = null;
export type RequestBody = {
    client_id?: string;
} & ({
    method: "token";
    access_token: string;
} | {
    method: "email";
    email: string;
    password: string;
} | {
    method: "account";
    username: string;
    password: string;
});
export type ResponseBody = {
    access_token: string;
    user: iVipBaseUser;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoutes: (env: LocalServer) => void;
export default addRoutes;
//# sourceMappingURL=signin.d.ts.map