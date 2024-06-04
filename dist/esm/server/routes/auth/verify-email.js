import { sendBadRequestError, sendError, sendUnexpectedError } from "../../shared/error.js";
import { parseSignedPublicToken } from "../../shared/tokens.js";
export class VerifyEmailError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
export const addRoutes = (env) => {
    const LOG_ACTION = "auth.verify_email";
    const verifyEmailAddress = async (dbName, clientIp, code) => {
        const LOG_DETAILS = { ip: clientIp, uid: null };
        const tokenSalt = env.tokenSalt[dbName];
        const verification = (() => {
            try {
                if (!tokenSalt) {
                    throw new VerifyEmailError("invalid_code", "Token salt not set");
                }
                return parseSignedPublicToken(code, tokenSalt);
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
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return sendError(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const details = req.body;
        try {
            const email = await verifyEmailAddress(dbName, req.ip ?? "0.0.0.0", details.code);
            res.send({
                email,
            });
        }
        catch (err) {
            if (err.code) {
                sendBadRequestError(res, err);
            }
            else {
                env.log.error(LOG_ACTION, "unexpected", { ip: req.ip, message: err.message, verificaion_code: details.code });
                sendUnexpectedError(res, err);
            }
        }
    });
    return verifyEmailAddress;
};
export default addRoutes;
//# sourceMappingURL=verify-email.js.map