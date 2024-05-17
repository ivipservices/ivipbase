"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const error_1 = require("../../shared/error");
const addRoutes = (env) => {
    env.router.get(`/exists/:dbName/*`, async (req, res) => {
        var _a;
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
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=exists.js.map