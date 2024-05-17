"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaValidationError = exports.hasDatabase = exports.getDatabasesNames = exports.getDatabase = exports.DataBase = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const app_1 = require("../app");
const StorageDBServer_1 = require("./StorageDBServer");
const StorageDBClient_1 = require("./StorageDBClient");
const Subscriptions_1 = require("./Subscriptions");
class DataBase extends ivipbase_core_1.DataBase {
    constructor(database, app, options) {
        var _a, _b, _c;
        super(database, options);
        this.database = database;
        this.app = app;
        this.subscriptions = new Subscriptions_1.Subscriptions();
        this.name = database;
        this.description =
            (_c = ((_a = (Array.isArray(app.settings.database) ? app.settings.database : [app.settings.database]).find(({ name }) => {
                return name === database;
            })) !== null && _a !== void 0 ? _a : {
                name: database,
                description: (_b = app.settings.description) !== null && _b !== void 0 ? _b : "iVipBase database",
            }).description) !== null && _c !== void 0 ? _c : "iVipBase database";
        this.storage = app.isServer || !app.settings.isValidClient ? new StorageDBServer_1.StorageDBServer(this) : new StorageDBClient_1.StorageDBClient(this);
        this.debug = new ivipbase_core_1.DebugLogger(app.settings.logLevel, `[${database}]`);
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
        if (this.storage instanceof StorageDBClient_1.StorageDBClient) {
            return this.storage.connect(retry);
        }
        throw new Error("Method not implemented");
    }
    disconnect() {
        if (this.storage instanceof StorageDBClient_1.StorageDBClient) {
            return this.storage.disconnect();
        }
        throw new Error("Method not implemented");
    }
}
exports.DataBase = DataBase;
function getDatabase(...args) {
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
    if (dbName && app.databases.has(dbName)) {
        return app.databases.get(dbName);
    }
    const db = new DataBase((Array.isArray(database) ? database : [database])[0], app, args.find((s) => typeof s === "object" && !(s instanceof app_1.IvipBaseApp)));
    app.databases.set(dbName, db);
    return db;
}
exports.getDatabase = getDatabase;
function getDatabasesNames() {
    return Array.prototype.concat
        .apply([], (0, app_1.getAppsName)().map((name) => {
        const names = (0, app_1.getApp)(name).settings.dbname;
        return Array.isArray(names) ? names : [names];
    }))
        .filter((v, i, a) => a.indexOf(v) === i);
}
exports.getDatabasesNames = getDatabasesNames;
function hasDatabase(database) {
    return getDatabasesNames().includes(database);
}
exports.hasDatabase = hasDatabase;
class SchemaValidationError extends Error {
    constructor(reason) {
        super(`Schema validation failed: ${reason}`);
        this.reason = reason;
    }
}
exports.SchemaValidationError = SchemaValidationError;
//# sourceMappingURL=index.js.map