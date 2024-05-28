import { Types } from "ivipbase-core";
import type { LocalServer, RouteRequest } from "../../";
import { RuleValidationFailCode } from "../../../database/services/rules";
export declare class SetDataError extends Error {
    code: "invalid_serialized_value";
    constructor(code: "invalid_serialized_value", message: string);
}
export type RequestQuery = null;
export type RequestBody = Types.SerializedValue;
export type ResponseBody = {
    success: true;
} | {
    code: "invalid_serialized_value";
    message: string;
} | {
    code: RuleValidationFailCode;
    message: string;
} | {
    code: "schema_validation_failed";
    message: string;
} | {
    code: string;
    message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoutes: (env: LocalServer) => void;
export default addRoutes;
//# sourceMappingURL=set.d.ts.map