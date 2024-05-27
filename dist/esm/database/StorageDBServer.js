import { Api, Utils } from "ivipbase-core";
import { VALUE_TYPES } from "../controller/storage/MDE/index.js";
import { removeNulls } from "../utils/index.js";
import executeQuery from "../controller/executeQuery.js";
export class StorageDBServer extends Api {
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
        return { ...(cursor && { cursor }) };
    }
    async exists(path) {
        return await this.db.app.storage.isPathExists(this.db.database, path);
    }
    async query(path, query, options = { snapshots: false }) {
        const results = await executeQuery(this.db.app, this.db.database, path, query, options);
        return results;
    }
    async export(path, stream, options) {
        const data = await this.get(path);
        const json = JSON.stringify(data.value);
        for (let i = 0; i < json.length; i += 1000) {
            await stream(json.slice(i, i + 1000));
        }
    }
    async import(path, read, options) {
        let json = "";
        const chunkSize = 256 * 1024; // 256KB
        const maxQueueBytes = 1024 * 1024; // 1MB
        const state = {
            data: "",
            index: 0,
            offset: 0,
        };
        const readNextChunk = async (append = false) => {
            let data = await read(chunkSize);
            if (data === null) {
                if (state.data) {
                    throw new Error(`Unexpected EOF at index ${state.offset + state.data.length}`);
                }
                else {
                    throw new Error("Unable to read data from stream");
                }
            }
            else if (typeof data === "object") {
                data = Utils.decodeString(data);
            }
            if (append) {
                state.data += data;
            }
            else {
                state.offset += state.data.length;
                state.data = data;
                state.index = 0;
            }
        };
        return;
    }
    async reflect(path, type, args) {
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
                if (stop) {
                    // Stop 1 child too late on purpose to make sure there's more
                    more = true;
                    return false; // Stop iterating
                }
                n++;
                const include = from !== null && childInfo.key ? childInfo.key > from : skip === 0 || n > skip;
                if (include) {
                    children.push(removeNulls({
                        key: (typeof childInfo.key === "string" ? childInfo.key : childInfo.index) ?? "",
                        type: childInfo.valueTypeName ?? "unknown",
                        value: childInfo.value ?? null,
                        // address is now only added when storage is acebase. Not when eg sqlite, mssql
                        ...(typeof childInfo.address === "object" && {
                            address: childInfo.address,
                        }),
                    }));
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
                info.key = (typeof nodeInfo.key !== "undefined" ? nodeInfo.key : nodeInfo.index) ?? "";
                info.exists = nodeInfo.exists ?? false;
                info.type = (nodeInfo.exists ? nodeInfo.valueTypeName : undefined) ?? "unknown";
                if (![VALUE_TYPES.OBJECT, VALUE_TYPES.ARRAY].includes(nodeInfo.type ?? 0)) {
                    info.value = nodeInfo.value;
                }
                info.address = typeof nodeInfo.address === "object" ? nodeInfo.address : undefined;
                const isObjectOrArray = nodeInfo.exists && nodeInfo.address && [VALUE_TYPES.OBJECT, VALUE_TYPES.ARRAY].includes(nodeInfo.type ?? 0);
                if (args.child_count === true) {
                    info.children = { count: isObjectOrArray ? nodeInfo.childCount ?? 0 : 0 };
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
//# sourceMappingURL=StorageDBServer.js.map