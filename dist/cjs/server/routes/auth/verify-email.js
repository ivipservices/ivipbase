"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = exports.VerifyEmailError = void 0;
const error_1 = require("../../shared/error");
const tokens_1 = require("../../shared/tokens");
class VerifyEmailError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.VerifyEmailError = VerifyEmailError;
const addRoutes = (env) => {
    const LOG_ACTION = "auth.verify_email";
    const verifyEmailAddress = async (dbName, clientIp, code) => {
        const LOG_DETAILS = { ip: clientIp, uid: null };
        const tokenSalt = env.tokenSalt[dbName];
        const verification = (() => {
            try {
                if (!tokenSalt) {
                    throw new VerifyEmailError("invalid_code", "Token salt not set");
                }
                return (0, tokens_1.parseSignedPublicToken)(code, tokenSalt);
            }
            catch (err) {
                throw new VerifyEmailError("invalid_code", err.message);
            }
        })();
        LOG_DETAILS.uid = verification.uid;
        const snap = await env.authRef(dbName).child(verification.uid).get();
        if (!snap.exists()) {
            env.log.error(LOG_ACTION, "unknown_user", LOG_DETAILS);
            throw new VerifyEmailError("unknown_user", "Unknown user");
        }
        const user = snap.val();
        user.uid = snap.key;
        if (!user.email) {
            throw new VerifyEmailError("unknown_user", "Unknown user");
        }
        // No need to do further checks, code was signed by us so we can trust the contents
        // Mark account as verified
        await snap.ref.update({ email_verified: true });
        // env.log.event(LOG_ACTION, LOG_DETAILS);
        return user.email;
    };
    env.router.post(`/auth/:dbName/verify_email`, async (req, res) => {
        var _a;
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const details = req.body;
        try {
            const email = await verifyEmailAddress(dbName, (_a = req.ip) !== null && _a !== void 0 ? _a : "0.0.0.0", details.code);
            res.send({
                email,
            });
        }
        catch (err) {
            if (err.code) {
                (0, error_1.sendBadRequestError)(res, err);
            }
            else {
                env.log.error(LOG_ACTION, "unexpected", { ip: req.ip, message: err.message, verificaion_code: details.code });
                (0, error_1.sendUnexpectedError)(res, err);
            }
        }
    });
    return verifyEmailAddress;
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=verify-email.js.map