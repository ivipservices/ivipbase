import { CustomStorage, DataStorage, DataStorageSettings, JsonFileStorage, JsonFileStorageSettings, MongodbSettings, MongodbStorage } from "../../controller/storage";

export type StorageSettings = CustomStorage | DataStorageSettings | MongodbSettings | JsonFileStorageSettings;

export function validSettings(options: any): options is StorageSettings {
	return options instanceof DataStorageSettings || options instanceof MongodbSettings || options instanceof JsonFileStorageSettings || options instanceof CustomStorage;
}

export function applySettings(dbname: string | string[], options: StorageSettings) {
	if (options instanceof DataStorageSettings) {
		return new DataStorage(dbname, options);
	} else if (options instanceof MongodbSettings) {
		return new MongodbStorage(dbname, options);
	} else if (options instanceof JsonFileStorageSettings) {
		return new JsonFileStorage(dbname, options);
	} else if (options instanceof CustomStorage) {
		return options;
	}
	return new DataStorage(dbname);
}

export { CustomStorage, DataStorage, DataStorageSettings };
