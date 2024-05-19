"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = exports.ChangePasswordError = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const error_1 = require("../../shared/error");
const password_1 = require("../../shared/password");
const tokens_1 = require("../../shared/tokens");
class ChangePasswordError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.ChangePasswordError = ChangePasswordError;
const addRoutes = (env) => {
    env.router.post(`/auth/:dbName/change_password`, async (req, res) => {
        var _a, _b;
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const access_token = (_a = req.user) === null || _a === void 0 ? void 0 : _a.access_token;
        const details = req.body;
        const LOG_ACTION = "auth.change_password";
        const LOG_DETAILS = { ip: req.ip, uid: (_b = details.uid) !== null && _b !== void 0 ? _b : null };
        if (typeof details !== "object" || typeof details.uid !== "string" || typeof details.password !== "string" || typeof details.new_password !== "string") {
            env.log.error(LOG_ACTION, "invalid_details", LOG_DETAILS);
            res.status(400).send("Bad Request"); // Bad Request
            return;
        }
        if (details.new_password.length < 8 ||
            details.new_password.includes(" ") ||
            !/[0-9]/.test(details.new_password) ||
            !/[a-z]/.test(details.new_password) ||
            !/[A-Z]/.test(details.new_password)) {
            env.log.error(LOG_ACTION, "new_password_denied", LOG_DETAILS);
            const err = "Invalid new password, must be at least 8 characters and contain a combination of numbers and letters (both lower and uppercase)";
            res.status(422).send(err); // Unprocessable Entity
            return;
        }
        try {
            let publicAccessToken;
            await env
                .authRef(dbName)
                .child(details.uid)
                .transaction((snap) => {
                if (!env.tokenSalt) {
                    throw new Error("Token salt not set yet, try again later");
                }
                if (!snap.exists()) {
                    throw new ChangePasswordError("unknown_uid", `Unknown uid`);
                }
                const user = snap.val();
                user.uid = snap.key;
                const hash = user.password_salt ? (0, password_1.getPasswordHash)(details.password, user.password_salt) : (0, password_1.getOldPasswordHash)(details.password);
                if (!user.access_token) {
                    throw new ChangePasswordError("unknown_uid", `Unknown uid`);
                }
                if (user.password !== hash) {
                    throw new ChangePasswordError("wrong_password", `Wrong password`);
                }
                if (access_token && access_token !== user.access_token) {
                    throw new ChangePasswordError("wrong_access_token", `Cannot change password while signed in as other user, or with an old token`);
                }
                const pwd = (0, password_1.createPasswordHash)(details.new_password);
                const updates = {
                    access_token: ivipbase_core_1.ID.generate(),
                    access_token_created: new Date(),
                    password: pwd.hash,
                    password_salt: pwd.salt,
                };
                // Update user object
                Object.assign(user, updates);
                // Set or update cache
                env.authCache.set(user.uid, user);
                // Create new public access token
                publicAccessToken = (0, tokens_1.createPublicAccessToken)(dbName, user.uid, req.ip, user.access_token, env.tokenSalt);
                return user; // Update db
            });
            if (!publicAccessToken) {
                throw new Error("Failed to create public access token");
            }
            // env.log.event(LOG_ACTION, LOG_DETAILS);
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
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=change-password.js.map