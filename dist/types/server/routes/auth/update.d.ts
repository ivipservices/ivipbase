import type { LocalServer, RouteRequest } from "../../";
import { iVipBaseUser } from "../../schema/user";
export declare class UpdateError extends Error {
    code: "unauthenticated_update" | "unauthorized_update" | "user_not_found" | "invalid_email" | "email_conflict" | "invalid_username" | "username_conflict" | "invalid_display_name" | "invalid_picture" | "invalid_settings";
    constructor(code: "unauthenticated_update" | "unauthorized_update" | "user_not_found" | "invalid_email" | "email_conflict" | "invalid_username" | "username_conflict" | "invalid_display_name" | "invalid_picture" | "invalid_settings", message: string);
}
export type RequestQuery = never;
export type RequestBody = {
    /** admin only: specifies user account to update */
    uid: string;
    /** Admin only: whether to enable or disable the account */
    is_disabled?: boolean;
    email?: string;
    username?: string;
    displayName?: string;
    display_name?: string;
    photoURL?: string;
    settings?: {
        [name: string]: string | number | boolean;
    };
} & ({
    displayName: string;
} | {
    display_name: string;
});
export type ResponseBody = {
    user: iVipBaseUser;
} | {
    code: UpdateError["code"];
    message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoutes: (env: LocalServer) => void;
export default addRoutes;
//# sourceMappingURL=update.d.ts.map