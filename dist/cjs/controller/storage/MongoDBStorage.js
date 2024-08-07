"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongodbStorage = exports.MongodbSettings = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const erros_1 = require("../erros");
const CustomStorage_1 = require("./CustomStorage");
const MDE_1 = require("./MDE");
const mongodb_1 = require("mongodb");
class MongodbSettings {
    constructor(options = {}) {
        this.host = "localhost";
        this.port = 27017;
        this.database = ["root"];
        this.collection = "main-database";
        this.mdeOptions = {};
        if (typeof options.host === "string") {
            this.host = options.host;
        }
        if (typeof options.port === "number") {
            this.port = options.port;
        }
        if (typeof options.username === "string") {
            this.username = options.username;
        }
        if (typeof options.password === "string") {
            this.password = options.password;
        }
        if (typeof options.options === "object") {
            this.options = options.options;
        }
        if (typeof options.mdeOptions === "object") {
            this.mdeOptions = options.mdeOptions;
        }
    }
}
exports.MongodbSettings = MongodbSettings;
let timer;
class MongodbStorage extends CustomStorage_1.CustomStorage {
    constructor(database, options, app) {
        super(options.mdeOptions, app);
        this.isConnected = false;
        this.database = {};
        this.pending = {};
        this.resolvingPending = false;
        this.options = new MongodbSettings(options);
        this.options.database = (Array.isArray(database) ? database : [this.database]).filter((name) => typeof name === "string" && name.trim() !== "").filter((a, i, l) => l.indexOf(a) === i);
        this.dbName = "MongoDB";
        this.client = new mongodb_1.MongoClient(this.mongoUri, {});
        this.client.on("connected", () => {
            this.isConnected = true;
        });
        this.client.on("error", (err) => {
            this.isConnected = false;
            throw erros_1.ERROR_FACTORY.create("db-connection-error" /* AppError.DB_CONNECTION_ERROR */, { error: String(err) });
        });
        this.client.on("disconnected", () => {
            this.isConnected = false;
            setTimeout(() => {
                this.connect();
            }, 10000);
        });
        this.connect();
    }
    async connect() {
        try {
            await this.client.connect();
            this.isConnected = true;
            for (let name of this.options.database) {
                this.database[name] = {
                    db: this.client.db(name),
                };
                this.database[name].collection = await this.getCollectionBy(name, this.options.collection);
                if (!this.pending[name]) {
                    this.pending[name] = new Map();
                }
                const nodeRoot = await this.database[name].collection.findOne({ path: this.settings.prefix });
                if (!nodeRoot) {
                    const node = {
                        path: this.settings.prefix,
                        content: {
                            type: MDE_1.VALUE_TYPES.OBJECT,
                            value: {},
                            created: Date.now(),
                            modified: Date.now(),
                            revision_nr: 0,
                            revision: ivipbase_core_1.ID.generate(),
                        },
                    };
                    await this.database[name].collection.updateOne({ path: this.settings.prefix }, { $set: JSON.parse(JSON.stringify(node)) }, { upsert: true });
                }
            }
            this.resolvePending(true);
            this.emit("ready");
        }
        catch (err) {
            this.isConnected = false;
            console.error(err);
            throw erros_1.ERROR_FACTORY.create("db-connection-error" /* AppError.DB_CONNECTION_ERROR */, { error: String(err) });
        }
    }
    async getCollectionBy(name, collectionName) {
        if (!this.isConnected || !this.database[name] || !this.database[name].db) {
            throw erros_1.ERROR_FACTORY.create("db-disconnected" /* AppError.DB_DISCONNECTED */, { dbName: name });
        }
        const collectionNames = await this.database[name].db.listCollections().toArray();
        const collectionExists = collectionNames.some((col) => col.name === collectionName);
        if (!collectionExists) {
            await this.database[name].db.createCollection(collectionName);
        }
        return this.database[name].db.collection(collectionName);
    }
    get mongoUri() {
        const { host, port, database, username, password, options } = this.options;
        // Monta a URI de conexão usando as opções fornecidas
        let uri = `mongodb://${host}:${port}`;
        if (username && password) {
            uri = `mongodb://${username}:${password}@${host}:${port}`;
        }
        //uri += `/${database}`;
        if (options) {
            const queryParams = Object.entries(options).map(([key, value]) => `${key}=${encodeURIComponent(JSON.stringify(value))}`);
            uri += `?${queryParams.join("&")}`;
        }
        return uri;
    }
    resolvePending(resolveAll = false) {
        if (this.resolvingPending) {
            return;
        }
        clearTimeout(timer);
        timer = setTimeout(async () => {
            this.resolvingPending = true;
            let lengthRefresh = 0;
            for (let name in this.pending) {
                for (let [path, node] of this.pending[name]) {
                    if (!node.refresh && !resolveAll) {
                        continue;
                    }
                    if (node.type === "delete") {
                        await this.removeNode(name, path, node.content, node);
                    }
                    else {
                        await this.setNode(name, path, node.content, node);
                    }
                }
                const pendingList = Array.from(this.pending[name].values()).filter((node) => node.refresh || resolveAll);
                lengthRefresh += pendingList.length;
            }
            this.resolvingPending = false;
            if (lengthRefresh > 0) {
                this.resolvePending();
            }
        }, 5000);
    }
    async getMultiple(database, { regex }) {
        if (!this.isConnected || !this.database[database] || !this.database[database].collection) {
            throw erros_1.ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
        }
        const query = {
            path: {
                $regex: regex,
            },
        };
        const pendingList = Array.from(this.pending[database].values()).filter((node) => regex.test(node.path));
        const list = await this.database[database].collection.find(query).toArray();
        const result = pendingList
            .concat(list)
            .map((node) => {
            node.path = node.path.replace(/\/+$/g, "");
            return node;
        })
            .filter((node, i, l) => {
            return l.findIndex((r) => r.path === node.path) === i;
        });
        return result;
    }
    async setNode(database, path, content, node) {
        if (!this.isConnected || !this.database[database] || !this.database[database].collection) {
            throw erros_1.ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
        }
        path = path.replace(/\/+$/g, "");
        node.path = node.path.replace(/\/+$/g, "");
        this.pending[database].set(path, node);
        try {
            await this.database[database].collection.updateOne({ path: path }, { $set: JSON.parse(JSON.stringify(node)) }, { upsert: true });
        }
        catch (_a) {
            this.pending[database].set(path, { path, content, refresh: true, type: "set" });
            return this.resolvePending();
        }
        this.pending[database].delete(path);
        //await this.database[database].collection.replaceOne({ path: path }, JSON.parse(JSON.stringify(node)));
    }
    async removeNode(database, path, content, node) {
        if (!this.isConnected || !this.database[database] || !this.database[database].collection) {
            throw erros_1.ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
        }
        path = path.replace(/\/+$/g, "");
        node.path = node.path.replace(/\/+$/g, "");
        try {
            const pathRegex = new RegExp(`^${path.replace(/\//g, "\\/")}(\\/.*)?`);
            await this.database[database].collection.deleteMany({ path: pathRegex });
        }
        catch (_a) {
            this.pending[database].set(path, { path, content, refresh: true, type: "delete" });
            return this.resolvePending();
        }
        this.pending[database].delete(path);
    }
}
exports.MongodbStorage = MongodbStorage;
//# sourceMappingURL=MongoDBStorage.js.map