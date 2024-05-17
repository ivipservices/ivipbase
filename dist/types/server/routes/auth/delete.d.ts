import type { LocalServer, RouteRequest } from "../../";
export declare class DeleteError extends Error {
    code: "unauthenticated_delete" | "unauthorized_delete";
    constructor(code: "unauthenticated_delete" | "unauthorized_delete", message: string);
}
export type RequestQuery = never;
export type RequestBody = {
    uid: string;
};
export type ResponseBody = "Farewell" | {
    code: DeleteError["code"];
    message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoutes: (env: LocalServer) => void;
export default addRoutes;
//# sourceMappingURL=delete.d.ts.map