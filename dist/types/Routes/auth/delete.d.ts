import { RouteInitEnvironment, RouteRequest } from "../../types";
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
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=delete.d.ts.map