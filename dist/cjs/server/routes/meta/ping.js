"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const addRoute = (env) => {
    env.router.get(`/ping/:dbName`, (req, res) => {
        // For simple connectivity check
        res.send("pong");
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=ping.js.map