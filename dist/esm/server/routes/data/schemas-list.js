import adminOnly from "../../middleware/admin-only.js";
import { sendError } from "../../shared/error.js";
export const addRoutes = (env) => {
    env.router.get(`/schema/:dbName`, adminOnly(env), async (req, res) => {
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return sendError(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        try {
            const schemas = await env.db(dbName).schema.all();
            res.contentType("application/json").send(schemas.map((schema) => ({
                path: schema.path,
                schema: typeof schema.schema === "string" ? schema.schema : schema.text,
                text: schema.text,
            })));
        }
        catch (err) {
            sendError(res, err);
        }
    });
};
export default addRoutes;
//# sourceMappingURL=schemas-list.js.map