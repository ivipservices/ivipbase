import { DebugLogger } from "ivipbase-core";
import { ERROR_FACTORY } from "../erros/index.js";
import MDE, { MDESettings } from "./MDE/index.js";
export class CustomStorageSettings extends MDESettings {
    constructor(options = {}) {
        super(options);
    }
}
export class CustomStorage extends MDE {
    constructor(options = {}) {
        const { logLevel, ..._options } = options;
        super({
            ..._options,
            getMultiple: (database, e) => {
                if (!this.ready) {
                    throw ERROR_FACTORY.create("db-disconnected" /* AppError.DB_DISCONNECTED */, { dbName: this.dbName });
                }
                return this.getMultiple(database, e);
            },
            setNode: (database, path, content, node) => {
                if (!this.ready) {
                    throw ERROR_FACTORY.create("db-disconnected" /* AppError.DB_DISCONNECTED */, { dbName: this.dbName });
                }
                return this.setNode(database, path, content, node);
            },
            removeNode: (database, path, content, node) => {
                if (!this.ready) {
                    throw ERROR_FACTORY.create("db-disconnected" /* AppError.DB_DISCONNECTED */, { dbName: this.dbName });
                }
                return this.removeNode(database, path, content, node);
            },
        });
        this._dbName = "CustomStorage";
        this.logLevel = "log";
        this.logLevel = logLevel || "log";
        this._debug = new DebugLogger(this.logLevel, `[${this.dbName}]`);
    }
    get dbName() {
        return this._dbName;
    }
    set dbName(value) {
        this._dbName = value;
        this._debug = new DebugLogger(this.logLevel, `[${this._dbName}]`);
    }
    get debug() {
        return this._debug;
    }
}
//# sourceMappingURL=CustomStorage.js.map