"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageClient = exports.StorageServer = void 0;
const StorageClient_1 = require("./StorageClient");
Object.defineProperty(exports, "StorageClient", { enumerable: true, get: function () { return StorageClient_1.StorageClient; } });
class StorageServer extends StorageClient_1.StorageClient {
    constructor(storage) {
        super(storage);
        this.storage = storage;
    }
}
exports.StorageServer = StorageServer;
//# sourceMappingURL=browser.js.map