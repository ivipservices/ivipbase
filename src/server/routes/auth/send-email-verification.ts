import type { LocalServer, RouteRequest } from "../../";
import { DbUserAccountDetails } from "../../schema/user";
import { IvipBaseUserSignupEmailRequest } from "../../shared/email";
import { sendError, sendUnexpectedError } from "../../shared/error";
import { createSignedPublicToken } from "../../shared/tokens";
import { isValidEmail, isValidUsername } from "../../shared/validate";

export type RequestQuery = null;
export type RequestBody = { username?: string; email?: string };
export type ResponseBody = "Ok" | { code: string; message: string };
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoutes = (env: LocalServer) => {
	env.router.post(`/auth/:dbName/send_email_verification`, async (req: Request, res) => {
		const { dbName } = req.params;

		if (!env.hasDatabase(dbName)) {
			return sendError(res, {
				code: "auth/system-error",
				message: `Database '${dbName}' not found`,
			});
		}

		const tokenSalt = env.tokenSalt[dbName];

		if (!tokenSalt) {
			return sendError(res, { code: "auth/system-error", message: "Token salt not set" });
		}

		const LOG_ACTION = "auth.send_email_verification";
		const LOG_DETAILS: {
			ip: string;
			uid?: string | null;
		} = { ip: req.ip ?? "0.0.0.0", uid: req.user?.uid ?? null };

		let user: DbUserAccountDetails | null = req.user ?? null;
		const details = req.body;

		if (!user) {
			if (!details.username || !details.email) {
				return sendError(res, { code: "auth/missing-details", message: "No username or email provided" });
			}

			const query = env.authRef(dbName).query();

			if (details.email && isValidEmail(details.email)) {
				query.filter("email", "==", details.email);
			} else if (details.username && isValidUsername(details.username)) {
				query.filter("username", "==", details.username);
			} else {
				return sendError(res, { code: "auth/invalid-email", message: "Invalid email or username" });
			}

			const snaps = await query.get();
			if (snaps.length === 0) {
				return sendError(res, { code: "auth/user-not-found", message: "Account not found" });
			} else if (snaps.length > 1) {
				return sendError(res, { code: "auth/user-duplicate", message: `${snaps.length} users found with the same ${details.email}. Contact your database administrator` });
			}

			const snap = snaps[0];
			user = snap.val();

			if (!user) {
				return sendError(res, { code: "auth/user-not-found", message: "Account not found" });
			}

			user.uid = snap.key as string;

			if (user.is_disabled === true) {
				return sendError(res, { code: "auth/user-disabled", message: "Your account has been disabled. Contact your database administrator" });
			}
		}

		try {
			// Send email verification
			const request: IvipBaseUserSignupEmailRequest = {
				type: "user_signup",
				user: {
					uid: user.uid as any,
					username: user.username,
					email: user.email ?? "",
					displayName: user.display_name,
					settings: user.settings,
				},
				date: user.created,
				ip: user.created_ip ?? req.ip ?? "0.0.0.0",
				provider: "ivipbase",
				activationCode: createSignedPublicToken({ uid: user.uid }, tokenSalt),
				emailVerified: false,
			};

			LOG_DETAILS.uid = user.uid;

			env.send_email(dbName, request).catch((err) => {
				env.log.error(LOG_ACTION + ".email", "unexpected", { ...LOG_DETAILS, request }, err);
			});
		} catch (err) {
			env.log.error(LOG_ACTION, "unexpected", { ...LOG_DETAILS, message: err instanceof Error ? err.message : (err as any).toString(), username: details.username, email: details.email });
			sendUnexpectedError(res, err as any);
		}
	});
};

export default addRoutes;
