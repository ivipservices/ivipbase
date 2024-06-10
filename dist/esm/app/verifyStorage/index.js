import { CustomStorage, DataStorage, DataStorageSettings, JsonFileStorage, JsonFileStorageSettings, MongodbSettings, MongodbStorage, SqliteSettings, SqliteStorage, SequelizeSettings, SequelizeStorage, } from "../../controller/storage/index.js";
export function validSettings(options) {
    return (options instanceof DataStorageSettings ||
        options instanceof MongodbSettings ||
        options instanceof JsonFileStorageSettings ||
        options instanceof CustomStorage ||
        options instanceof SqliteSettings ||
        options instanceof SequelizeSettings);
}
export function applySettings(app) {
    const dbname = app.settings.dbname;
    const options = app.settings.storage;
    if (options instanceof DataStorageSettings) {
        return new DataStorage(dbname, options, app);
    }
    else if (options instanceof MongodbSettings) {
        return new MongodbStorage(dbname, options, app);
    }
    else if (options instanceof JsonFileStorageSettings) {
        return new JsonFileStorage(dbname, options, app);
    }
    else if (options instanceof SqliteSettings) {
        return new SqliteStorage(dbname, options, app);
    }
    else if (options instanceof SequelizeSettings) {
        return new SequelizeStorage(dbname, options, app);
    }
    else if (options instanceof CustomStorage) {
        return options;
    }
    return app.settings.isServer && app.settings.isPossiplyServer ? new SqliteStorage(dbname, options, app) : new DataStorage(dbname, {}, app);
}
export { CustomStorage, DataStorage, DataStorageSettings };
//# sourceMappingURL=index.js.map