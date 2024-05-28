"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const error_1 = require("../../shared/error");
const addRoutes = (env) => {
    env.router.post(`/auth/:dbName/signout`, async (req, res) => {
        var _a, _b, _c, _d;
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const LOG_ACTION = "auth.signout";
        const LOG_DETAILS = { ip: req.ip, uid: (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : null };
        try {
            if (req.user) {
                const client = typeof req.body.client_id === "string" ? env.clients.get(req.body.client_id) : null;
                if (client) {
                    client.user.delete(dbName);
                }
                const signOutEverywhere = typeof req.body === "object" && req.body.everywhere === true;
                if (signOutEverywhere) {
                    env.authCache.remove((_c = req.user.uid) !== null && _c !== void 0 ? _c : "");
                    for (const client of env.clients.values()) {
                        if (((_d = client.user.get(dbName)) === null || _d === void 0 ? void 0 : _d.uid) === req.user.uid) {
                            client.user.delete(dbName);
                        }
                    }
                }
                // Remove token from user's auth node
                await env
                    .authRef(dbName)
                    .child(req.user.uid)
                    .transaction((snap) => {
                    if (!snap.exists()) {
                        return;
                    }
                    const user = snap.val();
                    if (signOutEverywhere) {
                        user.access_token = null;
                    }
                    user.last_signout = new Date();
                    user.last_signout_ip = req.ip;
                    return user;
                });
                // env.log.event(LOG_ACTION, LOG_DETAILS);
            }
            res.send("Bye!");
        }
        catch (err) {
            env.log.error(LOG_ACTION, "unexpected", Object.assign(Object.assign({}, LOG_DETAILS), { message: err instanceof Error ? err.message : err.toString() }));
            (0, error_1.sendUnexpectedError)(res, err);
        }
    });
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=signout.js.map