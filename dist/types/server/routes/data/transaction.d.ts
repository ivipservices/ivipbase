import { Types } from "ivipbase-core";
import type { LocalServer, RouteRequest } from "../../";
export declare const TRANSACTION_TIMEOUT_MS = 10000;
export declare class DataTransactionError extends Error {
    code: "invalid_serialized_value";
    constructor(code: "invalid_serialized_value", message: string);
}
export type ApiTransactionDetails = {
    id: string;
    value: Types.SerializedValue;
};
export type StartRequestQuery = null;
export type StartRequestBody = {
    path: string;
};
export type StartResponseBody = ApiTransactionDetails | {
    code: string;
    message: string;
} | {
    code: "unexpected";
    message: string;
};
export type StartRequest = RouteRequest<StartRequestQuery, StartRequestBody, StartResponseBody>;
export type FinishRequestQuery = null;
export type FinishRequestBody = ApiTransactionDetails & {
    path: string;
};
export type FinishResponseBody = "done" | {
    code: string;
    message: string;
} | "transaction not found" | string;
export type FinishRequest = RouteRequest<FinishRequestQuery, FinishRequestBody, FinishResponseBody>;
export declare const addRoutes: (env: LocalServer) => void;
export default addRoutes;
//# sourceMappingURL=transaction.d.ts.map