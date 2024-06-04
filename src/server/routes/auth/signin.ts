import type { LocalServer, RouteRequest } from "../../";
import { getPublicAccountDetails, iVipBaseUser } from "../../schema/user";
import { sendError, sendNotAuthenticatedError, sendUnauthorizedError, sendUnexpectedError } from "../../shared/error";
import { SignInCredentials, signIn } from "../../shared/signin";
import { createPublicAccessToken } from "../../shared/tokens";

export type RequestQuery = null;
export type RequestBody = { client_id?: string } & (
	| { method: "token"; access_token: string }
	| { method: "email"; email: string; password: string }
	| { method: "account"; username: string; password: string }
);
export type ResponseBody = {
	access_token: string;
	user: iVipBaseUser;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoutes = (env: LocalServer) => {
	if (!env.settings.auth.enabled) {
		throw new Error("Authentication not enabled in the server settings");
	}

	env.router.post(`/auth/:dbName/signin`, async (req: Request, res) => {
		const { dbName } = req.params;

		if (!env.hasDatabase(dbName)) {
			return sendError(res, {
				code: "auth/system-error",
				message: `Database '${dbName}' not found`,
			});
		}

		const tokenSalt = env.tokenSalt[dbName];

		if (!tokenSalt) {
			return sendError(res, {
				code: "auth/system-error",
				message: "Token salt not ready",
			});
		}

		const details = req.body;
		const clientId = details.client_id || null;

		try {
			const user = await signIn(dbName, details as SignInCredentials, env, req);
			if (!user || !user.uid || !user.access_token) {
				throw new Error("User not found");
			}
			if (typeof clientId === "string" && env.clients.has(clientId)) {
				const client = env.clients.get(clientId);
				if (!client) {
					throw new Error(`Client with id ${clientId} not found`);
				}
				client.user.delete(dbName); // Bind user to client socket
			}
			res.send({
				access_token: createPublicAccessToken(dbName, user.uid, req.ip ?? "0.0.0.0", user.access_token, tokenSalt),
				user: getPublicAccountDetails(user),
			});
		} catch (err) {
			if (typeof (err as any).code === "string") {
				// Authentication error
				return sendNotAuthenticatedError(res, (err as any).code, (err as any).message);
			}

			// Unexpected error
			return sendUnexpectedError(res, err as any);
		}
	});
};

export default addRoutes;
