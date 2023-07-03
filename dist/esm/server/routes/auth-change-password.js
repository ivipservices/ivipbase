"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = exports.ChangePasswordError = void 0;
const error_1 = require("../shared/error.js");
const password_1 = require("../shared/password.js");
const acebase_core_1 = require("acebase-core");
const tokens_1 = require("../shared/tokens.js");
class ChangePasswordError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.ChangePasswordError = ChangePasswordError;
const addRoute = (env) => {
    env.router.post(`/auth/${env.db.name}/change_password`, async (req, res) => {
        const access_token = req.user?.access_token;
        const details = req.body;
        const LOG_ACTION = 'auth.change_password';
        const LOG_DETAILS = { ip: req.ip, uid: details.uid ?? null };
        if (typeof details !== 'object' || typeof details.uid !== 'string' || typeof details.password !== 'string' || typeof details.new_password !== 'string') {
            env.log.error(LOG_ACTION, 'invalid_details', LOG_DETAILS);
            res.status(400).send('Bad Request'); // Bad Request
            return;
        }
        if (details.new_password.length < 8 || details.new_password.includes(' ') || !/[0-9]/.test(details.new_password) || !/[a-z]/.test(details.new_password) || !/[A-Z]/.test(details.new_password)) {
            env.log.error(LOG_ACTION, 'new_password_denied', LOG_DETAILS);
            const err = 'Invalid new password, must be at least 8 characters and contain a combination of numbers and letters (both lower and uppercase)';
            res.status(422).send(err); // Unprocessable Entity
            return;
        }
        try {
            let publicAccessToken;
            await env.authRef.child(details.uid).transaction(snap => {
                if (!snap.exists()) {
                    throw new ChangePasswordError('unknown_uid', `Unknown uid`);
                }
                const user = snap.val();
                user.uid = snap.key;
                const hash = user.password_salt ? (0, password_1.getPasswordHash)(details.password, user.password_salt) : (0, password_1.getOldPasswordHash)(details.password);
                if (user.password !== hash) {
                    throw new ChangePasswordError('wrong_password', `Wrong password`);
                }
                if (access_token && access_token !== user.access_token) {
                    throw new ChangePasswordError('wrong_access_token', `Cannot change password while signed in as other user, or with an old token`);
                }
                const pwd = (0, password_1.createPasswordHash)(details.new_password);
                const updates = {
                    access_token: acebase_core_1.ID.generate(),
                    access_token_created: new Date(),
                    password: pwd.hash,
                    password_salt: pwd.salt,
                };
                // Update user object
                Object.assign(user, updates);
                // Set or update cache
                env.authCache.set(user.uid, user);
                // Create new public access token
                publicAccessToken = (0, tokens_1.createPublicAccessToken)(user.uid, req.ip, user.access_token, env.tokenSalt);
                return user; // Update db
            });
            env.log.event(LOG_ACTION, LOG_DETAILS);
            res.send({ access_token: publicAccessToken }); // Client must use this new access token from now on
        }
        catch (err) {
            env.log.error(LOG_ACTION, err.code, LOG_DETAILS);
            if (err.code) {
                (0, error_1.sendBadRequestError)(res, err);
            }
            else {
                (0, error_1.sendUnexpectedError)(res, err);
            }
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=auth-change-password.js.map