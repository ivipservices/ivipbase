import type { LocalServer, RouteRequest } from "../../";
import { DbUserAccountDetails } from "../../schema/user";
import { IvipBaseUserResetPasswordSuccessEmailRequest } from "../../shared/email";
import { sendBadRequestError, sendError, sendUnauthorizedError, sendUnexpectedError } from "../../shared/error";
import { createPasswordHash } from "../../shared/password";
import { parseSignedPublicToken } from "../../shared/tokens";

export class ResetPasswordError extends Error {
	constructor(public code: "invalid_code" | "unknown_user" | "password_requirement_mismatch", message: string) {
		super(message);
	}
}

export type RequestQuery = never;
export type RequestBody = { code: string; password: string };
export type ResponseBody = "OK" | { code: string; message: string };
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoutes = (env: LocalServer) => {
	const resetPassword = async (dbName: string, clientIp: string, code: string, newPassword: string) => {
		if (!env.tokenSalt) {
			throw new Error("Token salt not set in server settings");
		}

		const verification = (() => {
			try {
				return parseSignedPublicToken(code, env.tokenSalt);
			} catch (err) {
				throw new ResetPasswordError("invalid_code", (err as any).message);
			}
		})();
		const snap = await env.authRef(dbName).child(verification.uid).get();
		if (!snap.exists()) {
			throw new ResetPasswordError("unknown_user", "Uknown user");
		}
		const user: DbUserAccountDetails = snap.val();
		user.uid = snap.key as string;

		if (!user.email) {
			throw new ResetPasswordError("unknown_user", "Uknown user");
		}

		if (user.password_reset_code !== verification.code) {
			throw new ResetPasswordError("invalid_code", "Invalid code");
		}

		if (newPassword.length < 8 || newPassword.includes(" ")) {
			throw new ResetPasswordError("password_requirement_mismatch", "Password must be at least 8 characters, and cannot contain spaces");
		}

		// Ok to change password
		const pwd = createPasswordHash(newPassword);
		await snap.ref.update({
			password: pwd.hash,
			password_salt: pwd.salt,
			password_reset_code: null,
		});

		// Send confirmation email
		const request: IvipBaseUserResetPasswordSuccessEmailRequest = {
			type: "user_reset_password_success",
			date: new Date(),
			ip: clientIp,
			user: {
				uid: user.uid,
				email: user.email,
				username: user.username,
				displayName: user.display_name,
				settings: user.settings,
			},
		};

		env.send_email(dbName, request);
		return user;
	};

	env.router.post(`/auth/:dbName/reset_password`, async (req: Request, res) => {
		const { dbName } = req.params;

		if (!env.hasDatabase(dbName)) {
			return sendError(res, {
				code: "not_found",
				message: `Database '${dbName}' not found`,
			});
		}

		const details = req.body;
		const LOG_ACTION = "auth.reset_password";
		const LOG_DETAILS = { ip: req.ip, uid: req.user?.uid ?? null };

		try {
			const user = await resetPassword(dbName, req.ip, details.code, details.password);
			// env.log.event(LOG_ACTION, { ...LOG_DETAILS, reset_uid: user.uid });
			res.send("OK");
		} catch (err) {
			env.log.error(LOG_ACTION, (err as any).code ?? "unexpected", { ...LOG_DETAILS, message: (err instanceof Error && err.message) ?? (err as any).toString() });
			if ((err as any).code) {
				sendBadRequestError(res, err as any);
			} else {
				sendUnexpectedError(res, err as any);
			}
		}
	});

	return resetPassword;
};

export default addRoutes;
