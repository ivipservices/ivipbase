import adminOnly from "../../middleware/admin-only.js";
import { sendError } from "../../shared/error.js";
import { SchemaDefinition, Transport } from "ivipbase-core";
export const addRoutes = (env) => {
    env.router.post(`/schema/:dbName/test`, adminOnly(env), async (req, res) => {
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return sendError(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        try {
            const data = req.body;
            if (typeof data.value?.val === "undefined" || !["string", "object", "undefined"].includes(typeof data.value?.map)) {
                return sendError(res, { code: "invalid_serialized_value", message: "The sent value is not properly serialized" });
            }
            const value = Transport.deserialize(data.value);
            const { path, schema, partial } = data;
            if (!path) {
                return sendError(res, { code: "missing_path", message: "Path is required" });
            }
            let result;
            if (schema) {
                const definition = new SchemaDefinition(schema);
                result = definition.check(path, value, partial);
            }
            else {
                result = await env.db(dbName).schema.check(path, schema, partial);
            }
            res.contentType("application/json").send(result);
        }
        catch (err) {
            sendError(res, err);
        }
    });
};
export default addRoutes;
//# sourceMappingURL=schema-test.js.map