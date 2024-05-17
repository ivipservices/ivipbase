import adminOnly from "../../middleware/admin-only.js";
import { sendError } from "../../shared/error.js";
export const addRoutes = (env) => {
    env.router.post(`/schema/:dbName`, adminOnly(env), async (req, res) => {
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return sendError(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        try {
            const data = req.body;
            const { path, schema, warnOnly = false } = data;
            await env.db(dbName).schema.set(path, schema, warnOnly);
            res.contentType("application/json").send({ success: true });
        }
        catch (err) {
            sendError(res, err);
        }
    });
};
export default addRoutes;
//# sourceMappingURL=schema-set.js.map