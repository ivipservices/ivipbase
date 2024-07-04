import { sendBadRequestError, sendError, sendUnexpectedError } from "../../shared/error.js";
import { createPasswordHash } from "../../shared/password.js";
import { parseSignedPublicToken } from "../../shared/tokens.js";
export class ResetPasswordError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
export const addRoutes = (env) => {
    const resetPassword = async (dbName, clientIp, code, newPassword) => {
        const tokenSalt = env.tokenSalt[dbName];
        if (!tokenSalt) {
            throw new Error("Token salt not set in server settings");
        }
        const verification = (() => {
            try {
                return parseSignedPublicToken(code, tokenSalt);
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
        const pwd = createPasswordHash(newPassword);
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
            database: dbName,
        };
        env.send_email(dbName, request);
        return user;
    };
    env.router.post(`/auth/:dbName/reset_password`, async (req, res) => {
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return sendError(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const details = req.body;
        const LOG_ACTION = "auth.reset_password";
        const LOG_DETAILS = { ip: req.ip, uid: req.user?.uid ?? null };
        try {
            const user = await resetPassword(dbName, req.ip ?? "0.0.0.0", details.code, details.password);
            // env.log.event(LOG_ACTION, { ...LOG_DETAILS, reset_uid: user.uid });
            res.send("OK");
        }
        catch (err) {
            env.log.error(LOG_ACTION, err.code ?? "unexpected", { ...LOG_DETAILS, message: (err instanceof Error && err.message) ?? err.toString() });
            if (err.code) {
                sendBadRequestError(res, err);
            }
            else {
                sendUnexpectedError(res, err);
            }
        }
    });
    return resetPassword;
};
export default addRoutes;
//# sourceMappingURL=reset-password.js.map