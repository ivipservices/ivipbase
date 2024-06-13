"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const error_1 = require("../../shared/error");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const addRoute = (env) => {
    env.router.get(`/storage/:dbName/*`, async (req, res) => {
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const dirUpload = path_1.default.join(env.settings.localPath, `./${dbName}/storage-uploads`);
        if (!fs_1.default.existsSync(dirUpload)) {
            fs_1.default.mkdirSync(dirUpload);
        }
        try {
            const ref = env.db(dbName).ref(`__storage__`).child(req.params["0"]);
            let { path: _path, isFile, metadata, } = await ref
                .get()
                .then((snap) => {
                var _a;
                return Promise.resolve((_a = snap.val()) !== null && _a !== void 0 ? _a : {
                    path: null,
                });
            })
                .catch(() => Promise.resolve({
                path: null,
            }));
            isFile = typeof isFile === "boolean" ? isFile : typeof metadata === "object" && (metadata === null || metadata === void 0 ? void 0 : metadata.contentType) ? true : false;
            if (typeof _path === "string" && isFile) {
                const storage_path = path_1.default.resolve(env.settings.localPath, `./${dbName}`, _path);
                if (fs_1.default.existsSync(storage_path)) {
                    res.type(metadata.contentType);
                    return res.sendFile(_path, { root: path_1.default.resolve(env.settings.localPath, `./${dbName}`) });
                }
                else {
                    await ref.remove();
                }
            }
            else if (!isFile) {
                return (0, error_1.sendError)(res, {
                    code: "storage/unknown",
                    message: "Is not a file!",
                });
            }
            return (0, error_1.sendError)(res, {
                code: "storage/unknown",
                message: "File not found!",
            });
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=get.js.map