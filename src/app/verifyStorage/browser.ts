import { CustomStorage, DataStorage, DataStorageSettings } from "../../controller/storage";

export type StorageSettings = CustomStorage | DataStorageSettings;

export function validSettings(options: any): options is StorageSettings {
	return options instanceof DataStorageSettings || options instanceof CustomStorage;
}

export function applySettings(dbname: string, options: StorageSettings) {
	if (options instanceof DataStorageSettings) {
		return new DataStorage(options);
	} else if (options instanceof CustomStorage) {
		return options;
	}
	return new DataStorage();
}

export { CustomStorage, DataStorage, DataStorageSettings };
