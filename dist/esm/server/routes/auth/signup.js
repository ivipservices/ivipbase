import { ID } from "ivipbase-core";
import { getPublicAccountDetails } from "../../schema/user.js";
import { sendError, sendUnauthorizedError, sendUnexpectedError } from "../../shared/error.js";
import { createPasswordHash } from "../../shared/password.js";
import { emailExistsError, emailOrUsernameExistsError, invalidDisplayNameError, invalidEmailError, invalidPasswordError, invalidPictureError, invalidSettingsError, invalidUsernameError, isValidDisplayName, isValidEmail, isValidNewEmailAddress, isValidNewUsername, isValidPassword, isValidPhotoURL, isValidSettings, isValidUsername, usernameExistsError, } from "../../shared/validate.js";
import { createPublicAccessToken, createSignedPublicToken } from "../../shared/tokens.js";
export class SignupError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
export const addRoutes = (env) => {
    env.router.post(`/auth/:dbName/signup`, async (req, res) => {
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return sendError(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const tokenSalt = env.tokenSalt[dbName];
        if (!tokenSalt) {
            return sendError(res, { code: "token_salt_not_set", message: "Token salt not set" });
        }
        const LOG_ACTION = "auth.signup";
        const LOG_DETAILS = { ip: req.ip ?? "0.0.0.0", uid: req.user?.uid ?? null };
        if (!env.settings.auth.allowUserSignup && (req.user?.permission_level ?? 0) < 2) {
            env.log.error(LOG_ACTION, "user_signup_disabled", LOG_DETAILS);
            return sendUnauthorizedError(res, "admin_only", "Only admin is allowed to create users");
        }
        // Create user if it doesn't exist yet.
        // TODO: Rate-limit nr of signups per IP to prevent abuse
        const details = req.body;
        if (typeof details.display_name === "string" && typeof details.displayName !== "string") {
            // Allow display_name to be sent also (which is used in update endpoint)
            details.displayName = details.display_name;
        }
        // Check if sent details are ok
        let err;
        if (!details.username && !details.email) {
            err = { code: "missing_details", message: "No username or email provided" };
        }
        else if (details.email && !isValidEmail(details.email)) {
            err = invalidEmailError;
        }
        else if (details.email && !(await isValidNewEmailAddress(env.authRef(dbName), details.email))) {
            err = emailExistsError;
        }
        else if (details.username && !isValidUsername(details.username)) {
            err = invalidUsernameError;
        }
        else if (details.username && !(await isValidNewUsername(env.authRef(dbName), details.username))) {
            err = usernameExistsError;
        }
        else if (!isValidDisplayName(details.displayName)) {
            err = invalidDisplayNameError;
        }
        else if (!isValidPassword(details.password)) {
            err = invalidPasswordError;
        }
        else if (!isValidSettings(details.settings)) {
            err = invalidSettingsError;
        }
        else if (details.photoURL && !isValidPhotoURL(details.photoURL)) {
            err = invalidPictureError;
        }
        if (err === emailExistsError || err === usernameExistsError) {
            env.log.error(LOG_ACTION, "conflict", { ...LOG_DETAILS, username: details.username, email: details.email });
            res.statusCode = 409; // conflict
            return res.send(emailOrUsernameExistsError);
        }
        else if (err) {
            // Log failure
            env.log.error(LOG_ACTION, err.code ?? "unexpected", LOG_DETAILS);
            res.statusCode = 422; // Unprocessable Entity
            return res.send(err);
        }
        try {
            // Ok, create user
            const pwd = createPasswordHash(details.password);
            const user = {
                uid: "",
                username: details.username ?? null,
                email: details.email ?? null,
                email_verified: false,
                display_name: details.displayName,
                password: pwd.hash,
                password_salt: pwd.salt,
                created: new Date(),
                created_ip: req.ip,
                access_token: ID.generate(),
                access_token_created: new Date(),
                last_signin: new Date(),
                last_signin_ip: req.ip,
                photoURL: details.photoURL ?? undefined,
                settings: details.settings ?? {},
                permission_level: 0,
            };
            const userRef = await env.authRef(dbName).push(user);
            user.uid = userRef.key;
            LOG_DETAILS.uid = user.uid;
            // Log success
            // env.log.event(LOG_ACTION, LOG_DETAILS);
            // Cache the user
            env.authCache.set(user.uid, user);
            // Request welcome e-mail to be sent
            const request = {
                type: "user_signup",
                user: {
                    uid: user.uid,
                    username: user.username,
                    email: user.email ?? "",
                    displayName: user.display_name,
                    settings: user.settings,
                },
                date: user.created,
                ip: user.created_ip ?? req.ip ?? "0.0.0.0",
                provider: "ivipbase",
                activationCode: createSignedPublicToken({ uid: user.uid }, tokenSalt),
                emailVerified: false,
                database: dbName,
            };
            env.send_email(dbName, request).catch((err) => {
                env.log.error(LOG_ACTION + ".email", "unexpected", { ...LOG_DETAILS, request }, err);
            });
            // Return the positive news
            const isAdmin = req.user && req.user.uid === "admin";
            res.send({
                access_token: isAdmin ? "" : createPublicAccessToken(dbName, user.uid, req.ip ?? "0.0.0.0", user.access_token ?? "", tokenSalt),
                user: getPublicAccountDetails(user),
            });
        }
        catch (err) {
            env.log.error(LOG_ACTION, "unexpected", { ...LOG_DETAILS, message: err instanceof Error ? err.message : err.toString(), username: details.username, email: details.email });
            sendUnexpectedError(res, err);
        }
    });
};
export default addRoutes;
//# sourceMappingURL=signup.js.map