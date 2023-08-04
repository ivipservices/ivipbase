import { RouteInitEnvironment, RouteRequest } from "../../types";
export type RequestQuery = null;
export type RequestBody = {
    fileName: string;
};
export type ResponseBody = {
    success: true;
} | {
    code: "admin_only";
    message: string;
} | {
    code: "unexpected";
    message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=index-delete.d.ts.map