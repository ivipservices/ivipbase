"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStorageSettings = exports.DataStorage = exports.CustomStorage = exports.applySettings = exports.validSettings = void 0;
const storage_1 = require("../../controller/storage");
Object.defineProperty(exports, "CustomStorage", { enumerable: true, get: function () { return storage_1.CustomStorage; } });
Object.defineProperty(exports, "DataStorage", { enumerable: true, get: function () { return storage_1.DataStorage; } });
Object.defineProperty(exports, "DataStorageSettings", { enumerable: true, get: function () { return storage_1.DataStorageSettings; } });
function validSettings(options) {
    return options instanceof storage_1.DataStorageSettings || options instanceof storage_1.CustomStorage;
}
exports.validSettings = validSettings;
function applySettings(app) {
    const dbname = app.settings.dbname;
    const options = app.settings.storage;
    if (options instanceof storage_1.DataStorageSettings) {
        return new storage_1.DataStorage(dbname, options, app);
    }
    else if (options instanceof storage_1.CustomStorage) {
        return options;
    }
    return new storage_1.DataStorage(dbname, options, app);
}
exports.applySettings = applySettings;
//# sourceMappingURL=browser.js.map