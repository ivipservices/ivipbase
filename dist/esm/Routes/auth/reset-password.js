"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = exports.ResetPasswordError = void 0;
const Tokens_1 = require("../../lib/Tokens.js");
const Errors_1 = require("../../lib/Errors.js");
const Password_1 = require("../../lib/Password.js");
class ResetPasswordError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.ResetPasswordError = ResetPasswordError;
/**
 * Adds the reset_password route and returns the reset function that can be used to manually reset a password
 * @param env environment
 * @returns returns the reset function
 */
const addRoute = (env) => {
    const resetPassword = async (clientIp, code, newPassword) => {
        const verification = (() => {
            try {
                return (0, Tokens_1.parseSignedPublicToken)(code, env.tokenSalt);
            }
            catch (err) {
                throw new ResetPasswordError("invalid_code", err.message);
            }
        })();
        const snap = await env.authRef.child(verification.uid).get();
        if (!snap.exists()) {
            throw new ResetPasswordError("unknown_user", "Uknown user");
        }
        const user = snap.val();
        user.uid = snap.key;
        if (user.password_reset_code !== verification.code) {
            throw new ResetPasswordError("invalid_code", "Invalid code");
        }
        if (newPassword.length < 8 || newPassword.includes(" ")) {
            throw new ResetPasswordError("password_requirement_mismatch", "Password must be at least 8 characters, and cannot contain spaces");
        }
        // Ok to change password
        const pwd = (0, Password_1.createPasswordHash)(newPassword);
        await snap.ref.update({
            password: pwd.hash,
            password_salt: pwd.salt,
            password_reset_code: null,
        });
        // Send confirmation email
        const request = {
            type: "user_reset_password_success",
            date: new Date(),
            ip: clientIp,
            user: {
                uid: user.uid,
                email: user.email,
                username: user.username,
                displayName: user.display_name,
                settings: user.settings,
            },
        };
        env.config.email?.send(request);
        return user;
    };
    env.router.post(`/auth/${env.db.name}/reset_password`, async (req, res) => {
        const details = req.body;
        const LOG_ACTION = "auth.reset_password";
        const LOG_DETAILS = { ip: req.ip, uid: req.user?.uid ?? null };
        try {
            const user = await resetPassword(req.ip, details.code, details.password);
            env.log.event(LOG_ACTION, { ...LOG_DETAILS, reset_uid: user.uid });
            res.send("OK");
        }
        catch (err) {
            env.log.error(LOG_ACTION, err.code ?? "unexpected", { ...LOG_DETAILS, message: (err instanceof Error && err.message) ?? err.toString() });
            if (err.code) {
                (0, Errors_1.sendBadRequestError)(res, err);
            }
            else {
                (0, Errors_1.sendUnexpectedError)(res, err);
            }
        }
    });
    return resetPassword;
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=reset-password.js.map