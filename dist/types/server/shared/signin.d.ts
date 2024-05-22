import { DbUserAccountDetails } from "../schema/user";
import { LocalServer, RouteRequest } from "..";
export type SignInCredentials = {
    database: string;
    method: "token";
    access_token: string;
} | {
    database: string;
    method: "internal";
    access_token: string;
} | {
    database: string;
    method: "email";
    email: string;
    password: string;
} | {
    database: string;
    method: "account";
    username: string;
    password: string;
};
export declare class SignInError extends Error {
    code: string;
    details: any;
    constructor(code: string, message: string, details?: any);
}
/**
 * Signs in a user and logs the request. If successful, adds the user to authCache, binds the user to the http request and returns the user details.
 * Throws a `SignInError` if sign in fails for a known reason.
 * @param credentials credentials to sign in the user with
 * @param env environment state
 * @param req current http request
 * @returns
 */
export declare const signIn: (database: string, credentials: SignInCredentials, env: LocalServer, req: RouteRequest) => Promise<DbUserAccountDetails>;
//# sourceMappingURL=signin.d.ts.map