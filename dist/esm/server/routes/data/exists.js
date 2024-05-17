import { sendError, sendUnauthorizedError } from "../../shared/error.js";
export const addRoutes = (env) => {
    env.router.get(`/exists/:dbName/*`, async (req, res) => {
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return sendError(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const path = req.params["0"];
        const access = await env.rules(dbName).isOperationAllowed(req.user ?? {}, path, "exists", { context: req.context });
        if (!access.allow) {
            return sendUnauthorizedError(res, access.code, access.message);
        }
        try {
            const exists = await env.db(dbName).ref(path).exists();
            res.send({ exists });
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err);
        }
    });
};
export default addRoutes;
//# sourceMappingURL=exists.js.map