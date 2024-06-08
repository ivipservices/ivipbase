import { Transport } from "ivipbase-core";
import { sendError, sendUnauthorizedError } from "../../shared/error.js";
export const addRoutes = (env) => {
    env.router.post(`/query/:dbName/*`, async (req, res) => {
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
        const data = Transport.deserialize(req.body);
        if (typeof data !== "object" || typeof data.query !== "object" || typeof data.options !== "object") {
            return sendError(res, { code: "invalid_request", message: "Invalid query request" });
        }
        const query = data.query;
        const options = data.options;
        if (options.monitor === true) {
            options.monitor = { add: true, change: true, remove: true };
        }
        try {
            const { results, context, isMore } = (await env.db(dbName).storage.query(path, query, options));
            if (!env.settings.transactions?.log && context && context.database_cursor) {
                delete context.database_cursor;
            }
            const response = {
                count: results.length,
                list: results, // []
                isMore,
            };
            res.setHeader("DataBase-Context", JSON.stringify(context));
            res.send(Transport.serialize(response));
        }
        catch (err) {
            sendError(res, { code: "unknown", message: err?.message ?? String(err) });
        }
    });
};
export default addRoutes;
//# sourceMappingURL=query.js.map