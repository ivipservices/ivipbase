"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const admin_only_1 = require("../middleware/admin-only.js");
const error_1 = require("../shared/error.js");
const addRoute = (env) => {
    const handleRequest = async (req, res) => {
        try {
            const data = req.body;
            await env.db.indexes.create(data.path, data.key, data.options);
            res.contentType('application/json').send({ success: true });
        }
        catch (err) {
            env.debug.error(`failed to perform index action`, err);
            (0, error_1.sendError)(res, err);
        }
    };
    env.router.post(`/index/${env.db.name}`, (0, admin_only_1.default)(env), async (req, res) => {
        // Legacy endpoint that was designed to handle multiple actions
        // The only action ever implemented was 'create', so we'll handle that here
        if (req.body?.action !== 'create') {
            return (0, error_1.sendError)(res, { code: 'invalid_action', message: 'Invalid action' });
        }
        handleRequest(req, res);
    });
    env.router.post(`/index/${env.db.name}/create`, (0, admin_only_1.default)(env), async (req, res) => {
        // New dedicated create endpoint
        handleRequest(req, res);
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-index-create.js.map