import type { LocalServer, RouteRequest } from "../../";
export type RequestQuery = null;
export type RequestBody = {
    client_id?: string;
} & {
    everywhere: boolean;
};
export type ResponseBody = "Bye!" | {
    code: string;
    message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoutes: (env: LocalServer) => void;
export default addRoutes;
//# sourceMappingURL=signout.d.ts.map