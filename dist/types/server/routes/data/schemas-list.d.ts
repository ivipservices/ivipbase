import type { LocalServer, RouteRequest } from "../../";
export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = {
    path: string;
    schema: string;
    text: string;
}[];
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoutes: (env: LocalServer) => void;
export default addRoutes;
//# sourceMappingURL=schemas-list.d.ts.map