import { SimpleEventEmitter } from "ivipbase-core";
import { IvipBaseApp, getApp, getAppsName, getFirstApp } from "../app/index.js";
import { hasDatabase } from "../database/index.js";
import { StorageReference } from "./StorageReference.js";
import { StorageClient, StorageServer } from "./storageController/index.js";
export class Storage extends SimpleEventEmitter {
    constructor(app, database) {
        super();
        this.app = app;
        this.database = database;
        this._ready = false;
        this.api = app.isServer ? new StorageServer(this) : new StorageClient(this);
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
        callback?.(this);
    }
    root() {
        return new StorageReference(this, "");
    }
    /**
     * Creates a reference to a node
     * @param path
     * @returns reference to the requested node
     */
    ref(path) {
        return new StorageReference(this, path);
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
export function getStorage(...args) {
    let app = args.find((a) => a instanceof IvipBaseApp), dbName;
    const appNames = getAppsName();
    if (!app) {
        const name = appNames.find((n) => args.includes(n));
        app = name ? getApp(name) : getFirstApp();
    }
    let database = args.find((d) => typeof d === "string" && appNames.includes(d) !== true);
    if (typeof database !== "string") {
        database = app.settings.dbname;
    }
    dbName = (Array.isArray(database) ? database : [database])[0];
    if (!hasDatabase(dbName)) {
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
//# sourceMappingURL=index.js.map