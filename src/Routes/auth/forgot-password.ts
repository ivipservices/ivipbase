import { RouteInitEnvironment, RouteRequest, AceBaseUserResetPasswordEmailRequest } from "src/types";
import { DbUserAccountDetails } from "src/Schema/user";
import { createSignedPublicToken } from "src/lib/Tokens";
import { ID } from "acebase-core";
import { sendBadRequestError, sendUnexpectedError } from "src/lib/Errors";

export class ForgotPasswordError extends Error {
	constructor(public code: "server_email_config" | "invalid_details" | "invalid_email", message: string) {
		super(message);
	}
}

export type RequestQuery = never;
export type RequestBody = { email: string };
export type ResponseBody = "OK" | { code: string; message: string };
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: RouteInitEnvironment) => {
	env.router.post(`/auth/${env.db.name}/forgot_password`, async (req: Request, res) => {
		const details = req.body;
		const LOG_ACTION = "auth.forgot_password";
		const LOG_DETAILS = { ip: req.ip, uid: req.user?.uid ?? null, email: details.email };

		try {
			if (!env.config.email || typeof env.config.email.send !== "function") {
				throw new ForgotPasswordError("server_email_config", "Server email settings have not been configured");
			}
			if (typeof details !== "object" || typeof details.email !== "string" || details.email.length === 0) {
				throw new ForgotPasswordError("invalid_details", "Invalid details");
			}
			const snaps = await env.authRef.query().filter("email", "==", details.email).get();
			if (snaps.length !== 1) {
				throw new ForgotPasswordError("invalid_email", "Email address not found, or duplicate entries found");
			}
			const snap = snaps[0];
			const user: DbUserAccountDetails = snap.val();
			user.uid = snap.key as string;
			user.password_reset_code = ID.generate();

			// Request a password reset email to be sent:
			const request: AceBaseUserResetPasswordEmailRequest = {
				type: "user_reset_password",
				date: new Date(),
				ip: req.ip,
				resetCode: createSignedPublicToken({ uid: user.uid, code: user.password_reset_code }, env.tokenSalt),
				user: {
					email: user.email,
					uid: user.uid,
					username: user.username,
					settings: user.settings,
					displayName: user.display_name,
				},
			};

			await snap.ref.update({ password_reset_code: user.password_reset_code });
			await env.config.email.send(request).catch((err) => {
				env.log.error(LOG_ACTION + ".email", "unexpected", { ...LOG_DETAILS, request }, err);
			});
			env.log.event(LOG_ACTION, LOG_DETAILS);
			res.send("OK");
		} catch (err) {
			env.log.error(LOG_ACTION, err.code || "unexpected", { ...LOG_DETAILS, message: (err instanceof Error && err.message) ?? err.toString() });
			if (err.code) {
				sendBadRequestError(res, err);
			} else {
				sendUnexpectedError(res, err);
			}
		}
	});
};

export default addRoute;
