import type { LocalServer, RouteRequest } from "../../";
import { sendError, sendNotAuthenticatedError, sendUnauthorizedError, sendUnexpectedError } from "../../shared/error";

export class DeleteError extends Error {
	constructor(public code: "unauthenticated_delete" | "unauthorized_delete", message: string) {
		super(message);
	}
}

export type RequestQuery = never;
export type RequestBody = { uid: string };
export type ResponseBody = "Farewell" | { code: DeleteError["code"]; message: string };
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoutes = (env: LocalServer) => {
	env.router.post(`/auth/:dbName/delete`, async (req: Request, res) => {
		const { dbName } = req.params;

		if (!env.hasDatabase(dbName)) {
			return sendError(res, {
				code: "not_found",
				message: `Database '${dbName}' not found`,
			});
		}

		const details = req.body;
		const LOG_ACTION = "auth.delete";
		const LOG_DETAILS = { ip: req.ip, uid: req.user?.uid ?? null, delete_uid: details.uid };

		if (!req.user) {
			env.log.error(LOG_ACTION, "unauthenticated_delete", LOG_DETAILS);
			return sendNotAuthenticatedError(res, "unauthenticated_delete", "You are not authorized to perform this operation, your attempt has been logged");
		}

		if (req.user.uid !== "admin" && details.uid !== req.user.uid) {
			env.log.error(LOG_ACTION, "unauthorized_delete", LOG_DETAILS);
			return sendUnauthorizedError(res, "unauthorized_delete", "You are not authorized to perform this operation, your attempt has been logged");
		}

		const uid = details.uid ?? req.user.uid;
		if (uid === "admin") {
			env.log.error(LOG_ACTION, "unauthorized_delete", LOG_DETAILS);
			return sendUnauthorizedError(res, "unauthorized_delete", "The admin account cannot be deleted, your attempt has been logged");
		}

		try {
			await env.authRef(dbName).child(uid).remove();
			//env.log.event(LOG_ACTION, LOG_DETAILS);
			res.send("Farewell");
		} catch (err) {
			env.log.error(LOG_ACTION, "unexpected", { ...LOG_DETAILS, message: (err instanceof Error && err.message) ?? (err as any).toString() });
			sendUnexpectedError(res, err as any);
		}
	});
};

export default addRoutes;
