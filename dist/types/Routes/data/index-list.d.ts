import { RouteInitEnvironment, RouteRequest } from "../../types";
export interface PublicDataIndex {
    path: string;
    key: string;
    caseSensitive: boolean;
    textLocale: string;
    includeKeys: string[];
    indexMetadataKeys: string[];
    type: "normal" | "array" | "fulltext" | "geo";
    fileName: string;
    description: string;
}
export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = PublicDataIndex[] | {
    code: string;
    message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=index-list.d.ts.map