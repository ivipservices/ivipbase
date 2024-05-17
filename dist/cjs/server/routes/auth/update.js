"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = exports.UpdateError = void 0;
const user_1 = require("../../schema/user");
const error_1 = require("../../shared/error");
const validate_1 = require("../../shared/validate");
class UpdateError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.UpdateError = UpdateError;
const addRoutes = (env) => {
    env.router.post(`/auth/:dbName/update`, async (req, res) => {
        var _a, _b, _c, _d;
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const details = req.body;
        const LOG_ACTION = "auth.update";
        const LOG_DETAILS = { ip: req.ip, uid: (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : null, update_uid: (_c = details.uid) !== null && _c !== void 0 ? _c : null };
        if (!req.user) {
            env.log.error(LOG_ACTION, "unauthenticated_update", LOG_DETAILS);
            return (0, error_1.sendNotAuthenticatedError)(res, "unauthenticated_update", "Sign in to change details");
        }
        const uid = details.uid || req.user.uid;
        if (req.user.uid !== "admin" && (uid !== req.user.uid || typeof details.is_disabled === "boolean")) {
            env.log.error(LOG_ACTION, "unauthorized_update", LOG_DETAILS);
            return (0, error_1.sendUnauthorizedError)(res, "unauthorized_update", "You are not authorized to perform this update. This attempt has been logged.");
        }
        if (typeof details.display_name === "undefined" && typeof details.displayName === "string") {
            // Allow displayName to be sent also (which is used in signup endpoint)
            details.display_name = details.displayName;
        }
        // Check if sent details are ok
        let err;
        if (details.email && !(0, validate_1.isValidEmail)(details.email)) {
            err = validate_1.invalidEmailError;
        }
        else if (details.email && !(await (0, validate_1.isValidNewEmailAddress)(env.authRef(dbName), details.email))) {
            err = validate_1.emailExistsError;
        }
        else if (details.username && !(0, validate_1.isValidUsername)(details.username)) {
            err = validate_1.invalidUsernameError;
        }
        else if (details.username && !(await (0, validate_1.isValidNewUsername)(env.authRef(dbName), details.username))) {
            err = validate_1.usernameExistsError;
        }
        else if (details.display_name && !(0, validate_1.isValidDisplayName)(details.display_name)) {
            err = validate_1.invalidDisplayNameError;
        }
        else if (details.photoURL && !(0, validate_1.isValidPhotoURL)(details.photoURL)) {
            err = validate_1.invalidPictureError;
        }
        else if (!(0, validate_1.isValidSettings)(details.settings)) {
            err = validate_1.invalidSettingsError;
        }
        if (err) {
            // Log failure
            env.log.error(LOG_ACTION, err.code, LOG_DETAILS);
            res.status(422).send(err); // Unprocessable Entity
            return;
        }
        try {
            let user;
            await env
                .authRef(dbName)
                .child(uid)
                .transaction((snap) => {
                var _a;
                if (!snap.exists()) {
                    throw new UpdateError("user_not_found", `No user found with uid ${uid}`);
                }
                user = snap.val();
                if (details.email && details.email !== user.email) {
                    user.email = details.email;
                    user.email_verified = false; // TODO: send verification email
                }
                if (details.username) {
                    user.username = details.username;
                }
                if (details.display_name) {
                    user.display_name = details.display_name;
                }
                if (details.photoURL) {
                    user.photoURL = details.photoURL;
                }
                if (details.settings) {
                    if (typeof user.settings !== "object") {
                        user.settings = {};
                    }
                    Object.keys((_a = details.settings) !== null && _a !== void 0 ? _a : {}).forEach((key) => {
                        var _a;
                        if (user) {
                            user.settings[key] = ((_a = details.settings) !== null && _a !== void 0 ? _a : {})[key];
                        }
                    });
                    if (!(0, validate_1.isValidSettings)(user.settings)) {
                        err = validate_1.invalidSettingsError;
                        env.log.error(LOG_ACTION, "too_many_settings", LOG_DETAILS);
                        res.statusCode = 422; // Unprocessable Entity
                        res.send(err);
                        return;
                    }
                }
                if (typeof details.is_disabled === "boolean") {
                    user.is_disabled = details.is_disabled;
                }
                return user; // Update db user
            });
            if (!user || !user.uid) {
                throw new UpdateError("user_not_found", `No user found with uid ${uid}`);
            }
            // Update cache
            env.authCache.set(user.uid, user);
            // Send merged results back
            res.send({ user: (0, user_1.getPublicAccountDetails)(user) });
        }
        catch (err) {
            // All known errors except user_not_found will have been sent already
            if (err.code === "user_not_found") {
                env.log.error(LOG_ACTION, err.code, LOG_DETAILS);
                res.statusCode = 404; // Not Found
                res.send(err);
            }
            else {
                // Unexpected
                env.log.error(LOG_ACTION, (_d = err.code) !== null && _d !== void 0 ? _d : "unexpected", LOG_DETAILS, err);
                (0, error_1.sendUnexpectedError)(res, err);
            }
        }
    });
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=update.js.map