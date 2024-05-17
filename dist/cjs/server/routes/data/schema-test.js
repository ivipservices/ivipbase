"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const admin_only_1 = __importDefault(require("../../middleware/admin-only"));
const error_1 = require("../../shared/error");
const ivipbase_core_1 = require("ivipbase-core");
const addRoutes = (env) => {
    env.router.post(`/schema/:dbName/test`, (0, admin_only_1.default)(env), async (req, res) => {
        var _a, _b;
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        try {
            const data = req.body;
            if (typeof ((_a = data.value) === null || _a === void 0 ? void 0 : _a.val) === "undefined" || !["string", "object", "undefined"].includes(typeof ((_b = data.value) === null || _b === void 0 ? void 0 : _b.map))) {
                return (0, error_1.sendError)(res, { code: "invalid_serialized_value", message: "The sent value is not properly serialized" });
            }
            const value = ivipbase_core_1.Transport.deserialize(data.value);
            const { path, schema, partial } = data;
            if (!path) {
                return (0, error_1.sendError)(res, { code: "missing_path", message: "Path is required" });
            }
            let result;
            if (schema) {
                const definition = new ivipbase_core_1.SchemaDefinition(schema);
                result = definition.check(path, value, partial);
            }
            else {
                result = await env.db(dbName).schema.check(path, schema, partial);
            }
            res.contentType("application/json").send(result);
        }
        catch (err) {
            (0, error_1.sendError)(res, err);
        }
    });
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=schema-test.js.map