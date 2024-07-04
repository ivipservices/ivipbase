"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = exports.ForgotPasswordError = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const error_1 = require("../../shared/error");
const tokens_1 = require("../../shared/tokens");
class ForgotPasswordError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.ForgotPasswordError = ForgotPasswordError;
const addRoutes = (env) => {
    env.router.post(`/auth/:dbName/forgot_password`, async (req, res) => {
        var _a, _b, _c, _d;
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const details = req.body;
        const LOG_ACTION = "auth.forgot_password";
        const LOG_DETAILS = { ip: req.ip, uid: (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : null, email: details.email };
        const tokenSalt = env.tokenSalt[dbName];
        try {
            if (!tokenSalt) {
                throw new ForgotPasswordError("server_email_config", "Token salt not set");
            }
            if (typeof details !== "object" || typeof details.email !== "string" || details.email.length === 0) {
                throw new ForgotPasswordError("invalid_details", "Invalid details");
            }
            const snaps = await env.authRef(dbName).query().filter("email", "==", details.email).get();
            if (snaps.length !== 1) {
                throw new ForgotPasswordError("invalid_email", "Email address not found, or duplicate entries found");
            }
            const snap = snaps[0];
            const user = snap.val();
            user.uid = snap.key;
            user.password_reset_code = ivipbase_core_1.ID.generate();
            if (!user.email) {
                throw new ForgotPasswordError("invalid_email", "Email address not found");
            }
            // Request a password reset email to be sent:
            const request = {
                type: "user_reset_password",
                date: new Date(),
                ip: (_c = req.ip) !== null && _c !== void 0 ? _c : "0.0.0.0",
                resetCode: (0, tokens_1.createSignedPublicToken)({ uid: user.uid, code: user.password_reset_code }, tokenSalt),
                user: {
                    email: user.email,
                    uid: user.uid,
                    username: user.username,
                    settings: user.settings,
                    displayName: user.display_name,
                },
                database: dbName,
            };
            await snap.ref.update({ password_reset_code: user.password_reset_code });
            await env.send_email(dbName, request).catch((err) => {
                env.log.error(LOG_ACTION + ".email", "unexpected", Object.assign(Object.assign({}, LOG_DETAILS), { request }), err);
            });
            // env.log.event(LOG_ACTION, LOG_DETAILS);
            res.send("OK");
        }
        catch (err) {
            env.log.error(LOG_ACTION, err.code || "unexpected", Object.assign(Object.assign({}, LOG_DETAILS), { message: (_d = (err instanceof Error && err.message)) !== null && _d !== void 0 ? _d : err.toString() }));
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
//# sourceMappingURL=forgot-password.js.map