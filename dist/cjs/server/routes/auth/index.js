"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addAuthenticionRoutes = void 0;
const user_1 = __importDefault(require("../../middleware/user"));
const state_1 = __importDefault(require("./state"));
const signin_1 = __importDefault(require("./signin"));
const signout_1 = __importDefault(require("./signout"));
const verify_email_1 = __importDefault(require("./verify-email"));
const forgot_password_1 = __importDefault(require("./forgot-password"));
const reset_password_1 = __importDefault(require("./reset-password"));
const change_password_1 = __importDefault(require("./change-password"));
const signup_1 = __importDefault(require("./signup"));
const update_1 = __importDefault(require("./update"));
const delete_1 = __importDefault(require("./delete"));
const send_email_verification_1 = __importDefault(require("./send-email-verification"));
const addAuthenticionRoutes = (env) => {
    if (!env.settings.auth.enabled) {
        throw new Error("Authentication not enabled in the server settings");
    }
    // Bearer authentication middleware
    (0, user_1.default)(env);
    // Auth state endpoint
    (0, state_1.default)(env);
    // signin endpoint
    (0, signin_1.default)(env);
    // signout endpoint
    (0, signout_1.default)(env);
    // verify email endpoint
    const verifyEmailAddress = (0, verify_email_1.default)(env);
    // forgot password endpoint (issue password reset)
    (0, forgot_password_1.default)(env);
    // send email verification endpoint
    (0, send_email_verification_1.default)(env);
    // reset password endpoint (finish password reset)
    const resetPassword = (0, reset_password_1.default)(env);
    // change password endpoint
    (0, change_password_1.default)(env);
    // signup endpoint
    (0, signup_1.default)(env);
    // update enpoint
    (0, update_1.default)(env);
    // delete endpoint
    (0, delete_1.default)(env);
    // OAuth2 init endpoint
    // addOAuth2InitRoute(env);
    // OAuth2 signin endpoint
    // addOAuth2SignInRoute(env);
    // OAuth2 token refresh endpoint
    // addOAuth2RefreshRoute(env);
    // Return auth functions that can be used directly through an AceBaseServer instance
    return {
        verifyEmailAddress,
        resetPassword,
    };
};
exports.addAuthenticionRoutes = addAuthenticionRoutes;
exports.default = exports.addAuthenticionRoutes;
//# sourceMappingURL=index.js.map