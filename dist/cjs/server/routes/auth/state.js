"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const error_1 = require("../../shared/error");
const user_1 = require("../../schema/user");
const addRoutes = (env) => {
    env.router.get(`/auth/:dbName/state`, async (req, res) => {
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        if (req.user) {
            res.send({ signed_in: true, user: (0, user_1.getPublicAccountDetails)(req.user) });
        }
        else {
            res.send({ signed_in: false });
        }
    });
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=state.js.map