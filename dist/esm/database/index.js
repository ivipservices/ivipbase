import { DataBase as DataBaseCore, DebugLogger } from "ivipbase-core";
import { IvipBaseApp, getApp, getFirstApp, getAppsName } from "../app/index.js";
import { StorageDBServer } from "./StorageDBServer.js";
import { StorageDBClient } from "./StorageDBClient.js";
import { Subscriptions } from "./Subscriptions.js";
export class DataBase extends DataBaseCore {
    constructor(database, app, options) {
        super(database, options);
        this.database = database;
        this.app = app;
        this.subscriptions = new Subscriptions();
        this.name = database;
        this.description =
            ((Array.isArray(app.settings.database) ? app.settings.database : [app.settings.database]).find(({ name }) => {
                return name === database;
            }) ?? {
                name: database,
                description: app.settings.description ?? "iVipBase database",
            }).description ?? "iVipBase database";
        this.storage = app.isServer || !app.settings.isValidClient ? new StorageDBServer(this) : new StorageDBClient(this);
        this.debug = new DebugLogger(app.settings.logLevel, `[${database}]`);
        app.storage.on("add", (e) => {
            //console.log(e);
            this.subscriptions.triggerAllEvents(e.path, null, e.value);
        });
        app.storage.on("change", (e) => {
            //console.log(e);
            this.subscriptions.triggerAllEvents(e.path, e.previous, e.value);
        });
        app.storage.on("remove", (e) => {
            this.subscriptions.triggerAllEvents(e.path, e.value, null);
        });
        app.storage.ready(() => {
            this.emit("ready");
        });
    }
    connect(retry = true) {
        if (this.storage instanceof StorageDBClient) {
            return this.storage.connect(retry);
        }
        throw new Error("Method not implemented");
    }
    disconnect() {
        if (this.storage instanceof StorageDBClient) {
            return this.storage.disconnect();
        }
        throw new Error("Method not implemented");
    }
    async getInfo() {
        return await this.storage.getInfo();
    }
    async getPerformance() {
        const { data } = await this.storage.getInfo();
        return data ?? [];
    }
}
export function getDatabase(...args) {
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
    if (dbName && app.databases.has(dbName)) {
        return app.databases.get(dbName);
    }
    const db = new DataBase((Array.isArray(database) ? database : [database])[0], app, args.find((s) => typeof s === "object" && !(s instanceof IvipBaseApp)));
    app.databases.set(dbName, db);
    return db;
}
export function getDatabasesNames() {
    return Array.prototype.concat
        .apply([], getAppsName().map((name) => {
        const names = getApp(name).settings.dbname;
        return Array.isArray(names) ? names : [names];
    }))
        .filter((v, i, a) => a.indexOf(v) === i);
}
export function hasDatabase(database) {
    return getDatabasesNames().includes(database);
}
export class SchemaValidationError extends Error {
    constructor(reason) {
        super(`Schema validation failed: ${reason}`);
        this.reason = reason;
    }
}
//# sourceMappingURL=index.js.map