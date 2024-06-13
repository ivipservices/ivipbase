"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageClient = void 0;
const StorageReference_1 = require("./StorageReference");
class StorageClient {
    constructor(storage) {
        this.storage = storage;
    }
    async put(ref, data, metadata, onStateChanged) {
        return await this.storage.app.request({
            route: `/storage/${this.storage.database.name}/${ref.fullPath}` + ((metadata === null || metadata === void 0 ? void 0 : metadata.contentType) ? `?contentType=${metadata.contentType}` : ""),
            data,
            method: "PUT",
            onUploadProgress: onStateChanged
                ? (progressEvent) => {
                    onStateChanged({
                        bytesTransferred: progressEvent.loaded,
                        totalBytes: progressEvent.total,
                        state: "running",
                        metadata: metadata,
                        task: "put",
                        ref: ref,
                    });
                }
                : undefined,
        });
    }
    async putString(ref, data, type, onStateChanged) {
        return await this.storage.app.request({
            route: `/storage/${this.storage.database.name}/${ref.fullPath}?format=${type !== null && type !== void 0 ? type : "text"}`,
            data: {
                format: type !== null && type !== void 0 ? type : "text",
                data,
            },
            method: "PUT",
            onUploadProgress: onStateChanged
                ? (progressEvent) => {
                    onStateChanged({
                        bytesTransferred: progressEvent.loaded,
                        totalBytes: progressEvent.total,
                        state: "running",
                        metadata: undefined,
                        task: "put",
                        ref: ref,
                    });
                }
                : undefined,
        });
    }
    async delete(ref) {
        await this.storage.app.request({
            route: `/storage/${this.storage.database.name}/${ref.fullPath}`,
            method: "DELETE",
        });
        return Promise.resolve();
    }
    async getDownloadURL(ref) {
        const { path, isFile } = await this.storage.app.request({
            method: "GET",
            route: `storage-url/${this.storage.database.name}/${ref.fullPath}`,
        });
        return typeof path === "string" && isFile ? `${this.storage.app.url}/${path.replace(/^\/+/, "")}` : null;
    }
    async listAll(ref) {
        const { items, prefixes, } = await this.storage.app.request({
            method: "GET",
            route: `storage-list/${this.storage.database.name}/${ref.fullPath}`,
        });
        return {
            items: items.map((path) => {
                return new StorageReference_1.StorageReference(this.storage, path);
            }),
            prefixes: prefixes.map((path) => {
                return new StorageReference_1.StorageReference(this.storage, path);
            }),
        };
    }
    async list(ref, config) {
        const { items, prefixes, more, page, } = await this.storage.app.request({
            method: "GET",
            route: `storage-list/${this.storage.database.name}/${ref.fullPath}`,
            data: config,
        });
        return {
            more,
            page,
            items: items.map((path) => {
                return new StorageReference_1.StorageReference(this.storage, path);
            }),
            prefixes: prefixes.map((path) => {
                return new StorageReference_1.StorageReference(this.storage, path);
            }),
        };
    }
}
exports.StorageClient = StorageClient;
//# sourceMappingURL=StorageClient.js.map