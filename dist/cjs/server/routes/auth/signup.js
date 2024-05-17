"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = exports.SignupError = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const user_1 = require("../../schema/user");
const error_1 = require("../../shared/error");
const password_1 = require("../../shared/password");
const validate_1 = require("../../shared/validate");
const tokens_1 = require("../../shared/tokens");
class SignupError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.SignupError = SignupError;
const addRoutes = (env) => {
    env.router.post(`/auth/:dbName/signup`, async (req, res) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        if (!env.tokenSalt) {
            return (0, error_1.sendError)(res, { code: "token_salt_not_set", message: "Token salt not set" });
        }
        const LOG_ACTION = "auth.signup";
        const LOG_DETAILS = { ip: req.ip, uid: (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : null };
        if (!env.settings.auth.allowUserSignup && ((_c = req.user) === null || _c === void 0 ? void 0 : _c.uid) !== "admin") {
            env.log.error(LOG_ACTION, "user_signup_disabled", LOG_DETAILS);
            return (0, error_1.sendUnauthorizedError)(res, "admin_only", "Only admin is allowed to create users");
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
        else if (details.email && !(0, validate_1.isValidEmail)(details.email)) {
            err = validate_1.invalidEmailError;
        }
        else if (details.email && !(await (0, validate_1.isValidNewEmailAddress)(env.authRef(dbName), details.email))) {
            err = validate_1.emailExistsError;
        }
        else if (details.username && !(0, validate_1.isValidUsername)(details.username)) {
            err = validate_1.invalidUsernameError;
        }
        else if (details.username && !(await (0, validate_1.isValidNewUsername)(env.authRef(dbName), details.username))) {
            err = validate_1.usernameExistsError;
        }
        else if (!(0, validate_1.isValidDisplayName)(details.displayName)) {
            err = validate_1.invalidDisplayNameError;
        }
        else if (!(0, validate_1.isValidPassword)(details.password)) {
            err = validate_1.invalidPasswordError;
        }
        else if (!(0, validate_1.isValidSettings)(details.settings)) {
            err = validate_1.invalidSettingsError;
        }
        else if (details.photoURL && !(0, validate_1.isValidPhotoURL)(details.photoURL)) {
            err = validate_1.invalidPictureError;
        }
        if (err === validate_1.emailExistsError || err === validate_1.usernameExistsError) {
            env.log.error(LOG_ACTION, "conflict", Object.assign(Object.assign({}, LOG_DETAILS), { username: details.username, email: details.email }));
            res.statusCode = 409; // conflict
            return res.send(validate_1.emailOrUsernameExistsError);
        }
        else if (err) {
            // Log failure
            env.log.error(LOG_ACTION, (_d = err.code) !== null && _d !== void 0 ? _d : "unexpected", LOG_DETAILS);
            res.statusCode = 422; // Unprocessable Entity
            return res.send(err);
        }
        try {
            // Ok, create user
            const pwd = (0, password_1.createPasswordHash)(details.password);
            const user = {
                uid: "",
                username: (_e = details.username) !== null && _e !== void 0 ? _e : null,
                email: (_f = details.email) !== null && _f !== void 0 ? _f : null,
                email_verified: false,
                display_name: details.displayName,
                password: pwd.hash,
                password_salt: pwd.salt,
                created: new Date(),
                created_ip: req.ip,
                access_token: ivipbase_core_1.ID.generate(),
                access_token_created: new Date(),
                last_signin: new Date(),
                last_signin_ip: req.ip,
                photoURL: (_g = details.photoURL) !== null && _g !== void 0 ? _g : undefined,
                settings: (_h = details.settings) !== null && _h !== void 0 ? _h : {},
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
                    email: (_j = user.email) !== null && _j !== void 0 ? _j : "",
                    displayName: user.display_name,
                    settings: user.settings,
                },
                date: user.created,
                ip: (_k = user.created_ip) !== null && _k !== void 0 ? _k : req.ip,
                provider: "ivipbase",
                activationCode: (0, tokens_1.createSignedPublicToken)({ uid: user.uid }, env.tokenSalt),
                emailVerified: false,
            };
            env.send_email(dbName, request).catch((err) => {
                env.log.error(LOG_ACTION + ".email", "unexpected", Object.assign(Object.assign({}, LOG_DETAILS), { request }), err);
            });
            // Return the positive news
            const isAdmin = req.user && req.user.uid === "admin";
            res.send({
                access_token: isAdmin ? "" : (0, tokens_1.createPublicAccessToken)(dbName, user.uid, req.ip, (_l = user.access_token) !== null && _l !== void 0 ? _l : "", env.tokenSalt),
                user: (0, user_1.getPublicAccountDetails)(user),
            });
        }
        catch (err) {
            env.log.error(LOG_ACTION, "unexpected", Object.assign(Object.assign({}, LOG_DETAILS), { message: err instanceof Error ? err.message : err.toString(), username: details.username, email: details.email }));
            (0, error_1.sendUnexpectedError)(res, err);
        }
    });
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=signup.js.map