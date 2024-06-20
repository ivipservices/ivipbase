import { DataBase as DataBaseCore, DebugLogger } from "ivipbase-core";
import { IvipBaseApp, getApp, getFirstApp, getAppsName } from "../app/index.js";
import { StorageDBServer } from "./StorageDBServer.js";
import { StorageDBClient } from "./StorageDBClient.js";
import { Subscriptions } from "./Subscriptions.js";
import { PathBasedRules } from "./services/rules.js";
import { joinObjects } from "../utils/index.js";
export class DataBase extends DataBaseCore {
    constructor(database, app, options) {
        super(database, options);
        this.database = database;
        this.app = app;
        this.name = database;
        this.description =
            ((Array.isArray(app.settings.database) ? app.settings.database : [app.settings.database]).find(({ name }) => {
                return name === database;
            }) ?? {
                name: database,
                description: app.settings.description ?? "iVipBase database",
            }).description ?? "iVipBase database";
        this.debug = new DebugLogger(app.settings.logLevel, `[${database}]`);
        this.subscriptions = new Subscriptions(database, app);
        const dbInfo = (Array.isArray(this.app.settings.database) ? this.app.settings.database : [this.app.settings.database]).find((d) => d.name === this.name);
        const defaultRules = this.app.settings?.defaultRules ?? { rules: {} };
        const mainRules = this.app.settings?.server?.defineRules ?? { rules: {} };
        const dbRules = dbInfo?.defineRules ?? { rules: {} };
        this._rules = new PathBasedRules(this.app.settings?.server?.auth.defaultAccessRule ?? "allow", {
            debug: this.debug,
            db: this,
            authEnabled: dbInfo?.authentication?.enabled ?? this.app.settings?.server?.auth.enabled ?? false,
            rules: joinObjects({ rules: {} }, defaultRules.rules, mainRules.rules, dbRules.rules),
        });
        this.storage = app.isServer ? new StorageDBServer(this) : new StorageDBClient(this);
        app.storage.on("add", (e) => {
            //console.log(e);
            if (e.dbName !== database) {
                return;
            }
            this.subscriptions.triggerAllEvents(e.path, null, e.value);
        });
        app.storage.on("change", (e) => {
            //console.log(e);
            if (e.dbName !== database) {
                return;
            }
            this.subscriptions.triggerAllEvents(e.path, e.previous, e.value);
        });
        app.storage.on("remove", (e) => {
            if (e.dbName !== database) {
                return;
            }
            this.subscriptions.triggerAllEvents(e.path, e.value, null);
        });
        app.storage.ready(() => {
            this.emit("ready");
            this.subscriptions.initialize();
        });
    }
    get accessToken() {
        return this.app.auth.get(this.name)?.currentUser?.accessToken;
    }
    get rules() {
        return this._rules;
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
    applyRules(rules) {
        return this._rules.applyRules(rules);
    }
    setRule(rulePaths, ruleTypes, callback) {
        return this._rules.add(rulePaths, ruleTypes, callback);
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
    if (app.databases.has(dbName)) {
        return app.databases.get(dbName);
    }
    const db = new DataBase(dbName, app, args.find((s) => typeof s === "object" && !(s instanceof IvipBaseApp)));
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