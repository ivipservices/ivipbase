import addBearerAuthMiddleware from "../../middleware/user.js";
import addStateRoute from "./state.js";
import addSignInRoute from "./signin.js";
import addSignOutRoute from "./signout.js";
import addVerifyEmailRoute from "./verify-email.js";
import addForgotPasswordRoute from "./forgot-password.js";
import addResetPasswordRoute from "./reset-password.js";
import addChangePasswordRoute from "./change-password.js";
import addSignUpRoute from "./signup.js";
import addUpdateRoute from "./update.js";
import addDeleteRoute from "./delete.js";
import addSendEmailVerificationRoute from "./send-email-verification.js";
export const addAuthenticionRoutes = (env) => {
    if (!env.settings.auth.enabled) {
        throw new Error("Authentication not enabled in the server settings");
    }
    // Bearer authentication middleware
    addBearerAuthMiddleware(env);
    // Auth state endpoint
    addStateRoute(env);
    // signin endpoint
    addSignInRoute(env);
    // signout endpoint
    addSignOutRoute(env);
    // verify email endpoint
    const verifyEmailAddress = addVerifyEmailRoute(env);
    // forgot password endpoint (issue password reset)
    addForgotPasswordRoute(env);
    // send email verification endpoint
    addSendEmailVerificationRoute(env);
    // reset password endpoint (finish password reset)
    const resetPassword = addResetPasswordRoute(env);
    // change password endpoint
    addChangePasswordRoute(env);
    // signup endpoint
    addSignUpRoute(env);
    // update enpoint
    addUpdateRoute(env);
    // delete endpoint
    addDeleteRoute(env);
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
export default addAuthenticionRoutes;
//# sourceMappingURL=index.js.map