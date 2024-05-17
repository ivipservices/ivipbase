import { sendError } from "../../shared/error.js";
import { getPublicAccountDetails } from "../../schema/user.js";
export const addRoutes = (env) => {
    env.router.get(`/auth/:dbName/state`, async (req, res) => {
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return sendError(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        if (req.user) {
            res.send({ signed_in: true, user: getPublicAccountDetails(req.user) });
        }
        else {
            res.send({ signed_in: false });
        }
    });
};
export default addRoutes;
//# sourceMappingURL=state.js.map