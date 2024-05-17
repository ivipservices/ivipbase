import type { LocalServer, RouteRequest } from "../../";
import { Types } from "ivipbase-core";
export type RequestQuery = null;
export type RequestBody = {
    value: Types.SerializedValue;
    partial: boolean;
    path?: string;
    schema?: Types.SchemaInfo;
};
export type ResponseBody = Types.ISchemaCheckResult | {
    code: "admin_only";
    message: string;
} | {
    code: "unexpected";
    message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoutes: (env: LocalServer) => void;
export default addRoutes;
//# sourceMappingURL=schema-test.d.ts.map