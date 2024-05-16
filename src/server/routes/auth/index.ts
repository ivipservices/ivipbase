import type { LocalServer } from "../../";
import addBearerAuthMiddleware from "../../middleware/user";
import addStateRoute from "./state";
import addSignInRoute from "./signin";
import addSignOutRoute from "./signout";
import addVerifyEmailRoute from "./verify-email";
import addForgotPasswordRoute from "./forgot-password";
import addResetPasswordRoute from "./reset-password";
import addChangePasswordRoute from "./change-password";
import addSignUpRoute from "./signup";
import addUpdateRoute from "./update";
import addDeleteRoute from "./delete";
import addSendEmailVerificationRoute from "./send-email-verification";

export const addAuthenticionRoutes = (env: LocalServer) => {
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
