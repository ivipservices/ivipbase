import { RouteInitEnvironment, RouteRequest } from "../../types";
import { User, UserProfilePicture } from "../../Schema/user";
export declare class SignupError extends Error {
    code: "admin_only" | "conflict" | "email_conflict" | "username_conflict" | "missing_details" | "invalid_email" | "invalid_username" | "invalid_display_name" | "invalid_password" | "invalid_picture" | "invalid_settings";
    constructor(code: "admin_only" | "conflict" | "email_conflict" | "username_conflict" | "missing_details" | "invalid_email" | "invalid_username" | "invalid_display_name" | "invalid_password" | "invalid_picture" | "invalid_settings", message: string);
}
export type RequestQuery = never;
export type RequestBody = {
    username: string;
    email: string;
    password: string;
    displayName?: string;
    display_name?: string;
    picture?: UserProfilePicture;
    settings: {
        [name: string]: string | number | boolean;
    };
} & // displayName is preferred and documented in the OpenAPI docs // Allow both spellings of display name. display_name is used in the db, displayName in public user detail server responses.
({
    displayName: string;
} | {
    display_name: string;
});
export type ResponseBody = {
    access_token: string;
    user: User;
} | {
    code: SignupError["code"];
    message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;
export declare const addRoute: (env: RouteInitEnvironment) => void;
export default addRoute;
//# sourceMappingURL=signup.d.ts.map