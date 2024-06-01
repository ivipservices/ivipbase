"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const utils_1 = require("../../../utils");
const error_1 = require("../../shared/error");
const fs_1 = __importDefault(require("fs"));
const data_urls_1 = __importDefault(require("data-urls"));
const addRoute = (env) => {
    env.router.put(`/storage/:dbName/*`, async (req, res) => {
        var _a;
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
            }
            let extensionFile = (0, utils_1.getExtension)(req.params[0]) || "";
            let mimetype = "application/octet-binary";
            if (typeof extensionFile === "string" && extensionFile.trim() !== "") {
                mimetype = utils_1.Mime.getType(req.params[0]);
            }
            let file = {
                filename: `file-${Date.now()}`,
                mimetype: mimetype,
                size: 0,
            };
            if (typeof req.body.format === "string" && ["base64", "base64url", "text", "raw", "data_url"].includes(req.body.format)) {
                let format = req.body.format, dataUrl = "";
                mimetype = typeof req.body.contentType === "string" && utils_1.Mime.getExtension(req.body.contentType) ? req.body.contentType : mimetype;
                switch (format) {
                    case "base64":
                    case "base64url":
                    case "raw":
                        dataUrl = `data:${mimetype};${format},`;
                        break;
                    case "text":
                        dataUrl = `data:text/plain;text,`;
                        break;
                }
                dataUrl += req.body.data;
                const body = (_a = (0, data_urls_1.default)(dataUrl)) === null || _a === void 0 ? void 0 : _a.body;
                if (!body) {
                    return (0, error_1.sendError)(res, {
                        code: "storage/unknown",
                        message: "Invalid request",
                    });
                }
                const data = Buffer.from(body);
                file = Object.assign(Object.assign({}, file), { mimetype: mimetype, size: data.length });
                fs_1.default.appendFileSync(path.resolve(dirUpload, file.filename), data);
            }
            else if (req.body.file) {
                const stats = fs_1.default.statSync(req.body.file.path);
                file = Object.assign(Object.assign({}, file), { size: stats.size });
                const rs = fs_1.default.createReadStream(req.body.file.path);
                const ws = fs_1.default.createWriteStream(path.resolve(dirUpload, file.filename));
                rs.pipe(ws);
            }
            else {
                return (0, error_1.sendError)(res, {
                    code: "storage/unknown",
                    message: "Invalid request",
                });
            }
            const storage = {
                path: `storage-uploads/${file.filename}`,
                isFile: true,
                metadata: {
                    contentType: mimetype,
                    size: file.size,
                },
            };
            await ref.set(storage);
            res.send({ message: "Upload storage successfully." });
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=put.js.map