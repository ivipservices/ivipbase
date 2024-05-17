"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStorage = exports.DataStorageSettings = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const erros_1 = require("../erros");
const CustomStorage_1 = require("./CustomStorage");
class DataStorageSettings extends CustomStorage_1.CustomStorageSettings {
    constructor(options = {}) {
        super(options);
    }
}
exports.DataStorageSettings = DataStorageSettings;
class DataStorage extends CustomStorage_1.CustomStorage {
    constructor(database, options = {}) {
        super(options);
        this.data = {};
        this.dbName = "TempStorage";
        (Array.isArray(database) ? database : [database])
            .filter((name) => typeof name === "string" && name.trim() !== "")
            .forEach((name) => {
            this.data[name] = new Map();
        });
        this.emit("ready");
    }
    async getMultiple(database, expression) {
        if (!this.data[database]) {
            throw erros_1.ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
        }
        const list = [];
        this.data[database].forEach((content, path) => {
            if (expression.test(path)) {
                if (content) {
                    list.push(ivipbase_core_1.Utils.cloneObject({ path, content }));
                }
            }
        });
        return list;
    }
    async setNode(database, path, content) {
        if (!this.data[database]) {
            throw erros_1.ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
        }
        this.data[database].set(path, content);
    }
    async removeNode(database, path) {
        if (!this.data[database]) {
            throw erros_1.ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
        }
        this.data[database].delete(path);
    }
}
exports.DataStorage = DataStorage;
//# sourceMappingURL=DataStorage.js.map