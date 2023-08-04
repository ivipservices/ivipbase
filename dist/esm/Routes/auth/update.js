"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = exports.UpdateError = void 0;
const user_1 = require("../../Schema/user.js");
const Validate_1 = require("../../lib/Validate.js");
const Errors_1 = require("../../lib/Errors.js");
class UpdateError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.UpdateError = UpdateError;
const addRoute = (env) => {
    env.router.post(`/auth/${env.db.name}/update`, async (req, res) => {
        const details = req.body;
        const LOG_ACTION = "auth.update";
        const LOG_DETAILS = { ip: req.ip, uid: req.user?.uid ?? null, update_uid: details.uid ?? null };
        if (!req.user) {
            env.log.error(LOG_ACTION, "unauthenticated_update", LOG_DETAILS);
            return (0, Errors_1.sendNotAuthenticatedError)(res, "unauthenticated_update", "Sign in to change details");
        }
        const uid = details.uid || req.user.uid;
        if (req.user.uid !== "admin" && (uid !== req.user.uid || typeof details.is_disabled === "boolean")) {
            env.log.error(LOG_ACTION, "unauthorized_update", LOG_DETAILS);
            return (0, Errors_1.sendUnauthorizedError)(res, "unauthorized_update", "You are not authorized to perform this update. This attempt has been logged.");
        }
        if (typeof details.display_name === "undefined" && typeof details.displayName === "string") {
            // Allow displayName to be sent also (which is used in signup endpoint)
            details.display_name = details.displayName;
        }
        // Check if sent details are ok
        let err;
        if (details.email && !(0, Validate_1.isValidEmail)(details.email)) {
            err = Validate_1.invalidEmailError;
        }
        else if (details.email && !(await (0, Validate_1.isValidNewEmailAddress)(env.authRef, details.email))) {
            err = Validate_1.emailExistsError;
        }
        else if (details.username && !(0, Validate_1.isValidUsername)(details.username)) {
            err = Validate_1.invalidUsernameError;
        }
        else if (details.username && !(await (0, Validate_1.isValidNewUsername)(env.authRef, details.username))) {
            err = Validate_1.usernameExistsError;
        }
        else if (details.display_name && !(0, Validate_1.isValidDisplayName)(details.display_name)) {
            err = Validate_1.invalidDisplayNameError;
        }
        else if (details.picture && !(0, Validate_1.isValidPicture)(details.picture)) {
            err = Validate_1.invalidPictureError;
        }
        else if (!(0, Validate_1.isValidSettings)(details.settings)) {
            err = Validate_1.invalidSettingsError;
        }
        if (err) {
            // Log failure
            env.log.error(LOG_ACTION, err.code, LOG_DETAILS);
            res.status(422).send(err); // Unprocessable Entity
            return;
        }
        try {
            let user;
            await env.authRef.child(uid).transaction((snap) => {
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
                if (details.picture) {
                    user.picture = details.picture;
                }
                if (details.settings) {
                    if (typeof user.settings !== "object") {
                        user.settings = {};
                    }
                    Object.keys(details.settings).forEach((key) => {
                        user.settings[key] = details.settings[key];
                    });
                    if (!(0, Validate_1.isValidSettings)(user.settings)) {
                        err = Validate_1.invalidSettingsError;
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
                env.log.error(LOG_ACTION, err.code ?? "unexpected", LOG_DETAILS, err);
                (0, Errors_1.sendUnexpectedError)(res, err);
            }
        }
    });
};
exports.addRoute = addRoute;
//# sourceMappingURL=update.js.map