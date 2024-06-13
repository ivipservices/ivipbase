import type { LocalServer, RouteRequest } from "../../";
export type RequestQuery = {
    maxResults?: string;
    page?: string;
};
export type RequestBody = {
    maxResults?: number;
    page?: number;
};
export type ResponseBody = {
    more?: boolean;
    page?: number;
    items: string[];
    prefixes: string[];
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: LocalServer) => void;
export default addRoute;
//# sourceMappingURL=list.d.ts.map