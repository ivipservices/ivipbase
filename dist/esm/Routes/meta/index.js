"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const info_1 = require("./info.js");
const ping_1 = require("./ping.js");
const stats_1 = require("./stats.js");
const logs_1 = require("./logs.js");
const addRoutes = (env) => {
    // Add info endpoint
    (0, info_1.default)(env);
    // Add ping endpoint
    (0, ping_1.default)(env);
    // Add database stats endpoint
    (0, stats_1.default)(env);
    // Add logs endpoint (admin only)
    (0, logs_1.default)(env);
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=index.js.map