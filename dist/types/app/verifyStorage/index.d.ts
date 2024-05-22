import { CustomStorage, DataStorage, DataStorageSettings, JsonFileStorageSettings, MongodbSettings, SqliteSettings } from "../../controller/storage";
export type StorageSettings = CustomStorage | DataStorageSettings | MongodbSettings | JsonFileStorageSettings | SqliteSettings;
export declare function validSettings(options: any): options is StorageSettings;
export declare function applySettings(dbname: string | string[], options: StorageSettings): CustomStorage;
export { CustomStorage, DataStorage, DataStorageSettings };
//# sourceMappingURL=index.d.ts.map