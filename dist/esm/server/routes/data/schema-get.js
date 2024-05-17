import adminOnly from "../../middleware/admin-only.js";
import { sendError } from "../../shared/error.js";
export const addRoutes = (env) => {
    env.router.get(`/schema/:dbName/*`, adminOnly(env), async (req, res) => {
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return sendError(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        // Get defined schema for a specifc path
        try {
            const path = req.params["0"];
            const schema = await env.db(dbName).schema.get(path);
            if (!schema) {
                return res.status(410).send("Not Found");
            }
            res.contentType("application/json").send({
                path: schema.path,
                schema: typeof schema.schema === "string" ? schema.schema : schema.text,
                text: schema.text,
            });
        }
        catch (err) {
            sendError(res, err);
        }
    });
};
export default addRoutes;
//# sourceMappingURL=schema-get.js.map