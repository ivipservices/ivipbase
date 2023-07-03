"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const admin_only_1 = require("../middleware/admin-only.js");
const error_1 = require("../shared/error.js");
const addRoute = (env) => {
    env.router.post(`/index/${env.db.name}/delete`, (0, admin_only_1.default)(env), async (req, res) => {
        // Delete an index
        try {
            const data = req.body;
            if (!data.fileName) {
                throw new Error('fileName not given');
            }
            await env.db.indexes.delete(data.fileName); // Requires newer acebase & acebase-core packages
            res.contentType('application/json').send({ success: true });
        }
        catch (err) {
            env.debug.error(`failed to perform index action`, err);
            (0, error_1.sendError)(res, err);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-index-delete.js.map