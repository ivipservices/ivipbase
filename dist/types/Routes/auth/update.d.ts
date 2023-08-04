import { RouteInitEnvironment, RouteRequest } from "../../types";
import { User, UserProfilePicture } from "../../Schema/user";
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
    picture?: UserProfilePicture;
    settings?: {
        [name: string]: string | number | boolean;
    };
} & // displayName is preferred and documented in the OpenAPI docs // Allow both spellings of display name. display_name is used in the db, displayName in public user detail server responses.
({
    displayName: string;
} | {
    display_name: string;
});
export type ResponseBody = {
    user: User;
} | {
    code: UpdateError["code"];
    message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
//# sourceMappingURL=update.d.ts.map