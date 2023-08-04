import { RouteInitEnvironment, RouteRequest } from "../../types";
export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = {
    path: string;
    schema: string;
    text: string;
}[];
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=schemas-list.d.ts.map