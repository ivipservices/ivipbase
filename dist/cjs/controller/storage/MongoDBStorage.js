"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongodbStorage = exports.MongodbSettings = void 0;
const erros_1 = require("../erros");
const CustomStorage_1 = require("./CustomStorage");
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
class MongodbStorage extends CustomStorage_1.CustomStorage {
    constructor(database, options) {
        super(options.mdeOptions);
        this.isConnected = false;
        this.database = {};
        this.options = new MongodbSettings(options);
        this.options.database = (Array.isArray(database) ? database : [database]).filter((name) => typeof name === "string" && name.trim() !== "");
        this.dbName = "MongoDB";
        this.client = new mongodb_1.MongoClient(this.mongoUri, {});
        this.client.on("connected", () => {
            this.emit("ready");
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
                this.database[name].db = this.client.db(name);
                this.database[name].collection = await this.getCollectionBy(name, this.options.collection);
            }
        }
        catch (err) {
            this.isConnected = false;
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
    async getMultiple(database, expression) {
        if (!this.isConnected || !this.database[database] || !this.database[database].collection) {
            throw erros_1.ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
        }
        const query = {
            path: {
                $regex: expression,
            },
        };
        return await this.database[database].collection.find(query).toArray();
    }
    async setNode(database, path, content, node) {
        if (!this.isConnected || !this.database[database] || !this.database[database].collection) {
            throw erros_1.ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
        }
        await this.database[database].collection.updateOne({ path: path }, { $set: JSON.parse(JSON.stringify(node)) }, { upsert: true });
        //await this.database[database].collection.replaceOne({ path: path }, JSON.parse(JSON.stringify(node)));
    }
    async removeNode(database, path, content, node) {
        if (!this.isConnected || !this.database[database] || !this.database[database].collection) {
            throw erros_1.ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
        }
        await this.database[database].collection.deleteOne({ path: path });
    }
}
exports.MongodbStorage = MongodbStorage;
//# sourceMappingURL=MongoDBStorage.js.map