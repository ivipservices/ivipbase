import { ID } from "ivipbase-core";
import { DbUserAccountDetails } from "../schema/user";
import { createPasswordHash, getOldPasswordHash, getPasswordHash } from "./password";
import { decodePublicAccessToken, PublicAccessToken } from "./tokens";
import { LocalServer, RouteRequest } from "..";

export type SignInCredentials =
	| { database: string; method: "token"; access_token: string }
	| { database: string; method: "internal"; access_token: string }
	| { database: string; method: "email"; email: string; password: string }
	| { database: string; method: "account"; username: string; password: string };

export class SignInError extends Error {
	constructor(public code: string, message: string, public details: any = {}) {
		super(message);
	}
}

/**
 * Signs in a user and logs the request. If successful, adds the user to authCache, binds the user to the http request and returns the user details.
 * Throws a `SignInError` if sign in fails for a known reason.
 * @param credentials credentials to sign in the user with
 * @param env environment state
 * @param req current http request
 * @returns
 */
export const signIn = async (credentials: SignInCredentials, env: LocalServer, req: RouteRequest) => {
	const LOG_ACTION = "auth.signin";
	const LOG_DETAILS = { ip: req.ip, method: credentials.method };

	try {
		if (!env.tokenSalt) {
			throw new SignInError("auth/system-error", "Token salt not ready");
		}

		const query = env.authRef(credentials.database).query();
		let tokenDetails: PublicAccessToken | undefined;

		switch (credentials.method) {
			case "token": {
				if (typeof credentials.access_token !== "string") {
					throw new SignInError("auth/invalid-details", "sign in request has invalid arguments");
				}
				try {
					tokenDetails = decodePublicAccessToken(credentials.access_token, env.tokenSalt);
					if (Date.now() - tokenDetails.created > 1000 * 60 * 60 * 60 * 24 * 7) {
						throw new Error("Token expired");
					}
					query.filter("access_token", "==", tokenDetails.access_token);
				} catch (err) {
					throw new SignInError("auth/invalid-token", (err as any).message);
				}
				break;
			}
			case "internal": {
				// Method used internally: uses the access token extracted from a public access token (see tokenDetails.access_token in above 'token' case)
				if (typeof credentials.access_token !== "string") {
					throw new SignInError("auth/invalid-details", "sign in request has invalid arguments");
				}
				query.filter("access_token", "==", credentials.access_token);
				break;
			}
			case "email": {
				if (typeof credentials.email !== "string" || typeof credentials.password !== "string") {
					throw new SignInError("auth/invalid-details", "sign in request has invalid arguments");
				}
				query.filter("email", "==", credentials.email);
				break;
			}
			case "account": {
				if (typeof credentials.username !== "string" || typeof credentials.password !== "string") {
					throw new SignInError("auth/invalid-details", "sign in request has invalid arguments");
				}
				query.filter("username", "==", credentials.username);
				break;
			}
			default: {
				throw new SignInError("auth/invalid-method", `Unsupported sign in method ${(credentials as any).method}`);
			}
		}

		const snaps = await query.get();
		if (snaps.length === 0) {
			throw new SignInError("auth/user-not-found", `account not found`);
		} else if (snaps.length > 1) {
			throw new SignInError("auth/user-duplicate", `${snaps.length} users found with the same ${credentials.method}. Contact your database administrator`, { count: snaps.length });
		}

		const snap = snaps[0];
		const user: DbUserAccountDetails | null = snap.val();

		if (!user) {
			throw new SignInError("auth/user-not-found", `account not found`);
		}

		user.uid = snap.key as string;

		if (user.is_disabled === true) {
			throw new SignInError("auth/user-disabled", "Your account has been disabled. Contact your database administrator");
		}

		if (credentials.method === "token") {
			if (!tokenDetails) {
				throw new SignInError("auth/invalid-token", "Token details not found");
			} else if (tokenDetails.uid !== user.uid) {
				throw new SignInError("auth/token-mismatch", "Sign in again");
			}
		}

		if (credentials.method === "account" || credentials.method === "email") {
			// Check password
			const hash = user.password_salt ? getPasswordHash(credentials.password, user.password_salt) : getOldPasswordHash(credentials.password);
			if (user.password !== hash) {
				throw new SignInError("auth/wrong-password", "Incorrect password");
			}
		}

		// Keep track of properties to update, both in db and in our object
		const updates: Partial<DbUserAccountDetails> = {
			// Update prev / last sign in stats
			prev_signin: user.last_signin,
			prev_signin_ip: user.last_signin_ip,
			last_signin: new Date(),
			last_signin_ip: req.ip,
		};

		if ("password" in credentials) {
			if (!user.password_salt) {
				// OLD md5 password hash, convert to new salted hash
				const pwd = createPasswordHash(credentials.password);
				updates.password = pwd.hash;
				updates.password_salt = pwd.salt;
			}
			if (!user.access_token) {
				// Generate access token
				updates.access_token = ID.generate();
				updates.access_token_created = new Date();
			}
		}

		// Update user object
		Object.assign(user, updates);

		// Update db
		await snap.ref.update(updates);

		// Log history item
		// if (credentials.method !== "internal") {
		// 	env.log.event(LOG_ACTION, LOG_DETAILS);
		// }

		// Add to cache
		env.authCache.set(user.uid, user);

		// Bind user to current request
		req.user = user;

		return user;
	} catch (err) {
		// Log error
		env.log.error(LOG_ACTION, (err as any).code ?? "unexpected", LOG_DETAILS, typeof (err as any).code === "undefined" ? err : null);
		throw err;
	}
};
