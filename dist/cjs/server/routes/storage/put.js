"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const error_1 = require("../../shared/error");
const fs_1 = __importDefault(require("fs"));
const raw_body_1 = __importDefault(require("raw-body"));
const addRoute = (env) => {
    env.router.put(`/storage/:dbName/*`, async (req, res) => {
        var _a, _b, _c;
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const path = req.params[0];
        if (!req.user) {
            return (0, error_1.sendUnauthorizedError)(res, "storage/unauthorized", "Você deve estar logado para acessar este recurso");
        }
        const data = await new Promise((resolve, reject) => (0, raw_body_1.default)(req, async (err, body) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(body);
            }
        }));
        const format = (_a = req.query.format) !== null && _a !== void 0 ? _a : req.body.format;
        const contentType = (_b = req.query.contentType) !== null && _b !== void 0 ? _b : req.body.contentType;
        try {
            const storage = env.storageFile(dbName);
            if (typeof format === "string" && ["base64", "base64url", "text", "raw", "data_url"].includes(format)) {
                const p = await storage.putString(path, (_c = req.body.data) !== null && _c !== void 0 ? _c : "", format);
                return res.send(p);
            }
            else if (req.body.file && typeof req.body.file.path === "string") {
                const tempData = await new Promise((resolve, reject) => {
                    fs_1.default.readFile(req.body.file.path, (err, data) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve(data);
                        }
                    });
                });
                const p = await storage.put(path, tempData, contentType ? { contentType: contentType } : undefined);
                return res.send(p);
            }
            else if (data instanceof Buffer) {
                const p = await storage.put(path, data, contentType ? { contentType: contentType } : undefined);
                return res.send(p);
            }
            else {
                return (0, error_1.sendError)(res, {
                    code: "storage/unknown",
                    message: "Invalid request",
                });
            }
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