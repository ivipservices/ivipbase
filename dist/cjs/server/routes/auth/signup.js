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
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const tokenSalt = env.tokenSalt[dbName];
        if (!tokenSalt) {
            return (0, error_1.sendError)(res, { code: "token_salt_not_set", message: "Token salt not set" });
        }
        const LOG_ACTION = "auth.signup";
        const LOG_DETAILS = { ip: (_a = req.ip) !== null && _a !== void 0 ? _a : "0.0.0.0", uid: (_c = (_b = req.user) === null || _b === void 0 ? void 0 : _b.uid) !== null && _c !== void 0 ? _c : null };
        if (!env.settings.auth.allowUserSignup && ((_e = (_d = req.user) === null || _d === void 0 ? void 0 : _d.permission_level) !== null && _e !== void 0 ? _e : 0) < 2) {
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
            env.log.error(LOG_ACTION, (_f = err.code) !== null && _f !== void 0 ? _f : "unexpected", LOG_DETAILS);
            res.statusCode = 422; // Unprocessable Entity
            return res.send(err);
        }
        try {
            // Ok, create user
            const pwd = (0, password_1.createPasswordHash)(details.password);
            const user = {
                uid: "",
                username: (_g = details.username) !== null && _g !== void 0 ? _g : null,
                email: (_h = details.email) !== null && _h !== void 0 ? _h : null,
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
                photoURL: (_j = details.photoURL) !== null && _j !== void 0 ? _j : undefined,
                settings: (_k = details.settings) !== null && _k !== void 0 ? _k : {},
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
                    email: (_l = user.email) !== null && _l !== void 0 ? _l : "",
                    displayName: user.display_name,
                    settings: user.settings,
                },
                date: user.created,
                ip: (_o = (_m = user.created_ip) !== null && _m !== void 0 ? _m : req.ip) !== null && _o !== void 0 ? _o : "0.0.0.0",
                provider: "ivipbase",
                activationCode: (0, tokens_1.createSignedPublicToken)({ uid: user.uid }, tokenSalt),
                emailVerified: false,
                database: dbName,
            };
            env.send_email(dbName, request).catch((err) => {
                env.log.error(LOG_ACTION + ".email", "unexpected", Object.assign(Object.assign({}, LOG_DETAILS), { request }), err);
            });
            // Return the positive news
            const isAdmin = req.user && req.user.uid === "admin";
            res.send({
                access_token: isAdmin ? "" : (0, tokens_1.createPublicAccessToken)(dbName, user.uid, (_p = req.ip) !== null && _p !== void 0 ? _p : "0.0.0.0", (_q = user.access_token) !== null && _q !== void 0 ? _q : "", tokenSalt),
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