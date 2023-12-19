import { CustomStorage, DataStorage, DataStorageSettings, JsonFileStorage, JsonFileStorageSettings, MongodbSettings, MongodbStorage } from "../../controller/storage/index.js";
export function validSettings(options) {
    return options instanceof DataStorageSettings || options instanceof MongodbSettings || options instanceof JsonFileStorageSettings || options instanceof CustomStorage;
}
export function applySettings(dbname, options) {
    if (options instanceof DataStorageSettings) {
        return new DataStorage(options);
    }
    else if (options instanceof MongodbSettings) {
        return new MongodbStorage(dbname, options);
    }
    else if (options instanceof JsonFileStorageSettings) {
        return new JsonFileStorage(options);
    }
    else if (options instanceof CustomStorage) {
        return options;
    }
    return new DataStorage();
}
export { CustomStorage, DataStorage, DataStorageSettings };
//# sourceMappingURL=index.js.map