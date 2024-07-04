import { ID } from "ivipbase-core";
import { sendBadRequestError, sendError, sendUnexpectedError } from "../../shared/error.js";
import { createSignedPublicToken } from "../../shared/tokens.js";
export class ForgotPasswordError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
export const addRoutes = (env) => {
    env.router.post(`/auth/:dbName/forgot_password`, async (req, res) => {
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return sendError(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const details = req.body;
        const LOG_ACTION = "auth.forgot_password";
        const LOG_DETAILS = { ip: req.ip, uid: req.user?.uid ?? null, email: details.email };
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
            user.password_reset_code = ID.generate();
            if (!user.email) {
                throw new ForgotPasswordError("invalid_email", "Email address not found");
            }
            // Request a password reset email to be sent:
            const request = {
                type: "user_reset_password",
                date: new Date(),
                ip: req.ip ?? "0.0.0.0",
                resetCode: createSignedPublicToken({ uid: user.uid, code: user.password_reset_code }, tokenSalt),
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
                env.log.error(LOG_ACTION + ".email", "unexpected", { ...LOG_DETAILS, request }, err);
            });
            // env.log.event(LOG_ACTION, LOG_DETAILS);
            res.send("OK");
        }
        catch (err) {
            env.log.error(LOG_ACTION, err.code || "unexpected", { ...LOG_DETAILS, message: (err instanceof Error && err.message) ?? err.toString() });
            if (err.code) {
                sendBadRequestError(res, err);
            }
            else {
                sendUnexpectedError(res, err);
            }
        }
    });
};
export default addRoutes;
//# sourceMappingURL=forgot-password.js.map