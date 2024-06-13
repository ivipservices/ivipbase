"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStorage = exports.Storage = void 0;
const app_1 = require("../app");
const database_1 = require("../database");
const StorageClient_1 = require("./StorageClient");
const StorageReference_1 = require("./StorageReference");
const StorageServer_1 = require("./StorageServer");
class Storage {
    constructor(app, database) {
        this.app = app;
        this.database = database;
        this.api = app.isServer ? new StorageServer_1.StorageServer(this) : new StorageClient_1.StorageClient(this);
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