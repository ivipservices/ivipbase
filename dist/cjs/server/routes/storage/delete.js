"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const error_1 = require("../../shared/error");
const addRoute = (env) => {
    env.router.delete(`/storage/:dbName/*`, async (req, res) => {
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const path = req.params["0"];
        if (!req.user) {
            return (0, error_1.sendUnauthorizedError)(res, "storage/unauthorized", "Você deve estar logado para acessar este recurso");
        }
        try {
            const storage = env.storageFile(dbName);
            await storage.delete(path);
            res.send({ message: "Storage removed successfully." });
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=delete.js.map