import { ID } from "ivipbase-core";
import type { LocalServer, RouteRequest } from "../../";
import { DbUserAccountDetails } from "../../schema/user";
import { sendBadRequestError, sendError, sendUnexpectedError } from "../../shared/error";
import { IvipBaseUserResetPasswordEmailRequest } from "../../shared/email";
import { createSignedPublicToken } from "../../shared/tokens";

export class ForgotPasswordError extends Error {
	constructor(public code: "server_email_config" | "invalid_details" | "invalid_email", message: string) {
		super(message);
	}
}

export type RequestQuery = never;
export type RequestBody = { email: string };
export type ResponseBody = "OK" | { code: string; message: string };
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoutes = (env: LocalServer) => {
	env.router.post(`/auth/:dbName/forgot_password`, async (req: Request, res) => {
		const { dbName } = req.params;

		if (!env.hasDatabase(dbName)) {
			return sendError(res, {
				code: "not_found",
				message: `Database '${dbName}' not found`,
			});
		}

		const details = req.body;
		const LOG_ACTION = "auth.forgot_password";
		const LOG_DETAILS = { ip: req.ip, uid: req.user?.uid ?? null, email: details.email };

		const tokenSalt = env.tokenSalt[dbName];

		try {
			if (!tokenSalt) {
				throw new ForgotPasswordError("server_email_config", "Token salt not set");
			}

			if (typeof details !== "object" || typeof details.email !== "string" || details.email.length === 0) {
				throw new ForgotPasswordError("invalid_details", "Invalid details");
			}

			const snaps = await env.authRef(dbName).query().filter("email", "==", details.email).get();

			if (snaps.length !== 1) {
				throw new ForgotPasswordError("invalid_email", "Email address not found, or duplicate entries found");
			}

			const snap = snaps[0];
			const user: DbUserAccountDetails = snap.val();
			user.uid = snap.key as string;
			user.password_reset_code = ID.generate();

			if (!user.email) {
				throw new ForgotPasswordError("invalid_email", "Email address not found");
			}

			// Request a password reset email to be sent:
			const request: IvipBaseUserResetPasswordEmailRequest = {
				type: "user_reset_password",
				date: new Date(),
				ip: req.ip ?? "0.0.0.0",
				resetCode: createSignedPublicToken({ uid: user.uid, code: user.password_reset_code }, tokenSalt),
				user: {
					email: user.email,
					uid: user.uid,
					username: user.username,
					settings: user.settings,
					displayName: user.display_name,
				},
			};

			await snap.ref.update({ password_reset_code: user.password_reset_code });
			await env.send_email(dbName, request).catch((err) => {
				env.log.error(LOG_ACTION + ".email", "unexpected", { ...LOG_DETAILS, request }, err);
			});
			// env.log.event(LOG_ACTION, LOG_DETAILS);
			res.send("OK");
		} catch (err) {
			env.log.error(LOG_ACTION, (err as any).code || "unexpected", { ...LOG_DETAILS, message: (err instanceof Error && err.message) ?? (err as any).toString() });
			if ((err as any).code) {
				sendBadRequestError(res, err as any);
			} else {
				sendUnexpectedError(res, err as any);
			}
		}
	});
};

export default addRoutes;
