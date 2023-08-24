import { IvipBaseApp, IvipBaseOptions, IvipBaseSettings } from "../../types/app";
import { _apps } from "./internal";

import { Utils } from "ivipbase-core";
import IvipBaseAppImpl from "./ivipBaseApp";

const DEFAULT_ENTRY_NAME = "[DEFAULT]";

export function initializeApp(_options: IvipBaseOptions, rawConfig: string | IvipBaseSettings): IvipBaseApp {
	let options = _options;

	if (typeof rawConfig !== "object") {
		const name = rawConfig;
		rawConfig = { name };
	}

	const config: Required<IvipBaseSettings> = Object.assign(
		{
			name: DEFAULT_ENTRY_NAME,
		},
		rawConfig,
	);

	const name = config.name;

	if (typeof name !== "string" || !name) {
		// throw ERROR_FACTORY.create(AppError.BAD_APP_NAME, {
		//     appName: String(name)
		// });
		throw "";
	}

	const existingApp = _apps.get(name) as IvipBaseAppImpl;
	if (existingApp) {
		// return the existing app if options and config deep equal the ones in the existing app.
		if (Utils.deepEqual(options, existingApp.options) && Utils.deepEqual(config, existingApp.config)) {
			return existingApp;
		} else {
			//throw ERROR_FACTORY.create(AppError.DUPLICATE_APP, { appName: name });
			throw "";
		}
	}

	const newApp = new IvipBaseAppImpl(options, config);

	_apps.set(name, newApp);

	return newApp;
}

export function appExists(name?: string): boolean {
	return typeof name === "string" && _apps.has(name);
}

export function getApp(name: string = DEFAULT_ENTRY_NAME): IvipBaseApp {
	const app = _apps.get(name);
	if (!app) {
		//throw ERROR_FACTORY.create(AppError.NO_APP, { appName: name });
		throw "";
	}
	return app;
}

export function getApps(): IvipBaseApp[] {
	return Array.from(_apps.values());
}

export function getFirstApp(): IvipBaseApp {
	const app = getApps()[0];
	if (!app) {
		//throw ERROR_FACTORY.create(AppError.NO_APP, { appName: name });
		throw "";
	}
	return app;
}

export function deleteApp(app: IvipBaseApp) {
	const name = app.name;
	if (_apps.has(name)) {
		_apps.delete(name);
		(app as IvipBaseAppImpl).isDeleted = true;
	}
}
