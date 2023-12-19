import { SimpleEventEmitter, Utils } from "ivipbase-core";
import { _apps } from "./internal";
import { AppError, ERROR_FACTORY } from "../controller/erros";

import { LocalServer, ServerSettings, isPossiblyServer } from "../server";
import { StorageSettings, DataStorageSettings, validSettings, CustomStorage, DataStorage, applySettings } from "./verifyStorage";

const DEFAULT_ENTRY_NAME = "[DEFAULT]";

class IvipBaseSettings {
	name: string = DEFAULT_ENTRY_NAME;
	dbname: string = "root";
	logLevel: "log" | "warn" | "error" = "log";
	storage: StorageSettings = new DataStorageSettings();

	server?: Partial<ServerSettings>;

	client?: {
		host: string;
		port: number;
	};

	constructor(options: Partial<IvipBaseSettings> = {}) {
		if (typeof options.name === "string") {
			this.name = options.name;
		}

		if (typeof options.dbname === "string") {
			this.dbname = options.dbname;
		}

		if (typeof options.logLevel === "string" && ["log", "warn", "error"].includes(options.logLevel)) {
			this.logLevel = options.logLevel;
		}

		if (validSettings(options.storage)) {
			this.storage = options.storage;
		}

		if (typeof options.server === "object") {
			if (isPossiblyServer) {
				this.server = options.server;
			} else {
				this.client = options.server as any;
			}
		}

		if (typeof options.client === "object") {
			this.client = Object.assign(this.client ?? {}, options.client);
		}
	}
}

export class IvipBaseApp extends SimpleEventEmitter {
	protected _ready = false;

	readonly name: string = DEFAULT_ENTRY_NAME;
	readonly settings: IvipBaseSettings = new IvipBaseSettings();
	readonly storage: CustomStorage = new DataStorage();
	isDeleted: boolean = false;
	readonly isServer: boolean;
	readonly server?: LocalServer;

	constructor(options: Partial<IvipBaseApp>) {
		super();

		if (typeof options.name === "string") {
			this.name = options.name;
		}

		if (options.settings instanceof IvipBaseSettings) {
			this.settings = options.settings;
		}

		if (typeof options.isDeleted === "boolean") {
			this.isDeleted = options.isDeleted;
		}

		this.storage = applySettings(this.settings.dbname, this.settings.storage);

		this.isServer = typeof this.settings.server === "object";

		this.once("ready", () => {
			this._ready = true;
		});

		if (this.isServer) {
			this.server = new LocalServer(this.name, this.settings.server);
			this.server.ready(() => {
				this.emitOnce("ready");
			});
		} else {
			this.emitOnce("ready");
		}
	}

	/**
	 * Aguarda o serviço estar pronto antes de executar o seu callback.
	 * @param callback (opcional) função de retorno chamada quando o serviço estiver pronto para ser usado. Você também pode usar a promise retornada.
	 * @returns retorna uma promise que resolve quando estiver pronto
	 */
	async ready(callback?: () => void) {
		if (!this._ready) {
			// Aguarda o evento ready
			await new Promise((resolve) => this.on("ready", resolve));
		}
		callback?.();
	}

	get isReady() {
		return this._ready;
	}
}

export function initializeApp(options: Partial<IvipBaseSettings>): IvipBaseApp {
	const settings = new IvipBaseSettings(options);

	const newApp: IvipBaseApp = new IvipBaseApp({
		name: settings.name,
		settings,
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
	let app: IvipBaseApp | undefined;
	if (_apps.has(DEFAULT_ENTRY_NAME)) {
		app = _apps.get(DEFAULT_ENTRY_NAME);
	}
	app = !app ? getApps()[0] : app;
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
