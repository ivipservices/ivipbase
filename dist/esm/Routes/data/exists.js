"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const Errors_1 = require("../../lib/Errors.js");
const addRoute = (env) => {
    env.router.get(`/exists/${env.db.name}/*`, async (req, res) => {
        // Exists query
        const path = req.path.slice(env.db.name.length + 9);
        const access = await env.rules.isOperationAllowed(req.user, path, "exists", { context: req.context });
        if (!access.allow) {
            return (0, Errors_1.sendUnauthorizedError)(res, access.code, access.message);
        }
        try {
            const exists = await env.db.ref(path).exists();
            res.send({ exists });
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=exists.js.map