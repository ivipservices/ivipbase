"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const error_1 = require("../../shared/error");
const addRoutes = (env) => {
    env.router.post(`/query/:dbName/*`, async (req, res) => {
        var _a, _b, _c;
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        try {
            const path = req.params["0"];
            const access = await env.rules(dbName).isOperationAllowed((_a = req.user) !== null && _a !== void 0 ? _a : {}, path, "exists", { context: req.context });
            if (!access.allow) {
                return (0, error_1.sendUnauthorizedError)(res, access.code, access.message);
            }
            const data = ivipbase_core_1.Transport.deserialize(req.body);
            if (typeof data !== "object" || typeof data.query !== "object" || typeof data.options !== "object") {
                return (0, error_1.sendError)(res, { code: "invalid_request", message: "Invalid query request" });
            }
            const query = data.query;
            const options = data.options;
            if (options.monitor === true) {
                options.monitor = { add: true, change: true, remove: true };
            }
            const { results, context, isMore } = (await env.db(dbName).storage.query(path, query, options));
            if (!((_b = env.settings.transactions) === null || _b === void 0 ? void 0 : _b.log) && context && context.database_cursor) {
                delete context.database_cursor;
            }
            const response = {
                count: results.length,
                list: results, // []
                isMore,
            };
            res.setHeader("DataBase-Context", JSON.stringify(context));
            res.send(ivipbase_core_1.Transport.serialize(response));
        }
        catch (err) {
            (0, error_1.sendError)(res, { code: "unknown", message: (_c = err === null || err === void 0 ? void 0 : err.message) !== null && _c !== void 0 ? _c : String(err) });
        }
    });
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=query.js.map