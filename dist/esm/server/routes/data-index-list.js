"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const admin_only_1 = require("../middleware/admin-only.js");
const error_1 = require("../shared/error.js");
const addRoute = (env) => {
    env.router.get(`/index/${env.db.name}`, (0, admin_only_1.default)(env), async (req, res) => {
        // Get all indexes
        try {
            const indexes = await env.db.indexes.get();
            res.contentType('application/json').send(indexes.map(index => {
                const { path, key, caseSensitive, textLocale, includeKeys, indexMetadataKeys, type, fileName, description } = index;
                return { path, key, caseSensitive, textLocale, includeKeys, indexMetadataKeys, type, fileName, description };
            }));
        }
        catch (err) {
            (0, error_1.sendError)(res, err);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-index-list.js.map