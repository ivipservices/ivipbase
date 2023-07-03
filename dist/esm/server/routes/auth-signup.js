"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = exports.SignupError = void 0;
const user_1 = require("../schema/user.js");
const validate_1 = require("../shared/validate.js");
const password_1 = require("../shared/password.js");
const acebase_core_1 = require("acebase-core");
const tokens_1 = require("../shared/tokens.js");
const error_1 = require("../shared/error.js");
class SignupError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.SignupError = SignupError;
const addRoute = (env) => {
    env.router.post(`/auth/${env.db.name}/signup`, async (req, res) => {
        const LOG_ACTION = 'auth.signup';
        const LOG_DETAILS = { ip: req.ip, uid: req.user?.uid ?? null };
        if (!env.config.auth.allowUserSignup && req.user?.uid !== 'admin') {
            env.log.error(LOG_ACTION, 'user_signup_disabled', LOG_DETAILS);
            return (0, error_1.sendUnauthorizedError)(res, 'admin_only', 'Only admin is allowed to create users');
        }
        // Create user if it doesn't exist yet.
        // TODO: Rate-limit nr of signups per IP to prevent abuse
        const details = req.body;
        if (typeof details.display_name === 'string' && typeof details.displayName !== 'string') {
            // Allow display_name to be sent also (which is used in update endpoint)
            details.displayName = details.display_name;
        }
        // Check if sent details are ok
        let err;
        if (!details.username && !details.email) {
            err = { code: 'missing_details', message: 'No username or email provided' };
        }
        else if (details.email && !(0, validate_1.isValidEmail)(details.email)) {
            err = validate_1.invalidEmailError;
        }
        else if (details.email && !await (0, validate_1.isValidNewEmailAddress)(env.authRef, details.email)) {
            err = validate_1.emailExistsError;
        }
        else if (details.username && !(0, validate_1.isValidUsername)(details.username)) {
            err = validate_1.invalidUsernameError;
        }
        else if (details.username && !await (0, validate_1.isValidNewUsername)(env.authRef, details.username)) {
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
        else if (details.picture && !(0, validate_1.isValidPicture)(details.picture)) {
            err = validate_1.invalidPictureError;
        }
        if (err === validate_1.emailExistsError || err === validate_1.usernameExistsError) {
            env.log.error(LOG_ACTION, 'conflict', { ...LOG_DETAILS, username: details.username, email: details.email });
            res.statusCode = 409; // conflict
            return res.send(validate_1.emailOrUsernameExistsError);
        }
        else if (err) {
            // Log failure
            env.log.error(LOG_ACTION, err.code ?? 'unexpected', LOG_DETAILS);
            res.statusCode = 422; // Unprocessable Entity
            return res.send(err);
        }
        try {
            // Ok, create user
            const pwd = (0, password_1.createPasswordHash)(details.password);
            const user = {
                uid: null,
                username: details.username ?? null,
                email: details.email ?? null,
                email_verified: false,
                display_name: details.displayName,
                password: pwd.hash,
                password_salt: pwd.salt,
                created: new Date(),
                created_ip: req.ip,
                access_token: acebase_core_1.ID.generate(),
                access_token_created: new Date(),
                last_signin: new Date(),
                last_signin_ip: req.ip,
                picture: details.picture ?? null,
                settings: details.settings ?? {},
            };
            const userRef = await env.authRef.push(user);
            user.uid = userRef.key;
            LOG_DETAILS.uid = user.uid;
            // Log success
            env.log.event(LOG_ACTION, LOG_DETAILS);
            // Cache the user
            env.authCache.set(user.uid, user);
            // Request welcome e-mail to be sent
            const request = {
                type: 'user_signup',
                user: {
                    uid: user.uid,
                    username: user.username,
                    email: user.email,
                    displayName: user.display_name,
                    settings: user.settings,
                },
                date: user.created,
                ip: user.created_ip,
                provider: 'acebase',
                activationCode: (0, tokens_1.createSignedPublicToken)({ uid: user.uid }, env.tokenSalt),
                emailVerified: false,
            };
            env.config.email?.send(request).catch(err => {
                env.log.error(LOG_ACTION + '.email', 'unexpected', { ...LOG_DETAILS, request }, err);
            });
            // Return the positive news
            const isAdmin = req.user && req.user.uid === 'admin';
            res.send({
                access_token: isAdmin ? '' : (0, tokens_1.createPublicAccessToken)(user.uid, req.ip, user.access_token, env.tokenSalt),
                user: (0, user_1.getPublicAccountDetails)(user),
            });
        }
        catch (err) {
            env.log.error(LOG_ACTION, 'unexpected', { ...LOG_DETAILS, message: err instanceof Error ? err.message : err.toString(), username: details.username, email: details.email });
            (0, error_1.sendUnexpectedError)(res, err);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=auth-signup.js.map