"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataBase = exports.MongoDBPreparer = void 0;
const mongodb_1 = require("mongodb");
const Utils_1 = require("../lib/Utils.js");
const acebase_core_1 = require("acebase-core");
const MongoDBLocalApi_1 = require("./MongoDBLocalApi.js");
__exportStar(require("./MongoDBTransaction.js"), exports);
class MongoDBPreparer {
    constructor(config) {
        this.config = config;
        const { host, port, database, username, password, options } = this.config;
        // Monta a URI de conexão usando as opções fornecidas
        this.uri = `mongodb://${host}:${port}`;
        if (username && password) {
            this.uri = `mongodb://${username}:${password}@${host}:${port}`;
        }
        if (database) {
            this.uri += `/${database}`;
        }
        if (options) {
            const queryParams = Object.entries(options).map(([key, value]) => `${key}=${(0, Utils_1.encodeURIComponent)(JSON.stringify(value))}`);
            this.uri += `?${queryParams.join('&')}`;
        }
        this.client = new mongodb_1.MongoClient(this.uri);
    }
    async connect() {
        try {
            await this.client.connect();
            this.db = this.client.db('root'); // Use the default database
        }
        catch (error) {
            throw 'Failed to connect to MongoDB:' + String(error);
        }
    }
}
exports.MongoDBPreparer = MongoDBPreparer;
class DataBase extends acebase_core_1.AceBaseBase {
    /**
     * @param dbname Name of the database to open or create
     */
    constructor(dbname, apiSettings) {
        super(dbname, {});
        this.api = new MongoDBLocalApi_1.LocalApi(dbname, { ...apiSettings, db: this }, () => {
            this.emit('ready');
        });
    }
}
exports.DataBase = DataBase;
//# sourceMappingURL=index.js.map