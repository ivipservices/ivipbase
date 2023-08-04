import { RouteInitEnvironment } from "src/types";
import { addMiddleware as addBearerAuthMiddleware } from "src/Middleware/user";
import setupAuthentication from "src/lib/Auth";
import { addRoute as addStateRoute } from "./state";
import { addRoute as addSignInRoute } from "./signin";
import { addRoute as addSignOutRoute } from "./signout";
import { addRoute as addVerifyEmailRoute } from "./verify-email";
import { addRoute as addForgotPasswordRoute } from "./forgot-password";
import { addRoute as addResetPasswordRoute } from "./reset-password";
import { addRoute as addChangePasswordRoute } from "./change-password";
import { addRoute as addSignUpRoute } from "./signup";
import { addRoute as addUpdateRoute } from "./update";
import { addRoute as addDeleteRoute } from "./delete";
// import { addRoute as addOAuth2InitRoute } from './oauth2-init';
// import { addRoute as addOAuth2SignInRoute } from './oauth2-signin';
// import { addRoute as addOAuth2RefreshRoute } from './oauth2-refresh';

export const addAuthenticionRoutes = async (env: RouteInitEnvironment) => {
	if (!env.config.auth.enabled) {
		throw new Error("Authentication not enabled in the server settings");
	}
	// Setup auth database
	await setupAuthentication(env);

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

export default addAuthenticionRoutes;
