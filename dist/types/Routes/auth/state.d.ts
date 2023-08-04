import { RouteInitEnvironment, RouteRequest } from "../../types";
import { User } from "../../Schema/user";
export type RequestQuery = never;
export type RequestBody = never;
export type ResponseBody = {
    signed_in: false;
} | {
    signed_in: true;
    user: User;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=state.d.ts.map