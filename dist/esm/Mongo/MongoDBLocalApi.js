"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalApi = void 0;
const acebase_core_1 = require("acebase-core");
const MongoDBStorage_1 = require("./MongoDBStorage.js");
const MongoDBTransaction_1 = require("./MongoDBTransaction.js");
const SimpleCache_1 = require("../lib/SimpleCache.js");
class LocalApi extends acebase_core_1.Api {
    constructor(dbname = "default", init, readyCallback) {
        super();
        this.db = init.db;
        this.cache = new SimpleCache_1.SimpleCache(typeof init.cacheSeconds === "number" ? init.cacheSeconds : 60);
        const storageEnv = { logLevel: init.settings.logLevel };
        this.storage = new MongoDBStorage_1.CustomStorage(dbname, (0, MongoDBTransaction_1.storageSettings)(dbname, init.mongodb, this.cache), storageEnv);
    }
}
exports.LocalApi = LocalApi;
//# sourceMappingURL=MongoDBLocalApi.js.map