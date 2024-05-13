import type { LocalServer, RouteRequest } from "../../";
import { sendError, sendUnauthorizedError } from "../../shared/error";
import { getPublicAccountDetails, iVipBaseUser } from "../../schema/user";

export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = { signed_in: false } | { signed_in: true; user: iVipBaseUser };
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoutes = (env: LocalServer) => {
	env.router.get(`/auth/:dbName/state`, async (req: Request, res) => {
		const { dbName } = req.params;

		if (!env.hasDatabase(dbName)) {
			return sendError(res, {
				code: "not_found",
				message: `Database '${dbName}' not found`,
			});
		}

		if (req.user) {
			res.send({ signed_in: true, user: getPublicAccountDetails(req.user) });
		} else {
			res.send({ signed_in: false });
		}
	});
};

export default addRoutes;
