"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = exports.ResetPasswordError = void 0;
const error_1 = require("../../shared/error");
const password_1 = require("../../shared/password");
const tokens_1 = require("../../shared/tokens");
class ResetPasswordError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.ResetPasswordError = ResetPasswordError;
const addRoutes = (env) => {
    const resetPassword = async (dbName, clientIp, code, newPassword) => {
        if (!env.tokenSalt) {
            throw new Error("Token salt not set in server settings");
        }
        const verification = (() => {
            try {
                return (0, tokens_1.parseSignedPublicToken)(code, env.tokenSalt);
            }
            catch (err) {
                throw new ResetPasswordError("invalid_code", err.message);
            }
        })();
        const snap = await env.authRef(dbName).child(verification.uid).get();
        if (!snap.exists()) {
            throw new ResetPasswordError("unknown_user", "Uknown user");
        }
        const user = snap.val();
        user.uid = snap.key;
        if (!user.email) {
            throw new ResetPasswordError("unknown_user", "Uknown user");
        }
        if (user.password_reset_code !== verification.code) {
            throw new ResetPasswordError("invalid_code", "Invalid code");
        }
        if (newPassword.length < 8 || newPassword.includes(" ")) {
            throw new ResetPasswordError("password_requirement_mismatch", "Password must be at least 8 characters, and cannot contain spaces");
        }
        // Ok to change password
        const pwd = (0, password_1.createPasswordHash)(newPassword);
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
        env.send_email(dbName, request);
        return user;
    };
    env.router.post(`/auth/:dbName/reset_password`, async (req, res) => {
        var _a, _b, _c, _d;
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const details = req.body;
        const LOG_ACTION = "auth.reset_password";
        const LOG_DETAILS = { ip: req.ip, uid: (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : null };
        try {
            const user = await resetPassword(dbName, req.ip, details.code, details.password);
            // env.log.event(LOG_ACTION, { ...LOG_DETAILS, reset_uid: user.uid });
            res.send("OK");
        }
        catch (err) {
            env.log.error(LOG_ACTION, (_c = err.code) !== null && _c !== void 0 ? _c : "unexpected", Object.assign(Object.assign({}, LOG_DETAILS), { message: (_d = (err instanceof Error && err.message)) !== null && _d !== void 0 ? _d : err.toString() }));
            if (err.code) {
                (0, error_1.sendBadRequestError)(res, err);
            }
            else {
                (0, error_1.sendUnexpectedError)(res, err);
            }
        }
    });
    return resetPassword;
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=reset-password.js.map