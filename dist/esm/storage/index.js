import { IvipBaseApp, getApp, getAppsName, getFirstApp } from "../app/index.js";
import { hasDatabase } from "../database/index.js";
import { Storage } from "./storage.js";
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
    const db = app.databases.get(dbName);
    return new Storage(app, db);
}
//# sourceMappingURL=index.js.map