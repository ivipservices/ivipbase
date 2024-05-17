import { CustomStorage, DataStorage, DataStorageSettings, JsonFileStorageSettings, MongodbSettings } from "../../controller/storage";
export type StorageSettings = CustomStorage | DataStorageSettings | MongodbSettings | JsonFileStorageSettings;
export declare function validSettings(options: any): options is StorageSettings;
export declare function applySettings(dbname: string | string[], options: StorageSettings): CustomStorage;
export { CustomStorage, DataStorage, DataStorageSettings };
//# sourceMappingURL=index.d.ts.map