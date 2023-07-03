"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const acebase_core_1 = require("acebase-core");
const error_1 = require("../shared/error.js");
const addRoute = (env) => {
    env.router.get(`/data/${env.db.name}/*`, async (req, res) => {
        // Request data
        const path = req.path.slice(env.db.name.length + 7);
        // Pre-check read access
        let access = await env.rules.isOperationAllowed(req.user, path, 'get');
        if (!access.allow) {
            return (0, error_1.sendUnauthorizedError)(res, access.code, access.message);
        }
        const options = {};
        if (req.query.include) {
            options.include = req.query.include.split(',');
        }
        if (req.query.exclude) {
            options.exclude = req.query.exclude.split(',');
        }
        if (typeof req.query.child_objects === 'boolean') {
            options.child_objects = req.query.child_objects;
        }
        if (path === '') {
            // If user has access to the root of database (NOT recommended for others than admin...)
            // Do not return private server data. If the admin user wants access, they should use
            // direct requests on those paths (GET /data/dbname/__auth__), or use reflection
            if (options.include) {
                // Remove all includes for private paths
                options.include = options.include.filter(path => !path.startsWith('__'));
            }
            // Add private paths to exclude
            options.exclude = [...options.exclude || [], '__auth__', '__log__'];
        }
        // Check 'get' access
        access = await env.rules.isOperationAllowed(req.user, path, 'get', { context: req.context, options });
        if (!access.allow) {
            return (0, error_1.sendUnauthorizedError)(res, access.code, access.message);
        }
        try {
            const { value, context } = await env.db.api.get(path, options);
            if (!env.config.transactions?.log) {
                delete context.acebase_cursor;
            }
            const serialized = acebase_core_1.Transport.serialize(value);
            res.setHeader('AceBase-Context', JSON.stringify(context));
            res.send({
                exists: value !== null,
                val: serialized.val,
                map: serialized.map,
            });
        }
        catch (err) {
            res.status(500).send(err);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-get.js.map