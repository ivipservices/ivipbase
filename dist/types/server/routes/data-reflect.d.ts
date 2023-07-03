import { IReflectionChildrenInfo, IReflectionNodeInfo } from 'acebase-core';
import { RouteInitEnvironment, RouteRequest } from '../shared/env';
export type RequestQuery = {
    [key: string]: any;
    type: 'info' | 'children';
    impersonate?: string;
};
export type RequestBody = null;
type Impersonated = {
    [key: string]: any;
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
export type ResponseBody = IReflectionNodeInfo & IReflectionChildrenInfo & {
    [key: string]: any;
    impersonation: Impersonated;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=data-reflect.d.ts.map