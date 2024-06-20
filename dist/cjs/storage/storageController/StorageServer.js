"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageServer = void 0;
const StorageReference_1 = require("../StorageReference");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const utils_1 = require("../../utils");
const file_type_1 = require("../../controller/file-type");
class StorageServer {
    constructor(storage) {
        this.storage = storage;
    }
    async put(p, data, metadata, onStateChanged) {
        var _a, _b, _c;
        const ref = p instanceof StorageReference_1.StorageReference ? p : new StorageReference_1.StorageReference(this.storage, p);
        const localPath = (_b = (_a = this.storage.app.settings.server) === null || _a === void 0 ? void 0 : _a.localPath) !== null && _b !== void 0 ? _b : "./data";
        const dbName = this.storage.database.name;
        const dataBuffer = Buffer.from(data);
        const dirUpload = path_1.default.resolve(localPath, `./${dbName}/storage-uploads`);
        if (!fs_1.default.existsSync(dirUpload)) {
            fs_1.default.mkdirSync(dirUpload, { recursive: true });
        }
        const db_ref = this.storage.database.ref(`__storage__`).child(ref.fullPath);
        const snapshot = await db_ref.get();
        if (snapshot.exists()) {
            await this.delete(ref);
        }
        let extensionFile = (0, utils_1.getExtension)(ref.fullPath) || "";
        let mimetype = (_c = metadata === null || metadata === void 0 ? void 0 : metadata.contentType) !== null && _c !== void 0 ? _c : "application/octet-binary";
        if (!(metadata === null || metadata === void 0 ? void 0 : metadata.contentType)) {
            const type = await (0, file_type_1.fileTypeFromBuffer)(dataBuffer);
            if (type === null || type === void 0 ? void 0 : type.mime) {
                mimetype = type.mime;
            }
            else if (!type && typeof extensionFile === "string" && extensionFile.trim() !== "") {
                mimetype = utils_1.Mime.getType(ref.fullPath);
            }
            else {
                mimetype = "application/octet-binary";
            }
        }
        let file = {
            filename: `file-${Date.now()}`,
            mimetype: mimetype,
            size: dataBuffer.length,
        };
        await new Promise((resolve, reject) => {
            const stream = fs_1.default.createWriteStream(path_1.default.resolve(dirUpload, file.filename));
            const chunkSize = 1024 * 1024; // 1MB
            const writeNextChunk = (start) => {
                const end = Math.min(start + chunkSize, dataBuffer.length);
                // const chunk = Buffer.from(dataBuffer.buffer, start, end - start);
                const chunk = dataBuffer.slice(start, end);
                stream.write(chunk);
                if (onStateChanged) {
                    onStateChanged({
                        bytesTransferred: end,
                        totalBytes: dataBuffer.length,
                        state: "completed",
                        metadata: {},
                        task: "write",
                        ref,
                    });
                }
                if (end < dataBuffer.length) {
                    setTimeout(() => {
                        writeNextChunk(end);
                    }, 10);
                }
                else {
                    stream.end();
                }
            };
            stream.once("open", () => {
                writeNextChunk(0);
            });
            stream.once("close", () => {
                if (onStateChanged) {
                    onStateChanged({
                        bytesTransferred: dataBuffer.length,
                        totalBytes: dataBuffer.length,
                        state: "completed",
                        metadata: {},
                        task: "write",
                        ref,
                    });
                }
                resolve();
            });
            stream.once("error", (err) => {
                console.error("Erro ao escrever no arquivo:", err);
                if (onStateChanged) {
                    onStateChanged({
                        bytesTransferred: 0,
                        totalBytes: dataBuffer.length,
                        state: "error",
                        metadata: {},
                        task: "write",
                        ref,
                    });
                }
                reject(err);
            });
        });
        // fs.writeFileSync(path.resolve(dirUpload, file.filename), dataBuffer);
        const storage = {
            path: `storage-uploads/${file.filename}`,
            isFile: true,
            metadata: {
                contentType: mimetype,
                size: file.size,
            },
        };
        await db_ref.set(storage);
        return Promise.resolve(ref.fullPath);
    }
    putString(p, data, type, onStateChanged) {
        const ref = p instanceof StorageReference_1.StorageReference ? p : new StorageReference_1.StorageReference(this.storage, p);
        if (type === "data_url") {
            const [_, base64] = data.split(",");
            data = base64;
            type = "base64";
        }
        else if (type === "base64url") {
            data = data.replace(/-/g, "+").replace(/_/g, "/");
            type = "base64";
        }
        const dataBuffer = Buffer.from(data, type === "base64" ? "base64" : "utf-8");
        return this.put(ref, dataBuffer, undefined, onStateChanged);
    }
    async delete(p) {
        var _a, _b;
        const ref = p instanceof StorageReference_1.StorageReference ? p : new StorageReference_1.StorageReference(this.storage, p);
        const localPath = (_b = (_a = this.storage.app.settings.server) === null || _a === void 0 ? void 0 : _a.localPath) !== null && _b !== void 0 ? _b : "./data";
        const dbName = this.storage.database.name;
        const dirUpload = path_1.default.resolve(localPath, `./${dbName}/storage-uploads`);
        if (!fs_1.default.existsSync(dirUpload)) {
            fs_1.default.mkdirSync(dirUpload, { recursive: true });
        }
        const db_ref = this.storage.database.ref(`__storage__`).child(ref.fullPath);
        const snapshot = await db_ref.get();
        if (snapshot.exists()) {
            const getAllFiles = (data, list) => {
                let { path: _path, isFile, metadata } = data;
                isFile = typeof isFile === "boolean" ? isFile : typeof metadata === "object" && (metadata === null || metadata === void 0 ? void 0 : metadata.contentType) ? true : false;
                if (typeof _path === "string" && isFile) {
                    list.push(_path);
                }
                else {
                    for (const key in data) {
                        if (typeof data[key] === "object") {
                            getAllFiles(data[key], list);
                        }
                    }
                }
                return list;
            };
            const listFiles = getAllFiles(snapshot.val(), []);
            for (const filePath of listFiles) {
                const storage_path = path_1.default.resolve(localPath, `./${dbName}`, filePath);
                if (fs_1.default.existsSync(storage_path)) {
                    fs_1.default.unlinkSync(storage_path);
                }
            }
            await db_ref.remove();
        }
        return Promise.resolve();
    }
    async getDownloadURL(p) {
        var _a, _b;
        const ref = p instanceof StorageReference_1.StorageReference ? p : new StorageReference_1.StorageReference(this.storage, p);
        const localPath = (_b = (_a = this.storage.app.settings.server) === null || _a === void 0 ? void 0 : _a.localPath) !== null && _b !== void 0 ? _b : "./data";
        const dbName = this.storage.database.name;
        let { path: _path, isFile, metadata, } = await this.storage.database
            .ref(`__storage__`)
            .child(ref.fullPath)
            .get({
            include: ["path", "isFile", "metadata", "metadata/contentType"],
        })
            .then((snap) => {
            var _a;
            return Promise.resolve((_a = snap.val()) !== null && _a !== void 0 ? _a : {
                path: null,
                isFile: false,
            });
        })
            .catch(() => Promise.resolve({
            path: null,
            isFile: false,
        }));
        isFile = typeof isFile === "boolean" ? isFile : typeof metadata === "object" && (metadata === null || metadata === void 0 ? void 0 : metadata.contentType) ? true : false;
        if (isFile) {
            const storage_path = path_1.default.resolve(localPath, `./${dbName}`, _path);
            if (!fs_1.default.existsSync(storage_path)) {
                await this.delete(ref);
                return null;
            }
        }
        return typeof _path === "string" && isFile ? `${this.storage.app.url}/storage/${this.storage.database.name}/${ref.fullPath}` : null;
    }
    async listAll(path) {
        const ref = path instanceof StorageReference_1.StorageReference ? path : new StorageReference_1.StorageReference(this.storage, path);
        const snaps = await this.storage.database.query(`__storage__/${ref.fullPath}`).get({
            include: ["path", "isFile", "metadata", "metadata/contentType"],
        });
        const items = [];
        const prefixes = [];
        snaps.forEach((snap) => {
            let { path, isFile, metadata } = snap.val();
            isFile = typeof isFile === "boolean" ? isFile : typeof metadata === "object" && (metadata === null || metadata === void 0 ? void 0 : metadata.contentType) ? true : false;
            if (typeof path === "string" && isFile) {
                items.push(snap.ref.path.replace(/^__storage__\//gi, "").replace(ref.fullPath, ""));
            }
            else {
                prefixes.push(path.ref.path.replace(/^__storage__\//gi, "").replace(ref.fullPath, ""));
            }
        });
        return {
            items: items
                .sort((a, b) => {
                return String(a).localeCompare(b);
            })
                .map((child) => {
                return ref.child(child);
            }),
            prefixes: prefixes
                .sort((a, b) => {
                return String(a).localeCompare(b);
            })
                .map((child) => {
                return ref.child(child);
            }),
        };
    }
    async list(path, config) {
        var _a, _b, _c;
        const ref = path instanceof StorageReference_1.StorageReference ? path : new StorageReference_1.StorageReference(this.storage, path);
        const maxResults = (_a = config.maxResults) !== null && _a !== void 0 ? _a : 10;
        const skip = ((_b = config.page) !== null && _b !== void 0 ? _b : 0) * maxResults;
        const { items, prefixes } = await this.listAll(ref);
        const length = items.length + prefixes.length;
        return {
            more: length > maxResults + skip,
            page: (_c = config.page) !== null && _c !== void 0 ? _c : 0,
            items: items.filter((_, i) => {
                const index = i + prefixes.length;
                return index >= skip && index < maxResults + skip;
            }),
            prefixes: prefixes.filter((_, index) => {
                return index >= skip && index < maxResults + skip;
            }),
        };
    }
}
exports.StorageServer = StorageServer;
//# sourceMappingURL=StorageServer.js.map