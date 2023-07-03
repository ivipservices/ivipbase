"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const admin_only_1 = require("../middleware/admin-only.js");
const error_1 = require("../shared/error.js");
const addRoute = (env) => {
    env.router.post(`/schema/${env.db.name}`, (0, admin_only_1.default)(env), async (req, res) => {
        // defines a schema
        try {
            const data = req.body;
            const { path, schema, warnOnly = false } = data;
            await env.db.schema.set(path, schema, warnOnly);
            res.contentType('application/json').send({ success: true });
        }
        catch (err) {
            (0, error_1.sendError)(res, err);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-schema-set.js.map