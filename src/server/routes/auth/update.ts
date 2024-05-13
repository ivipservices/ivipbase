import type { LocalServer, RouteRequest } from "../../";
import { DbUserAccountDetails, UserProfilePicture, getPublicAccountDetails, iVipBaseUser } from "../../schema/user";
import { sendError, sendNotAuthenticatedError, sendUnauthorizedError, sendUnexpectedError } from "../../shared/error";
import {
	emailExistsError,
	invalidDisplayNameError,
	invalidEmailError,
	invalidPictureError,
	invalidSettingsError,
	invalidUsernameError,
	isValidDisplayName,
	isValidEmail,
	isValidNewEmailAddress,
	isValidNewUsername,
	isValidPicture,
	isValidSettings,
	isValidUsername,
	usernameExistsError,
} from "../../shared/validate";

export class UpdateError extends Error {
	constructor(
		public code:
			| "unauthenticated_update"
			| "unauthorized_update"
			| "user_not_found"
			| "invalid_email"
			| "email_conflict"
			| "invalid_username"
			| "username_conflict"
			| "invalid_display_name"
			| "invalid_picture"
			| "invalid_settings",
		message: string,
	) {
		super(message);
	}
}

export type RequestQuery = never;
export type RequestBody = {
	/** admin only: specifies user account to update */
	uid: string;
	/** Admin only: whether to enable or disable the account */
	is_disabled?: boolean;
	email?: string;
	username?: string;
	displayName?: string;
	display_name?: string;
	picture?: UserProfilePicture;
	settings?: {
		[name: string]: string | number | boolean;
	};
} & // Allow both spellings of display name. display_name is used in the db, displayName in public user detail server responses.
// displayName is preferred and documented in the OpenAPI docs
({ displayName: string } | { display_name: string });

export type ResponseBody = { user: iVipBaseUser } | { code: UpdateError["code"]; message: string };
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoutes = (env: LocalServer) => {
	env.router.post(`/auth/:dbName/update`, async (req: Request, res) => {
		const { dbName } = req.params;

		if (!env.hasDatabase(dbName)) {
			return sendError(res, {
				code: "not_found",
				message: `Database '${dbName}' not found`,
			});
		}

		const details = req.body;
		const LOG_ACTION = "auth.update";
		const LOG_DETAILS = { ip: req.ip, uid: req.user?.uid ?? null, update_uid: details.uid ?? null };

		if (!req.user) {
			env.log.error(LOG_ACTION, "unauthenticated_update", LOG_DETAILS);
			return sendNotAuthenticatedError(res, "unauthenticated_update", "Sign in to change details");
		}

		const uid = details.uid || req.user.uid;

		if (req.user.uid !== "admin" && (uid !== req.user.uid || typeof details.is_disabled === "boolean")) {
			env.log.error(LOG_ACTION, "unauthorized_update", LOG_DETAILS);
			return sendUnauthorizedError(res, "unauthorized_update", "You are not authorized to perform this update. This attempt has been logged.");
		}

		if (typeof details.display_name === "undefined" && typeof details.displayName === "string") {
			// Allow displayName to be sent also (which is used in signup endpoint)
			details.display_name = details.displayName;
		}

		// Check if sent details are ok
		let err: { code: UpdateError["code"]; message: string } | undefined;
		if (details.email && !isValidEmail(details.email)) {
			err = invalidEmailError;
		} else if (details.email && !(await isValidNewEmailAddress(env.authRef(dbName), details.email))) {
			err = emailExistsError;
		} else if (details.username && !isValidUsername(details.username)) {
			err = invalidUsernameError;
		} else if (details.username && !(await isValidNewUsername(env.authRef(dbName), details.username))) {
			err = usernameExistsError;
		} else if (details.display_name && !isValidDisplayName(details.display_name)) {
			err = invalidDisplayNameError;
		} else if (details.picture && !isValidPicture(details.picture)) {
			err = invalidPictureError;
		} else if (!isValidSettings(details.settings)) {
			err = invalidSettingsError;
		}

		if (err) {
			// Log failure
			env.log.error(LOG_ACTION, err.code, LOG_DETAILS);
			res.status(422).send(err); // Unprocessable Entity
			return;
		}

		try {
			let user: DbUserAccountDetails | undefined;
			await env
				.authRef(dbName)
				.child(uid)
				.transaction((snap) => {
					if (!snap.exists()) {
						throw new UpdateError("user_not_found", `No user found with uid ${uid}`);
					}
					user = snap.val() as DbUserAccountDetails;
					if (details.email && details.email !== user.email) {
						user.email = details.email;
						user.email_verified = false; // TODO: send verification email
					}
					if (details.username) {
						user.username = details.username;
					}
					if (details.display_name) {
						user.display_name = details.display_name;
					}
					if (details.picture) {
						user.picture = details.picture;
					}
					if (details.settings) {
						if (typeof user.settings !== "object") {
							user.settings = {};
						}
						Object.keys(details.settings ?? {}).forEach((key) => {
							if (user) {
								user.settings[key] = (details.settings ?? {})[key];
							}
						});
						if (!isValidSettings(user.settings)) {
							err = invalidSettingsError;
							env.log.error(LOG_ACTION, "too_many_settings", LOG_DETAILS);
							res.statusCode = 422; // Unprocessable Entity
							res.send(err);
							return;
						}
					}
					if (typeof details.is_disabled === "boolean") {
						user.is_disabled = details.is_disabled;
					}

					return user; // Update db user
				});

			if (!user || !user.uid) {
				throw new UpdateError("user_not_found", `No user found with uid ${uid}`);
			}

			// Update cache
			env.authCache.set(user.uid, user);

			// Send merged results back
			res.send({ user: getPublicAccountDetails(user) });
		} catch (err) {
			// All known errors except user_not_found will have been sent already
			if ((err as any).code === "user_not_found") {
				env.log.error(LOG_ACTION, (err as any).code, LOG_DETAILS);

				res.statusCode = 404; // Not Found
				res.send(err as any);
			} else {
				// Unexpected
				env.log.error(LOG_ACTION, (err as any).code ?? "unexpected", LOG_DETAILS, err);
				sendUnexpectedError(res, err as any);
			}
		}
	});
};

export default addRoutes;
