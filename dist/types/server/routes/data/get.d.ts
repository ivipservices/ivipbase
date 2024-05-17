import type { LocalServer, RouteRequest } from "../../";
import { type Types } from "ivipbase-core";
export type RequestQuery = {
    include?: string;
    exclude?: string;
    child_objects?: "true" | "false";
};
export type RequestBody = null;
export type ResponseBody = Types.SerializedValue & {
    exists: boolean;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoutes: (env: LocalServer) => void;
export default addRoutes;
//# sourceMappingURL=get.d.ts.map