"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const admin_only_1 = require("../../Middleware/admin-only.js");
const Errors_1 = require("../../lib/Errors.js");
const addRoute = (env) => {
    env.router.post(`/schema/${env.db.name}`, (0, admin_only_1.default)(env), async (req, res) => {
        // defines a schema
        try {
            const data = req.body;
            const { path, schema, warnOnly = false } = data;
            await env.db.schema.set(path, schema, warnOnly);
            res.contentType("application/json").send({ success: true });
        }
        catch (err) {
            (0, Errors_1.sendError)(res, err);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=schema-set.js.map