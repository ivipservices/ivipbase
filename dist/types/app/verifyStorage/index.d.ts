import { CustomStorage, DataStorage, DataStorageSettings, JsonFileStorageSettings, MongodbSettings, SqliteSettings, SqliteStorage, SequelizeSettings, SequelizeStorage } from "../../controller/storage";
export type StorageSettings = CustomStorage | DataStorageSettings | MongodbSettings | JsonFileStorageSettings | SqliteSettings | SequelizeSettings;
export declare function validSettings(options: any): options is StorageSettings;
export declare function applySettings(dbname: string | string[], options: StorageSettings): CustomStorage | SqliteStorage | SequelizeStorage;
export { CustomStorage, DataStorage, DataStorageSettings };
//# sourceMappingURL=index.d.ts.map