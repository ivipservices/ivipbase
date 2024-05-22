import { CustomStorage, DataStorage, DataStorageSettings, JsonFileStorage, JsonFileStorageSettings, MongodbSettings, MongodbStorage, SqliteSettings, SqliteStorage } from "../../controller/storage/index.js";
export function validSettings(options) {
    return (options instanceof DataStorageSettings ||
        options instanceof MongodbSettings ||
        options instanceof JsonFileStorageSettings ||
        options instanceof CustomStorage ||
        options instanceof SqliteSettings);
}
export function applySettings(dbname, options) {
    if (options instanceof DataStorageSettings) {
        return new DataStorage(dbname, options);
    }
    else if (options instanceof MongodbSettings) {
        return new MongodbStorage(dbname, options);
    }
    else if (options instanceof JsonFileStorageSettings) {
        return new JsonFileStorage(dbname, options);
    }
    else if (options instanceof SqliteSettings) {
        return new SqliteStorage(dbname, options);
    }
    else if (options instanceof CustomStorage) {
        return options;
    }
    return new DataStorage(dbname);
}
export { CustomStorage, DataStorage, DataStorageSettings };
//# sourceMappingURL=index.js.map