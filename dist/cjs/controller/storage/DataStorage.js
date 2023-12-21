"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStorage = exports.DataStorageSettings = void 0;
const CustomStorage_1 = require("./CustomStorage");
class DataStorageSettings extends CustomStorage_1.CustomStorageSettings {
    constructor(options = {}) {
        super(options);
    }
}
exports.DataStorageSettings = DataStorageSettings;
class DataStorage extends CustomStorage_1.CustomStorage {
    constructor(options = {}) {
        super(options);
        this.data = new Map();
        this.dbName = "TempStorage";
        this.ready = true;
    }
    async getMultiple(expression) {
        const list = [];
        this.data.forEach((content, path) => {
            if (expression.test(path)) {
                if (content) {
                    list.push({ path, content });
                }
            }
        });
        return list;
    }
    async setNode(path, content) {
        this.data.set(path, content);
    }
    async removeNode(path) {
        this.data.delete(path);
    }
}
exports.DataStorage = DataStorage;
//# sourceMappingURL=DataStorage.js.map