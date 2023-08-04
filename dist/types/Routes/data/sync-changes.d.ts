import { ValueChange } from "acebase-core";
import { RouteInitEnvironment, RouteRequest } from "../../types";
export type RequestQuery = {
    path?: string;
    for?: string;
    cursor?: string;
    timestamp?: string;
};
export type RequestBody = null;
export type ResponseBody = ValueChange[] | {
    code: "no_transaction_logging";
    message: string;
} | {
    code: "invalid_request";
    message: string;
} | {
    code: "not_authorized";
    message: string;
} | {
    code: "unexpected";
    message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=sync-changes.d.ts.map