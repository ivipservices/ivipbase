"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const acebase_core_1 = require("acebase-core");
const admin_only_1 = require("../middleware/admin-only.js");
const error_1 = require("../shared/error.js");
const addRoute = (env) => {
    env.router.post(`/schema/${env.db.name}/test`, (0, admin_only_1.default)(env), async (req, res) => {
        // tests a schema
        try {
            const data = req.body;
            if (typeof data.value?.val === 'undefined' || !['string', 'object', 'undefined'].includes(typeof data.value?.map)) {
                return (0, error_1.sendError)(res, { code: 'invalid_serialized_value', message: 'The sent value is not properly serialized' });
            }
            const value = acebase_core_1.Transport.deserialize(data.value);
            const { path, schema, partial } = data;
            let result;
            if (schema) {
                const definition = new acebase_core_1.SchemaDefinition(schema);
                result = definition.check(path, value, partial);
            }
            else {
                result = await env.db.schema.check(path, schema, partial);
            }
            res.contentType('application/json').send(result);
        }
        catch (err) {
            (0, error_1.sendError)(res, err);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-schema-test.js.map