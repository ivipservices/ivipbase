"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteStorage = exports.SqliteSettings = void 0;
const fs_1 = __importDefault(require("fs"));
const ivipbase_core_1 = require("ivipbase-core");
const erros_1 = require("../erros");
const CustomStorage_1 = require("./CustomStorage");
const MDE_1 = require("./MDE");
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const createDirectories = (dirPath) => {
    const absolutePath = path_1.default.resolve(dirPath);
    if (!fs_1.default.existsSync(path_1.default.dirname(absolutePath))) {
        createDirectories(path_1.default.dirname(absolutePath));
    }
    if (!fs_1.default.existsSync(absolutePath)) {
        return fs_1.default.mkdirSync(absolutePath, { recursive: true });
    }
};
class SqliteSettings extends CustomStorage_1.CustomStorageSettings {
    constructor(options = {}) {
        var _a;
        super(options);
        this.memory = (_a = options.memory) !== null && _a !== void 0 ? _a : ":memory:";
    }
}
exports.SqliteSettings = SqliteSettings;
class SqliteStorage extends CustomStorage_1.CustomStorage {
    constructor(database, options = {}, app) {
        var _a, _b, _c;
        super(options, app);
        this.database = database;
        this.sqlite = sqlite3_1.default.verbose();
        this.pending = {};
        this.dbName = "SqliteStorage";
        const localPath = typeof ((_b = (_a = app.settings) === null || _a === void 0 ? void 0 : _a.server) === null || _b === void 0 ? void 0 : _b.localPath) === "string" ? path_1.default.resolve(app.settings.server.localPath, "./db.sqlite") : undefined;
        const dbPath = (_c = options.memory) !== null && _c !== void 0 ? _c : localPath;
        if (dbPath) {
            createDirectories(path_1.default.dirname(dbPath));
        }
        this.db = new this.sqlite.Database(dbPath !== null && dbPath !== void 0 ? dbPath : ":memory:", sqlite3_1.default.OPEN_CREATE | sqlite3_1.default.OPEN_READWRITE);
        this.initialize();
    }
    async initialize() {
        try {
            const dbs = (Array.isArray(this.database) ? this.database : [this.database]).filter((name) => typeof name === "string" && name.trim() !== "").filter((a, i, l) => l.indexOf(a) === i);
            const rows = await this._get(`SELECT name FROM sqlite_master WHERE type='table'`);
            const ignoreDbs = rows.map((row) => {
                return row.name;
            });
            for (const db of dbs) {
                if (ignoreDbs.includes(db)) {
                    this.pending[db] = new Map();
                    continue;
                }
                await this._exec(`CREATE TABLE ${db} (
                    path TEXT PRIMARY KEY,
                    type INTEGER NOT NULL,  -- node type (1=object, 2=array, 5=string, 8=binary, 9=reference)
                    text_value TEXT,        -- when type is string or reference (> max inline value length?)
                    binary_value BLOB,      -- when type is binary
                    json_value TEXT,        -- when type is object, only simple/small value children are here (no objects, arrays, large strings)
                    
                    created INTEGER NOT NULL,       -- creation timestamp
                    modified INTEGER NOT NULL,      -- modification timestamp
                    revision_nr INTEGER NOT NULL,   -- nr of times the node's value was updated
                    revision TEXT NOT NULL          -- revision id that is shared with all nested nodes that were updated at the same time, should be time sortable so could be considered as a "transaction timestamp"
                )`);
                const rows = [
                    {
                        path: this.settings.prefix,
                        type: MDE_1.VALUE_TYPES.OBJECT,
                        json_value: "{}",
                        created: Date.now(),
                        modified: Date.now(),
                        revision_nr: 0,
                        revision: ivipbase_core_1.ID.generate(),
                    },
                ];
                const promises = rows.map(async (row) => {
                    const keys = Object.keys(row);
                    const sql = `INSERT INTO ${db} (${keys.join(",")}) VALUES (${keys.map((key) => "$" + key).join(",")})`;
                    const params = keys.reduce((obj, key) => {
                        obj["$" + key] = row[key];
                        return obj;
                    }, {});
                    await this._exec(sql, params);
                });
                await Promise.all(promises);
                this.pending[db] = new Map();
            }
            this.emit("ready");
        }
        catch (err) {
            this.emit("error", err);
        }
    }
    _get(sql, params) {
        const stack = new Error("").stack;
        return new Promise((resolve, reject) => {
            this.db.all(sql, params || {}, (err, rows) => {
                if (err) {
                    err.stack = stack;
                    err.statement = sql;
                    err.params = params;
                    return reject(err);
                }
                resolve(rows);
            });
        });
    }
    _getOne(sql, params) {
        const stack = new Error("").stack;
        return new Promise((resolve, reject) => {
            this.db.get(sql, params || {}, (err, row) => {
                if (err) {
                    err.stack = stack;
                    err.statement = sql;
                    err.params = params;
                    return reject(err);
                }
                resolve(row);
            });
        });
    }
    _exec(sql, params) {
        const stack = new Error("").stack;
        return new Promise((resolve, reject) => {
            this.db.run(sql, params || {}, (err) => {
                if (err) {
                    err.stack = stack;
                    err.statement = sql;
                    err.params = params;
                    return reject(err);
                }
                resolve(this);
            });
        });
    }
    async getMultiple(database, { regex, query }, simplifyValues = false) {
        if (!(database in this.pending)) {
            throw erros_1.ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
        }
        const pendingList = Array.from(this.pending[database].values()).filter((row) => regex.test(row.path));
        const sql = `SELECT path, type, text_value, binary_value, json_value, revision, revision_nr, created, modified FROM ${database} WHERE ${query.map((p) => `path ${p}`).join(" OR ")}`;
        const list = await this._get(sql);
        const result = pendingList
            .concat(list.filter((row) => "path" in row && regex.test(row["path"])))
            .filter((row, i, l) => {
            return l.findIndex((r) => r.path === row.path) === i;
        })
            .map((row) => {
            var _a, _b, _c;
            let value = null;
            if (row.type === MDE_1.VALUE_TYPES.STRING || row.type === MDE_1.VALUE_TYPES.REFERENCE) {
                value = (_a = row.text_value) !== null && _a !== void 0 ? _a : "";
            }
            else if (row.type === MDE_1.VALUE_TYPES.BINARY) {
                value = (_b = row.binary_value) !== null && _b !== void 0 ? _b : "";
            }
            else if (row.type === MDE_1.VALUE_TYPES.OBJECT || row.type === MDE_1.VALUE_TYPES.ARRAY) {
                value = (_c = JSON.parse(row.json_value)) !== null && _c !== void 0 ? _c : (row.type === MDE_1.VALUE_TYPES.ARRAY ? [] : {});
            }
            return {
                path: row.path,
                content: {
                    type: row.type,
                    value,
                    revision: row.revision,
                    revision_nr: row.revision_nr,
                    created: row.created,
                    modified: row.modified,
                },
            };
        });
        return result;
    }
    async setNode(database, path, content) {
        if (!(database in this.pending)) {
            throw erros_1.ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
        }
        if (content.type === MDE_1.VALUE_TYPES.EMPTY || content.value === null || content.value === undefined) {
            return;
        }
        const sql = `
            INSERT INTO ${database} (path, type, text_value, binary_value, json_value, revision, revision_nr, created, modified)
            VALUES ($path, $type, $text_value, $binary_value, $json_value, $revision, $revision_nr, $created, $modified)
            ON CONFLICT(path) DO UPDATE SET
                type = $type,
                text_value = $text_value,
                binary_value = $binary_value,
                json_value = $json_value,
                revision = $revision,
                revision_nr = $revision_nr,
                created = $created,
                modified = $modified
        `;
        const params = {
            $path: path,
            $type: content.type,
            $text_value: content.type === MDE_1.VALUE_TYPES.STRING || content.type === MDE_1.VALUE_TYPES.REFERENCE ? content.value : null,
            $binary_value: content.type === MDE_1.VALUE_TYPES.BINARY ? content.value : null,
            $json_value: content.type === MDE_1.VALUE_TYPES.OBJECT || content.type === MDE_1.VALUE_TYPES.ARRAY ? JSON.stringify(content.value) : null,
            $revision: content.revision,
            $revision_nr: content.revision_nr,
            $created: content.created,
            $modified: content.modified,
        };
        this.pending[database].set(path, {
            path,
            type: content.type,
            text_value: params.$text_value,
            binary_value: params.$binary_value,
            json_value: params.$json_value,
            created: params.$created,
            modified: params.$modified,
            revision_nr: params.$revision_nr,
            revision: params.$revision,
        });
        this._exec(sql, params).finally(() => {
            this.pending[database].delete(path);
        });
    }
    async removeNode(database, path) {
        if (!(database in this.pending)) {
            throw erros_1.ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
        }
        if (path === "") {
            return;
        }
        if (this.pending[database].has(path)) {
            this.pending[database].delete(path);
        }
        const sql = `DELETE FROM ${database} WHERE path = '${path}' OR path LIKE '${path}/%' OR path LIKE '${path}[%'`;
        await this._exec(sql);
    }
}
exports.SqliteStorage = SqliteStorage;
//# sourceMappingURL=SqliteStorage.js.map