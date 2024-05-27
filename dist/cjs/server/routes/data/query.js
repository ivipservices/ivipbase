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
        let cancelSubscription;
        if (options.monitor === true) {
            options.monitor = { add: true, change: true, remove: true };
        }
        if (typeof options.monitor === "object" && (options.monitor.add || options.monitor.change || options.monitor.remove)) {
            const queryId = data.query_id;
            const clientId = data.client_id;
            const client = env.clients.get(`${dbName}_${clientId}`);
            if (client)
                client.realtimeQueries[queryId] = { path, query, options };
            const sendEvent = async (event) => {
                var _a;
                try {
                    const client = env.clients.get(`${dbName}_${clientId}`);
                    if (!client) {
                        return cancelSubscription === null || cancelSubscription === void 0 ? void 0 : cancelSubscription();
                    } // Not connected, stop subscription
                    if (!(await env.rules(dbName).isOperationAllowed((_a = client.user) !== null && _a !== void 0 ? _a : {}, event.path, "get", { context: req.context, value: event.value })).allow) {
                        return cancelSubscription === null || cancelSubscription === void 0 ? void 0 : cancelSubscription(); // Access denied, stop subscription
                    }
                    event.query_id = queryId;
                    const data = ivipbase_core_1.Transport.serialize(event);
                    client.socket.emit("query-event", data);
                }
                catch (err) {
                    env.debug.error(`Unexpected error orccured trying to send event`);
                    env.debug.error(err);
                }
            };
            options.eventHandler = (event) => {
                sendEvent(event);
            };
        }
        try {
            const { results, context, stop } = await env.db(dbName).storage.query(path, query, options);
            cancelSubscription = stop;
            if (!((_b = env.settings.transactions) === null || _b === void 0 ? void 0 : _b.log) && context && context.database_cursor) {
                delete context.database_cursor;
            }
            const response = {
                count: results.length,
                list: results, // []
            };
            res.setHeader("AceBase-Context", JSON.stringify(context));
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