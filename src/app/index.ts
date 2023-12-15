import { Utils } from "ivipbase-core";
import { CustomStorage, TempStorage } from "../storage";
import { _apps } from "./internal";
import { AppError, ERROR_FACTORY } from "../erros";

const DEFAULT_ENTRY_NAME = "[DEFAULT]";

class IvipBaseSettings {
	name: string = DEFAULT_ENTRY_NAME;

	constructor(options: Partial<IvipBaseSettings>) {
		if (typeof options.name === "string") {
			this.name = options.name;
		}
	}
}

export class IvipBaseApp {
	name: string = DEFAULT_ENTRY_NAME;
	settings: IvipBaseSettings = new IvipBaseSettings({});
	storage: CustomStorage = new TempStorage();
	isDeleted: boolean = false;

	constructor(options: Partial<IvipBaseApp>) {
		if (typeof options.name === "string") {
			this.name = options.name;
		}

		if (options.settings instanceof IvipBaseSettings) {
			this.settings = options.settings;
		}

		if (options.storage instanceof CustomStorage) {
			this.storage = options.storage;
		}

		if (typeof options.isDeleted === "boolean") {
			this.isDeleted = options.isDeleted;
		}
	}
}

export function initializeApp(options: Partial<IvipBaseSettings>, storage?: CustomStorage): IvipBaseApp {
	const settings = new IvipBaseSettings(options);

	const newApp: IvipBaseApp = new IvipBaseApp({
		name: settings.name,
		settings,
		storage,
	});

	const existingApp = _apps.get(newApp.name);
	if (existingApp) {
		if (Utils.deepEqual(newApp.settings, existingApp.settings)) {
			return existingApp;
		} else {
			throw ERROR_FACTORY.create(AppError.DUPLICATE_APP, { appName: newApp.name });
		}
	}

	_apps.set(newApp.name, newApp);

	return newApp;
}

export function appExists(name?: string): boolean {
	return typeof name === "string" && _apps.has(name);
}

export function getApp(name: string = DEFAULT_ENTRY_NAME): IvipBaseApp {
	const app = _apps.get(name);
	if (!app) {
		throw ERROR_FACTORY.create(AppError.NO_APP, { appName: name });
	}
	return app;
}

export function getApps(): IvipBaseApp[] {
	return Array.from(_apps.values());
}

export function getFirstApp(): IvipBaseApp {
	const app = getApps()[0];
	if (!app) {
		throw ERROR_FACTORY.create(AppError.NO_APP, { appName: DEFAULT_ENTRY_NAME });
	}
	return app;
}

export function deleteApp(app: IvipBaseApp) {
	const name = app.name;
	if (_apps.has(name)) {
		_apps.delete(name);
		app.isDeleted = true;
	}
}
