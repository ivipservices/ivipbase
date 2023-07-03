"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoDBPreparer = void 0;
const mongodb_1 = require("mongodb");
const utils_1 = require("./utils.js");
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
            const queryParams = Object.entries(options).map(([key, value]) => `${key}=${(0, utils_1.encodeURIComponent)(JSON.stringify(value))}`);
            this.uri += `?${queryParams.join('&')}`;
        }
        this.client = new mongodb_1.MongoClient(this.uri);
    }
    async connect() {
        try {
            await this.client.connect();
            this.db = this.client.db("root"); // Use the default database
        }
        catch (error) {
            throw 'Failed to connect to MongoDB:' + String(error);
        }
    }
}
exports.MongoDBPreparer = MongoDBPreparer;
//# sourceMappingURL=mongodb.js.map