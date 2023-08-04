"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const admin_only_1 = require("../../Middleware/admin-only.js");
const Errors_1 = require("../../lib/Errors.js");
const addRoute = (env) => {
    env.router.get(`/index/${env.db.name}`, (0, admin_only_1.default)(env), async (req, res) => {
        // Get all indexes
        try {
            const indexes = await env.db.indexes.get();
            res.contentType("application/json").send(indexes.map((index) => {
                const { path, key, caseSensitive, textLocale, includeKeys, indexMetadataKeys, type, fileName, description } = index;
                return { path, key, caseSensitive, textLocale, includeKeys, indexMetadataKeys, type, fileName, description };
            }));
        }
        catch (err) {
            (0, Errors_1.sendError)(res, err);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=index-list.js.map