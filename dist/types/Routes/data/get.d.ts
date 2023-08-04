import { Transport } from "acebase-core";
import { RouteInitEnvironment, RouteRequest } from "../../types";
export type RequestQuery = {
    include?: string;
    exclude?: string;
    child_objects?: boolean;
};
export type RequestBody = null;
export type ResponseBody = Transport.SerializedValue & {
    exists: boolean;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=get.d.ts.map