import { sendError, sendUnexpectedError } from "../../shared/error.js";
import { createSignedPublicToken } from "../../shared/tokens.js";
import { isValidEmail, isValidUsername } from "../../shared/validate.js";
export const addRoutes = (env) => {
    env.router.post(`/auth/:dbName/send_email_verification`, async (req, res) => {
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return sendError(res, {
                code: "auth/system-error",
                message: `Database '${dbName}' not found`,
            });
        }
        const tokenSalt = env.tokenSalt[dbName];
        if (!tokenSalt) {
            return sendError(res, { code: "auth/system-error", message: "Token salt not set" });
        }
        const LOG_ACTION = "auth.send_email_verification";
        const LOG_DETAILS = { ip: req.ip ?? "0.0.0.0", uid: req.user?.uid ?? null };
        let user = req.user ?? null;
        const details = req.body;
        if (!user) {
            if (!details.username || !details.email) {
                return sendError(res, { code: "auth/missing-details", message: "No username or email provided" });
            }
            const query = env.authRef(dbName).query();
            if (details.email && isValidEmail(details.email)) {
                query.filter("email", "==", details.email);
            }
            else if (details.username && isValidUsername(details.username)) {
                query.filter("username", "==", details.username);
            }
            else {
                return sendError(res, { code: "auth/invalid-email", message: "Invalid email or username" });
            }
            const snaps = await query.get();
            if (snaps.length === 0) {
                return sendError(res, { code: "auth/user-not-found", message: "Account not found" });
            }
            else if (snaps.length > 1) {
                return sendError(res, { code: "auth/user-duplicate", message: `${snaps.length} users found with the same ${details.email}. Contact your database administrator` });
            }
            const snap = snaps[0];
            user = snap.val();
            if (!user) {
                return sendError(res, { code: "auth/user-not-found", message: "Account not found" });
            }
            user.uid = snap.key;
            if (user.is_disabled === true) {
                return sendError(res, { code: "auth/user-disabled", message: "Your account has been disabled. Contact your database administrator" });
            }
        }
        try {
            // Send email verification
            const request = {
                type: "user_signup",
                user: {
                    uid: user.uid,
                    username: user.username,
                    email: user.email ?? "",
                    displayName: user.display_name,
                    settings: user.settings,
                },
                date: user.created,
                ip: user.created_ip ?? req.ip ?? "0.0.0.0",
                provider: "ivipbase",
                activationCode: createSignedPublicToken({ uid: user.uid }, tokenSalt),
                emailVerified: false,
                database: dbName,
            };
            LOG_DETAILS.uid = user.uid;
            env.send_email(dbName, request).catch((err) => {
                env.log.error(LOG_ACTION + ".email", "unexpected", { ...LOG_DETAILS, request }, err);
            });
        }
        catch (err) {
            env.log.error(LOG_ACTION, "unexpected", { ...LOG_DETAILS, message: err instanceof Error ? err.message : err.toString(), username: details.username, email: details.email });
            sendUnexpectedError(res, err);
        }
    });
};
export default addRoutes;
//# sourceMappingURL=send-email-verification.js.map