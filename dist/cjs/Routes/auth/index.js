"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addAuthenticionRoutes = void 0;
const user_1 = require("../../Middleware/user");
const Auth_1 = require("../../lib/Auth");
const state_1 = require("./state");
const signin_1 = require("./signin");
const signout_1 = require("./signout");
const verify_email_1 = require("./verify-email");
const forgot_password_1 = require("./forgot-password");
const reset_password_1 = require("./reset-password");
const change_password_1 = require("./change-password");
const signup_1 = require("./signup");
const update_1 = require("./update");
const delete_1 = require("./delete");
// import { addRoute as addOAuth2InitRoute } from './oauth2-init';
// import { addRoute as addOAuth2SignInRoute } from './oauth2-signin';
// import { addRoute as addOAuth2RefreshRoute } from './oauth2-refresh';
const addAuthenticionRoutes = (env) => __awaiter(void 0, void 0, void 0, function* () {
    if (!env.config.auth.enabled) {
        throw new Error("Authentication not enabled in the server settings");
    }
    // Setup auth database
    yield (0, Auth_1.default)(env);
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
});
exports.addAuthenticionRoutes = addAuthenticionRoutes;
exports.default = exports.addAuthenticionRoutes;
//# sourceMappingURL=index.js.map