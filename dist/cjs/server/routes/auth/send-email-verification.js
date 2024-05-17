"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const error_1 = require("../../shared/error");
const tokens_1 = require("../../shared/tokens");
const validate_1 = require("../../shared/validate");
const addRoutes = (env) => {
    env.router.post(`/auth/:dbName/send_email_verification`, async (req, res) => {
        var _a, _b, _c, _d, _e;
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "auth/system-error",
                message: `Database '${dbName}' not found`,
            });
        }
        if (!env.tokenSalt) {
            return (0, error_1.sendError)(res, { code: "auth/system-error", message: "Token salt not set" });
        }
        const LOG_ACTION = "auth.send_email_verification";
        const LOG_DETAILS = { ip: req.ip, uid: (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : null };
        let user = (_c = req.user) !== null && _c !== void 0 ? _c : null;
        const details = req.body;
        if (!user) {
            if (!details.username || !details.email) {
                return (0, error_1.sendError)(res, { code: "auth/missing-details", message: "No username or email provided" });
            }
            const query = env.authRef(dbName).query();
            if (details.email && (0, validate_1.isValidEmail)(details.email)) {
                query.filter("email", "==", details.email);
            }
            else if (details.username && (0, validate_1.isValidUsername)(details.username)) {
                query.filter("username", "==", details.username);
            }
            else {
                return (0, error_1.sendError)(res, { code: "auth/invalid-email", message: "Invalid email or username" });
            }
            const snaps = await query.get();
            if (snaps.length === 0) {
                return (0, error_1.sendError)(res, { code: "auth/user-not-found", message: "Account not found" });
            }
            else if (snaps.length > 1) {
                return (0, error_1.sendError)(res, { code: "auth/user-duplicate", message: `${snaps.length} users found with the same ${details.email}. Contact your database administrator` });
            }
            const snap = snaps[0];
            user = snap.val();
            if (!user) {
                return (0, error_1.sendError)(res, { code: "auth/user-not-found", message: "Account not found" });
            }
            user.uid = snap.key;
            if (user.is_disabled === true) {
                return (0, error_1.sendError)(res, { code: "auth/user-disabled", message: "Your account has been disabled. Contact your database administrator" });
            }
        }
        try {
            // Send email verification
            const request = {
                type: "user_signup",
                user: {
                    uid: user.uid,
                    username: user.username,
                    email: (_d = user.email) !== null && _d !== void 0 ? _d : "",
                    displayName: user.display_name,
                    settings: user.settings,
                },
                date: user.created,
                ip: (_e = user.created_ip) !== null && _e !== void 0 ? _e : req.ip,
                provider: "ivipbase",
                activationCode: (0, tokens_1.createSignedPublicToken)({ uid: user.uid }, env.tokenSalt),
                emailVerified: false,
            };
            LOG_DETAILS.uid = user.uid;
            env.send_email(dbName, request).catch((err) => {
                env.log.error(LOG_ACTION + ".email", "unexpected", Object.assign(Object.assign({}, LOG_DETAILS), { request }), err);
            });
        }
        catch (err) {
            env.log.error(LOG_ACTION, "unexpected", Object.assign(Object.assign({}, LOG_DETAILS), { message: err instanceof Error ? err.message : err.toString(), username: details.username, email: details.email }));
            (0, error_1.sendUnexpectedError)(res, err);
        }
    });
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=send-email-verification.js.map