"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const error_1 = require("../../shared/error");
const fs_1 = __importDefault(require("fs"));
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
        const dirUpload = path.join(env.settings.localPath, `./${dbName}/storage-uploads`);
        if (!fs_1.default.existsSync(dirUpload)) {
            fs_1.default.mkdirSync(dirUpload);
        }
        try {
            const ref = env.db(dbName).ref(`__storage__`).child(path);
            const snapshot = await ref.get();
            if (snapshot.exists()) {
                const { path: _path } = snapshot.val();
                if (typeof _path === "string") {
                    const storage_path = path.resolve(env.settings.localPath, `./${dbName}`, _path);
                    if (fs_1.default.existsSync(storage_path)) {
                        fs_1.default.unlinkSync(storage_path);
                    }
                }
                await ref.remove();
            }
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