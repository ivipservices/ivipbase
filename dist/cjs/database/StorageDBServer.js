"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageDBServer = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const MDE_1 = require("../controller/storage/MDE");
const utils_1 = require("../utils");
const executeQuery_1 = __importDefault(require("../controller/executeQuery"));
const ivip_utils_1 = require("ivip-utils");
class StorageDBServer extends ivipbase_core_1.Api {
    constructor(db) {
        super();
        this.db = db;
        this.cache = {};
        this.db.app.storage.ready(() => {
            this.db.emit("ready");
        });
    }
    async getInfo() {
        return {
            dbname: this.db.database,
            version: "",
            time: Date.now(),
            process: process.pid,
        };
    }
    async stats() {
        return {
            writes: 0,
            reads: 0,
            bytesRead: 0,
            bytesWritten: 0,
        };
    }
    subscribe(path, event, callback, settings) {
        this.db.subscriptions.add(path, event, callback);
    }
    unsubscribe(path, event, callback) {
        this.db.subscriptions.remove(path, event, callback);
    }
    async set(path, value, options) {
        await this.db.app.storage.set(this.db.database, path, value);
        return {};
    }
    async get(path, options) {
        if (!options) {
            options = {};
        }
        if (typeof options.include !== "undefined" && !(options.include instanceof Array)) {
            throw new TypeError(`options.include must be an array of key names`);
        }
        if (typeof options.exclude !== "undefined" && !(options.exclude instanceof Array)) {
            throw new TypeError(`options.exclude must be an array of key names`);
        }
        const value = await this.db.app.storage.get(this.db.database, path, options);
        return { value, context: { more: false } };
    }
    async update(path, updates, options) {
        await this.db.app.storage.update(this.db.database, path, updates);
        return {};
    }
    async transaction(path, callback, options = {
        suppress_events: false,
        context: null,
    }) {
        const cursor = await this.db.app.storage.transact(this.db.database, path, callback, { suppress_events: options.suppress_events, context: options.context });
        return Object.assign({}, (cursor && { cursor }));
    }
    async exists(path) {
        return await this.db.app.storage.isPathExists(this.db.database, path);
    }
    async query(path, query, options = { snapshots: false }) {
        const results = await (0, executeQuery_1.default)(this.db, path, query, options);
        return results;
    }
    async export(path, stream, options) {
        if ((options === null || options === void 0 ? void 0 : options.format) !== "json") {
            throw new Error("Only json output is currently supported");
        }
        const data = await this.get(path);
        const json = JSON.stringify(data.value);
        for (let i = 0; i < json.length; i += 1000) {
            await stream(json.slice(i, i + 1000));
        }
    }
    async import(path, read, options) {
        var _a;
        const chunkSize = 256 * 1024; // 256KB
        const json = await read(chunkSize);
        const method = (_a = options === null || options === void 0 ? void 0 : options.method) !== null && _a !== void 0 ? _a : "set";
        if (!(0, ivip_utils_1.isJson)(json)) {
            return;
        }
        const value = JSON.parse(json);
        const resolveObject = async (path, obj) => {
            const isAnyNodes = Object.values(obj).every((value) => (typeof value === "object" && value !== null) || Array.isArray(value));
            if (isAnyNodes) {
                for (const key in obj) {
                    const value = obj[key];
                    const newPath = ivipbase_core_1.PathInfo.get([path, key]).path;
                    await resolveObject(newPath, value);
                }
            }
            else {
                if (method === "set") {
                    await this.db.app.storage.set(this.db.database, path, value, options);
                }
                else {
                    await this.db.app.storage.update(this.db.database, path, value, options);
                }
            }
        };
        if ((typeof value === "object" && value !== null) || Array.isArray(value)) {
            await resolveObject(path, value);
        }
        else {
            if (method === "set") {
                await this.db.app.storage.set(this.db.database, path, value, options);
            }
            else {
                await this.db.app.storage.update(this.db.database, path, value, options);
            }
        }
        return;
    }
    async reflect(path, type, args) {
        var _a, _b, _c, _d, _e, _f;
        args = args || {};
        const getChildren = async (path, limit = 50, skip = 0, from = null) => {
            if (typeof limit === "string") {
                limit = parseInt(limit);
            }
            if (typeof skip === "string") {
                skip = parseInt(skip);
            }
            if (["null", "undefined", null, undefined].includes(from)) {
                from = null;
            }
            const children = []; // Array<{ key: string | number; type: string; value: any; address?: any }>;
            let n = 0, stop = false, more = false; //stop = skip + limit,
            await this.db.app.storage
                .getChildren(this.db.database, path)
                .next((childInfo) => {
                var _a, _b, _c;
                if (stop) {
                    // Stop 1 child too late on purpose to make sure there's more
                    more = true;
                    return false; // Stop iterating
                }
                n++;
                const include = from !== null && childInfo.key ? childInfo.key > from : skip === 0 || n > skip;
                if (include) {
                    children.push((0, utils_1.removeNulls)(Object.assign({ key: (_a = (typeof childInfo.key === "string" ? childInfo.key : childInfo.index)) !== null && _a !== void 0 ? _a : "", type: (_b = childInfo.valueTypeName) !== null && _b !== void 0 ? _b : "unknown", value: (_c = childInfo.value) !== null && _c !== void 0 ? _c : null }, (typeof childInfo.address === "object" && {
                        address: childInfo.address,
                    }))));
                }
                stop = limit > 0 && children.length === limit;
            })
                .catch((err) => {
                throw err;
            });
            return {
                more,
                list: children,
            };
        };
        switch (type) {
            case "children": {
                const result = await getChildren(path, args.limit, args.skip, args.from);
                return result;
            }
            case "info": {
                const info = {
                    key: "",
                    exists: false,
                    type: "unknown",
                    value: undefined,
                    address: undefined,
                    children: {
                        count: 0,
                        more: false,
                        list: [],
                    },
                };
                const nodeInfo = await this.db.app.storage.getInfoBy(this.db.database, path, { include_child_count: args.child_count === true });
                info.key = (_a = (typeof nodeInfo.key !== "undefined" ? nodeInfo.key : nodeInfo.index)) !== null && _a !== void 0 ? _a : "";
                info.exists = (_b = nodeInfo.exists) !== null && _b !== void 0 ? _b : false;
                info.type = (_c = (nodeInfo.exists ? nodeInfo.valueTypeName : undefined)) !== null && _c !== void 0 ? _c : "unknown";
                if (![MDE_1.VALUE_TYPES.OBJECT, MDE_1.VALUE_TYPES.ARRAY].includes((_d = nodeInfo.type) !== null && _d !== void 0 ? _d : 0)) {
                    info.value = nodeInfo.value;
                }
                info.address = typeof nodeInfo.address === "object" ? nodeInfo.address : undefined;
                const isObjectOrArray = nodeInfo.exists && nodeInfo.address && [MDE_1.VALUE_TYPES.OBJECT, MDE_1.VALUE_TYPES.ARRAY].includes((_e = nodeInfo.type) !== null && _e !== void 0 ? _e : 0);
                if (args.child_count === true) {
                    info.children = { count: isObjectOrArray ? (_f = nodeInfo.childCount) !== null && _f !== void 0 ? _f : 0 : 0 };
                }
                else if (typeof args.child_limit === "number" && args.child_limit > 0) {
                    if (isObjectOrArray) {
                        info.children = await getChildren(path, args.child_limit, args.child_skip, args.child_from);
                    }
                }
                return info;
            }
        }
    }
    setSchema(path, schema, warnOnly) {
        return new Promise((resolve, reject) => {
            resolve(this.db.app.storage.setSchema(this.db.database, path, schema, warnOnly));
        });
    }
    getSchema(path) {
        return new Promise((resolve, reject) => {
            resolve(this.db.app.storage.getSchema(this.db.database, path));
        });
    }
    async getSchemas() {
        return new Promise((resolve, reject) => {
            resolve(this.db.app.storage.getSchemas(this.db.database));
        });
    }
    validateSchema(path, value, isUpdate) {
        return new Promise((resolve, reject) => {
            resolve(this.db.app.storage.validateSchema(this.db.database, path, value, { updates: isUpdate }));
        });
    }
}
exports.StorageDBServer = StorageDBServer;
//# sourceMappingURL=StorageDBServer.js.map