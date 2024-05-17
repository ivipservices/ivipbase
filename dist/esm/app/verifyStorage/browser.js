import { CustomStorage, DataStorage, DataStorageSettings } from "../../controller/storage/index.js";
export function validSettings(options) {
    return options instanceof DataStorageSettings || options instanceof CustomStorage;
}
export function applySettings(dbname, options) {
    if (options instanceof DataStorageSettings) {
        return new DataStorage(dbname, options);
    }
    else if (options instanceof CustomStorage) {
        return options;
    }
    return new DataStorage(dbname, options);
}
export { CustomStorage, DataStorage, DataStorageSettings };
//# sourceMappingURL=browser.js.map