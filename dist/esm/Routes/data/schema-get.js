"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const admin_only_1 = require("../../Middleware/admin-only.js");
const Errors_1 = require("../../lib/Errors.js");
const addRoute = (env) => {
    env.router.get(`/schema/${env.db.name}/*`, (0, admin_only_1.default)(env), async (req, res) => {
        // Get defined schema for a specifc path
        try {
            const path = req.path.slice(env.db.name.length + 9);
            const schema = await env.db.schema.get(path);
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
            (0, Errors_1.sendError)(res, err);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=schema-get.js.map