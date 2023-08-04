import { RouteInitEnvironment, RouteRequest } from "../../types";
import { User } from "../../Schema/user";
export type RequestQuery = never;
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
    user: User;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=signin.d.ts.map