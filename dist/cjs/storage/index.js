"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStorage = void 0;
const app_1 = require("../app");
const database_1 = require("../database");
const storage_1 = require("./storage");
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
    const db = app.databases.get(dbName);
    return new storage_1.Storage(app, db);
}
exports.getStorage = getStorage;
//# sourceMappingURL=index.js.map