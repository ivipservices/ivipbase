import { Utils } from "ivipbase-core";
import { ERROR_FACTORY } from "../erros/index.js";
import { CustomStorage, CustomStorageSettings } from "./CustomStorage.js";
export class DataStorageSettings extends CustomStorageSettings {
    constructor(options = {}) {
        super(options);
    }
}
export class DataStorage extends CustomStorage {
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
    async getMultiple(database, { regex }) {
        if (!this.data[database]) {
            throw ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
        }
        const list = [];
        this.data[database].forEach((content, path) => {
            if (regex.test(path)) {
                if (content) {
                    list.push(Utils.cloneObject({ path, content }));
                }
            }
        });
        return list;
    }
    async setNode(database, path, content) {
        if (!this.data[database]) {
            throw ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
        }
        this.data[database].set(path, content);
    }
    async removeNode(database, path) {
        if (!this.data[database]) {
            throw ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
        }
        this.data[database].delete(path);
    }
}
//# sourceMappingURL=DataStorage.js.map