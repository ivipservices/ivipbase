import { IvipBaseApp } from "..";
import { CustomStorage, DataStorage, DataStorageSettings } from "../../controller/storage";

export type StorageSettings = CustomStorage | DataStorageSettings;

export function validSettings(options: any): options is StorageSettings {
	return options instanceof DataStorageSettings || options instanceof CustomStorage;
}

export function applySettings(app: IvipBaseApp) {
	const dbname: string | string[] = app.settings.databaseNames;
	const options: StorageSettings = app.settings.storage as any;
	if (options instanceof DataStorageSettings) {
		return new DataStorage(dbname, options, app);
	} else if (options instanceof CustomStorage) {
		return options;
	}
	return new DataStorage(dbname, options, app);
}

export { CustomStorage, DataStorage, DataStorageSettings };
