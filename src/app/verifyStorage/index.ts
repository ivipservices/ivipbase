import { IvipBaseApp } from "..";
import {
	CustomStorage,
	DataStorage,
	DataStorageSettings,
	JsonFileStorage,
	JsonFileStorageSettings,
	MongodbSettings,
	MongodbStorage,
	SqliteSettings,
	SqliteStorage,
	SequelizeSettings,
	SequelizeStorage,
} from "../../controller/storage";

export type StorageSettings = CustomStorage | DataStorageSettings | MongodbSettings | JsonFileStorageSettings | SqliteSettings | SequelizeSettings;

export function validSettings(options: any): options is StorageSettings {
	return (
		options instanceof DataStorageSettings ||
		options instanceof MongodbSettings ||
		options instanceof JsonFileStorageSettings ||
		options instanceof CustomStorage ||
		options instanceof SqliteSettings ||
		options instanceof SequelizeSettings
	);
}

export function applySettings(app: IvipBaseApp) {
	const dbname: string | string[] = app.settings.dbname;
	const options: StorageSettings = app.settings.storage as any;
	if (options instanceof DataStorageSettings) {
		return new DataStorage(dbname, options, app);
	} else if (options instanceof MongodbSettings) {
		return new MongodbStorage(dbname, options, app);
	} else if (options instanceof JsonFileStorageSettings) {
		return new JsonFileStorage(dbname, options, app);
	} else if (options instanceof SqliteSettings) {
		return new SqliteStorage(dbname, options, app);
	} else if (options instanceof SequelizeSettings) {
		return new SequelizeStorage(dbname, options, app);
	} else if (options instanceof CustomStorage) {
		return options;
	}
	return app.settings.isServer && app.settings.isPossiplyServer ? new SqliteStorage(dbname, options, app) : new DataStorage(dbname, {}, app);
}

export { CustomStorage, DataStorage, DataStorageSettings };
