"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addAuthenticionRoutes = void 0;
const user_1 = require("../../Middleware/user.js");
const Auth_1 = require("../../lib/Auth.js");
const state_1 = require("./state.js");
const signin_1 = require("./signin.js");
const signout_1 = require("./signout.js");
const verify_email_1 = require("./verify-email.js");
const forgot_password_1 = require("./forgot-password.js");
const reset_password_1 = require("./reset-password.js");
const change_password_1 = require("./change-password.js");
const signup_1 = require("./signup.js");
const update_1 = require("./update.js");
const delete_1 = require("./delete.js");
// import { addRoute as addOAuth2InitRoute } from './oauth2-init';
// import { addRoute as addOAuth2SignInRoute } from './oauth2-signin';
// import { addRoute as addOAuth2RefreshRoute } from './oauth2-refresh';
const addAuthenticionRoutes = async (env) => {
    if (!env.config.auth.enabled) {
        throw new Error("Authentication not enabled in the server settings");
    }
    // Setup auth database
    await (0, Auth_1.default)(env);
    // Bearer authentication middleware
    (0, user_1.addMiddleware)(env);
    // Auth state endpoint
    (0, state_1.addRoute)(env);
    // signin endpoint
    (0, signin_1.addRoute)(env);
    // signout endpoint
    (0, signout_1.addRoute)(env);
    // verify email endpoint
    const verifyEmailAddress = (0, verify_email_1.addRoute)(env);
    // forgot password endpoint (issue password reset)
    (0, forgot_password_1.addRoute)(env);
    // reset password endpoint (finish password reset)
    const resetPassword = (0, reset_password_1.addRoute)(env);
    // change password endpoint
    (0, change_password_1.addRoute)(env);
    // signup endpoint
    (0, signup_1.addRoute)(env);
    // update enpoint
    (0, update_1.addRoute)(env);
    // delete endpoint
    (0, delete_1.addRoute)(env);
    // // OAuth2 init endpoint
    // addOAuth2InitRoute(env);
    // // OAuth2 signin endpoint
    // addOAuth2SignInRoute(env);
    // // OAuth2 token refresh endpoint
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