import type { LocalServer, RouteRequest } from "../../";
import { DbUserAccountDetails } from "../../schema/user";
import { sendBadRequestError, sendError, sendUnexpectedError } from "../../shared/error";
import { parseSignedPublicToken } from "../../shared/tokens";

export class VerifyEmailError extends Error {
	constructor(public code: "invalid_code" | "unknown_user", message: string) {
		super(message);
	}
}

export type RequestQuery = null;
export type RequestBody = { code: string };
export type ResponseBody = { email: string } | { code: string; message: string };
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoutes = (env: LocalServer) => {
	const LOG_ACTION = "auth.verify_email";

	const verifyEmailAddress = async (dbName: string, clientIp: string, code: string): Promise<string> => {
		const LOG_DETAILS = { ip: clientIp, uid: null };

		const tokenSalt = env.tokenSalt[dbName];

		const verification = (() => {
			try {
				if (!tokenSalt) {
					throw new VerifyEmailError("invalid_code", "Token salt not set");
				}
				return parseSignedPublicToken(code, tokenSalt);
			} catch (err) {
				throw new VerifyEmailError("invalid_code", (err as any).message);
			}
		})();

		LOG_DETAILS.uid = verification.uid;
		const snap = await env.authRef(dbName).child(verification.uid).get();
		if (!snap.exists()) {
			env.log.error(LOG_ACTION, "unknown_user", LOG_DETAILS);
			throw new VerifyEmailError("unknown_user", "Unknown user");
		}
		const user: DbUserAccountDetails = snap.val();
		user.uid = snap.key as string;

		if (!user.email) {
			throw new VerifyEmailError("unknown_user", "Unknown user");
		}

		// No need to do further checks, code was signed by us so we can trust the contents
		// Mark account as verified
		await snap.ref.update({ email_verified: true });

		// env.log.event(LOG_ACTION, LOG_DETAILS);
		return user.email;
	};

	env.router.post(`/auth/:dbName/verify_email`, async (req: Request, res) => {
		const { dbName } = req.params;

		if (!env.hasDatabase(dbName)) {
			return sendError(res, {
				code: "not_found",
				message: `Database '${dbName}' not found`,
			});
		}

		const details = req.body;

		try {
			const email = await verifyEmailAddress(dbName, req.ip ?? "0.0.0.0", details.code);
			res.send({
				email,
			});
		} catch (err) {
			if ((err as any).code) {
				sendBadRequestError(res, err as any);
			} else {
				env.log.error(LOG_ACTION, "unexpected", { ip: req.ip, message: (err as any).message, verificaion_code: details.code });
				sendUnexpectedError(res, err as any);
			}
		}
	});

	return verifyEmailAddress;
};

export default addRoutes;
