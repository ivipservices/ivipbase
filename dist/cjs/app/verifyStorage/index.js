"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStorageSettings = exports.DataStorage = exports.CustomStorage = exports.applySettings = exports.validSettings = void 0;
const storage_1 = require("../../controller/storage");
Object.defineProperty(exports, "CustomStorage", { enumerable: true, get: function () { return storage_1.CustomStorage; } });
Object.defineProperty(exports, "DataStorage", { enumerable: true, get: function () { return storage_1.DataStorage; } });
Object.defineProperty(exports, "DataStorageSettings", { enumerable: true, get: function () { return storage_1.DataStorageSettings; } });
function validSettings(options) {
    return (options instanceof storage_1.DataStorageSettings ||
        options instanceof storage_1.MongodbSettings ||
        options instanceof storage_1.JsonFileStorageSettings ||
        options instanceof storage_1.CustomStorage ||
        options instanceof storage_1.SqliteSettings);
}
exports.validSettings = validSettings;
function applySettings(dbname, options) {
    if (options instanceof storage_1.DataStorageSettings) {
        return new storage_1.DataStorage(dbname, options);
    }
    else if (options instanceof storage_1.MongodbSettings) {
        return new storage_1.MongodbStorage(dbname, options);
    }
    else if (options instanceof storage_1.JsonFileStorageSettings) {
        return new storage_1.JsonFileStorage(dbname, options);
    }
    else if (options instanceof storage_1.SqliteSettings) {
        return new storage_1.SqliteStorage(dbname, options);
    }
    else if (options instanceof storage_1.CustomStorage) {
        return options;
    }
    return new storage_1.DataStorage(dbname);
}
exports.applySettings = applySettings;
//# sourceMappingURL=index.js.map