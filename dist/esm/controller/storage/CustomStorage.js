import { ERROR_FACTORY } from "../erros/index.js";
import MDE, { MDESettings } from "./MDE/index.js";
export class CustomStorageSettings extends MDESettings {
    constructor(options = {}) {
        super(options);
    }
}
export class CustomStorage extends MDE {
    constructor(options = {}) {
        super({
            ...options,
            getMultiple: (e) => {
                if (!this.ready) {
                    throw ERROR_FACTORY.create("db-disconnected" /* AppError.DB_DISCONNECTED */, { dbName: this.dbName });
                }
                return this.getMultiple(e);
            },
            setNode: (path, content, node) => {
                if (!this.ready) {
                    throw ERROR_FACTORY.create("db-disconnected" /* AppError.DB_DISCONNECTED */, { dbName: this.dbName });
                }
                return this.setNode(path, content, node);
            },
            removeNode: (path, content, node) => {
                if (!this.ready) {
                    throw ERROR_FACTORY.create("db-disconnected" /* AppError.DB_DISCONNECTED */, { dbName: this.dbName });
                }
                return this.removeNode(path, content, node);
            },
        });
        this.dbName = "CustomStorage";
        this.ready = false;
    }
}
//# sourceMappingURL=CustomStorage.js.map