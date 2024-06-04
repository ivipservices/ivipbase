"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaValidationError = exports.hasDatabase = exports.getDatabasesNames = exports.getDatabase = exports.DataBase = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const app_1 = require("../app");
const StorageDBServer_1 = require("./StorageDBServer");
const StorageDBClient_1 = require("./StorageDBClient");
const Subscriptions_1 = require("./Subscriptions");
const rules_1 = require("./services/rules");
const utils_1 = require("../utils");
class DataBase extends ivipbase_core_1.DataBase {
    constructor(database, app, options) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
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
        this.debug = new ivipbase_core_1.DebugLogger(app.settings.logLevel, `[${database}]`);
        const dbInfo = (Array.isArray(this.app.settings.database) ? this.app.settings.database : [this.app.settings.database]).find((d) => d.name === this.name);
        const defaultRules = (_e = (_d = this.app.settings) === null || _d === void 0 ? void 0 : _d.defaultRules) !== null && _e !== void 0 ? _e : { rules: {} };
        const mainRules = (_h = (_g = (_f = this.app.settings) === null || _f === void 0 ? void 0 : _f.server) === null || _g === void 0 ? void 0 : _g.defineRules) !== null && _h !== void 0 ? _h : { rules: {} };
        const dbRules = (_j = dbInfo === null || dbInfo === void 0 ? void 0 : dbInfo.defineRules) !== null && _j !== void 0 ? _j : { rules: {} };
        this._rules = new rules_1.PathBasedRules((_m = (_l = (_k = this.app.settings) === null || _k === void 0 ? void 0 : _k.server) === null || _l === void 0 ? void 0 : _l.auth.defaultAccessRule) !== null && _m !== void 0 ? _m : "allow", {
            debug: this.debug,
            db: this,
            authEnabled: (_s = (_p = (_o = dbInfo === null || dbInfo === void 0 ? void 0 : dbInfo.authentication) === null || _o === void 0 ? void 0 : _o.enabled) !== null && _p !== void 0 ? _p : (_r = (_q = this.app.settings) === null || _q === void 0 ? void 0 : _q.server) === null || _r === void 0 ? void 0 : _r.auth.enabled) !== null && _s !== void 0 ? _s : false,
            rules: (0, utils_1.joinObjects)({ rules: {} }, defaultRules.rules, mainRules.rules, dbRules.rules),
        });
        this.storage = !app.settings.isConnectionDefined || app.isServer || !app.settings.isValidClient ? new StorageDBServer_1.StorageDBServer(this) : new StorageDBClient_1.StorageDBClient(this);
        (_t = app.ipc) === null || _t === void 0 ? void 0 : _t.addDatabase(this);
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
    get accessToken() {
        var _a, _b;
        return (_b = (_a = this.app.auth.get(this.name)) === null || _a === void 0 ? void 0 : _a.currentUser) === null || _b === void 0 ? void 0 : _b.accessToken;
    }
    get rules() {
        return this._rules;
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
    async getInfo() {
        return await this.storage.getInfo();
    }
    async getPerformance() {
        const { data } = await this.storage.getInfo();
        return data !== null && data !== void 0 ? data : [];
    }
    applyRules(rules) {
        return this._rules.applyRules(rules);
    }
    setRule(rulePaths, ruleTypes, callback) {
        return this._rules.add(rulePaths, ruleTypes, callback);
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
    if (app.databases.has(dbName)) {
        return app.databases.get(dbName);
    }
    const db = new DataBase(dbName, app, args.find((s) => typeof s === "object" && !(s instanceof app_1.IvipBaseApp)));
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