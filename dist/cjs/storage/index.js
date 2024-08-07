"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStorage = exports.Storage = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const app_1 = require("../app");
const database_1 = require("../database");
const StorageReference_1 = require("./StorageReference");
const storageController_1 = require("./storageController");
class Storage extends ivipbase_core_1.SimpleEventEmitter {
    constructor(app, database) {
        super();
        this.app = app;
        this.database = database;
        this._ready = false;
        this.api = app.isServer ? new storageController_1.StorageServer(this) : new storageController_1.StorageClient(this);
        this.app.ready(() => {
            this._ready = true;
            this.emit("ready");
        });
    }
    async ready(callback) {
        if (!this._ready) {
            // Aguarda o evento ready
            await new Promise((resolve) => this.once("ready", resolve));
        }
        callback === null || callback === void 0 ? void 0 : callback(this);
    }
    root() {
        return new StorageReference_1.StorageReference(this, "");
    }
    /**
     * Creates a reference to a node
     * @param path
     * @returns reference to the requested node
     */
    ref(path) {
        return new StorageReference_1.StorageReference(this, path);
    }
    put(ref, data, metadata, onStateChanged) {
        return this.api.put(ref, data, metadata);
    }
    putString(ref, data, type, onStateChanged) {
        return this.api.putString(ref, data, type);
    }
    delete(ref) {
        return this.api.delete(ref);
    }
    getDownloadURL(ref) {
        return this.api.getDownloadURL(ref);
    }
    listAll(ref) {
        return this.api.listAll(ref);
    }
    list(ref, config) {
        return this.api.list(ref, config);
    }
}
exports.Storage = Storage;
function getStorage(...args) {
    let app = args.find((a) => a instanceof app_1.IvipBaseApp), dbName;
    const appNames = (0, app_1.getAppsName)();
    if (!app) {
        const name = appNames.find((n) => args.includes(n));
        app = name ? (0, app_1.getApp)(name) : (0, app_1.getFirstApp)();
    }
    let database = args.find((d) => typeof d === "string" && appNames.includes(d) !== true);
    if (typeof database !== "string") {
        database = app.settings.dbname;
    }
    dbName = (Array.isArray(database) ? database : [database])[0];
    if (!(0, database_1.hasDatabase)(dbName)) {
        throw new Error(`Database "${dbName}" does not exist`);
    }
    if (app.storageFile.has(dbName)) {
        return app.storageFile.get(dbName);
    }
    const db = app.databases.get(dbName);
    const storage = new Storage(app, db);
    app.storageFile.set(dbName, storage);
    return storage;
}
exports.getStorage = getStorage;
//# sourceMappingURL=index.js.map