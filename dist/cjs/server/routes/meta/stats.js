"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const addRoute = (env) => {
    env.router.get(`/stats/:dbName`, async (req, res) => {
        // Get database stats
        try {
            const stats = (await env.db(req.params["dbName"]).storage.stats());
            res.send(stats);
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err.message);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=stats.js.map