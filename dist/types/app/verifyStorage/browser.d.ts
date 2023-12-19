import { CustomStorage, DataStorage, DataStorageSettings } from "../../controller/storage";
export type StorageSettings = CustomStorage | DataStorageSettings;
export declare function validSettings(options: any): options is StorageSettings;
export declare function applySettings(dbname: string, options: StorageSettings): CustomStorage;
export { CustomStorage, DataStorage, DataStorageSettings };
//# sourceMappingURL=browser.d.ts.map