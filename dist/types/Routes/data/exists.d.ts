import { RouteInitEnvironment, RouteRequest } from "../../types";
export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = {
    exists: boolean;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=exists.d.ts.map