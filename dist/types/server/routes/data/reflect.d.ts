import type { LocalServer, RouteRequest } from "../../";
import { Types } from "ivipbase-core";
export type RequestQuery = {
    type: "info" | "children";
    child_limit?: number;
    child_skip?: number;
    impersonate?: string;
};
export type RequestBody = null;
export type ResponseBody = Types.ReflectionNodeInfo & Types.ReflectionChildrenInfo & {
    impersonation: {
        uid: string;
        read: {
            allow: boolean;
            error?: {
                code: string;
                message: string;
            };
        };
        write: {
            allow: boolean;
            error?: {
                code: string;
                message: string;
            };
        };
    };
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoutes: (env: LocalServer) => void;
export default addRoutes;
//# sourceMappingURL=reflect.d.ts.map