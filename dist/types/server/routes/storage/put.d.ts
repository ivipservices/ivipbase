import type { LocalServer, RouteRequest } from "../../";
export type RequestQuery = {
    format?: "base64" | "base64url" | "text" | "raw" | "data_url";
    contentType?: string;
};
export type RequestBody = {
    format?: "base64" | "base64url" | "text" | "raw" | "data_url";
    contentType?: string;
    data?: string;
    file?: {
        path: string;
    };
};
export type ResponseBody = string;
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: LocalServer) => void;
export default addRoute;
//# sourceMappingURL=put.d.ts.map