import type { LocalServer, RouteRequest } from "../../";
import { iVipBaseUser } from "../../schema/user";
export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = {
    signed_in: false;
} | {
    signed_in: true;
    user: iVipBaseUser;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoutes: (env: LocalServer) => void;
export default addRoutes;
//# sourceMappingURL=state.d.ts.map