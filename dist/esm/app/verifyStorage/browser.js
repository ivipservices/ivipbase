import { CustomStorage, DataStorage, DataStorageSettings } from "../../controller/storage/index.js";
export function validSettings(options) {
    return options instanceof DataStorageSettings || options instanceof CustomStorage;
}
export function applySettings(app) {
    const dbname = app.settings.dbname;
    const options = app.settings.storage;
    if (options instanceof DataStorageSettings) {
        return new DataStorage(dbname, options, app);
    }
    else if (options instanceof CustomStorage) {
        return options;
    }
    return new DataStorage(dbname, options, app);
}
export { CustomStorage, DataStorage, DataStorageSettings };
//# sourceMappingURL=browser.js.map