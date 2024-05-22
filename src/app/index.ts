import { SimpleEventEmitter, Types, Utils } from "ivipbase-core";
import { DEFAULT_ENTRY_NAME, _apps } from "./internal";
import { AppError, ERROR_FACTORY } from "../controller/erros";

import { LocalServer } from "../server";
import { CustomStorage, DataStorage, applySettings } from "./verifyStorage";
import { IvipBaseSettings, IvipBaseSettingsOptions } from "./settings";
import { DataBase } from "../database";
import { Auth } from "../auth";
import _request from "../controller/request";
import { connect as connectSocket } from "socket.io-client";
import { joinObjects } from "../utils";

type IOWebSocket = ReturnType<typeof connectSocket>;

const CONNECTION_STATE_DISCONNECTED = "disconnected";
const CONNECTION_STATE_CONNECTING = "connecting";
const CONNECTION_STATE_CONNECTED = "connected";
const CONNECTION_STATE_DISCONNECTING = "disconnecting";

export class IvipBaseApp extends SimpleEventEmitter {
	public _ready = false;

	readonly name: string = DEFAULT_ENTRY_NAME;
	public settings: IvipBaseSettings;
	public storage: CustomStorage;
	isDeleted: boolean = false;
	public isServer: boolean;
	server?: LocalServer;
	readonly databases: Map<string, DataBase> = new Map();
	readonly auth: Map<string, Auth> = new Map();

	private _connectionState:
		| typeof CONNECTION_STATE_DISCONNECTED
		| typeof CONNECTION_STATE_CONNECTING
		| typeof CONNECTION_STATE_CONNECTED
		| typeof CONNECTION_STATE_DISCONNECTING
		| typeof CONNECTION_STATE_DISCONNECTED;

	private _socket: IOWebSocket | null = null;

	constructor(options: Partial<IvipBaseApp>) {
		super();

		this._connectionState = CONNECTION_STATE_DISCONNECTED;

		if (typeof options.name === "string") {
			this.name = options.name;
		}

		this.settings = options.settings instanceof IvipBaseSettings ? options.settings : new IvipBaseSettings();

		if (typeof options.isDeleted === "boolean") {
			this.isDeleted = options.isDeleted;
		}

		this.storage = applySettings(this.settings.dbname, this.settings.storage);

		this.isServer = typeof this.settings.server === "object";

		this.on("ready", () => {
			this._ready = true;
		});
	}

	async initialize() {
		if (!this._ready) {
			if (this.settings.bootable) {
				const dbList: string[] = Array.isArray(this.settings.dbname) ? this.settings.dbname : [this.settings.dbname];

				await this.storage.ready();

				if (this.isServer) {
					this.server = new LocalServer(this, this.settings.server);
					await this.server.ready();
				}

				for (const dbName of dbList) {
					const db = new DataBase(dbName, this);
					await db.ready();
					this.databases.set(dbName, db);
				}
			}

			this.emit("ready");
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
			await new Promise((resolve) => this.once("ready", resolve));
		}
		callback?.();
	}

	get isConnected() {
		return true;
		//return this._connectionState === CONNECTION_STATE_CONNECTED;
	}
	get isConnecting() {
		return this._connectionState === CONNECTION_STATE_CONNECTING;
	}
	get connectionState() {
		return CONNECTION_STATE_CONNECTED;
		// return this._connectionState;
	}

	get socket() {
		return this._socket;
	}

	get isReady() {
		return this._ready;
	}

	get url(): string {
		return `${this.settings.protocol}://${this.settings.host ?? "localhost"}${typeof this.settings.port === "number" ? `:${this.settings.port}` : ""}`;
	}

	async request(options: {
		route: string;
		/**
		 * @default 'GET'
		 */
		method?: "GET" | "PUT" | "POST" | "DELETE";
		/**
		 * Data to post when method is PUT or POST
		 */
		data?: any;
		/**
		 * Context to add to PUT or POST requests
		 */
		context?: any;
		/**
		 * A method that overrides the default data receiving handler. Override for streaming.
		 */
		dataReceivedCallback?: (chunk: string) => void;
		/**
		 * A method that overrides the default data send handler. Override for streaming.
		 */
		dataRequestCallback?: (length: number) => string | Types.TypedArrayLike | Promise<string | Types.TypedArrayLike>;
		/**
		 * Whether to try the request even if there is no connection
		 * @default false
		 */
		ignoreConnectionState?: boolean;
		/**
		 * NEW Whether the returned object should contain an optionally returned context object.
		 * @default false
		 */
		includeContext?: boolean;
		/**
		 * The access token to use for the request
		 * @default undefined
		 */
		accessToken?: string;
	}): Promise<any | { context: any; data: any }> {
		const url = `${this.url}/${options.route.replace(/^\/+/, "")}`;

		return new Promise(async (resolve, reject) => {
			try {
				const result = await (async () => {
					try {
						return await _request(options.method || "GET", url, {
							data: options.data,
							accessToken: options.accessToken,
							dataReceivedCallback: options.dataReceivedCallback,
							dataRequestCallback: options.dataRequestCallback,
							context: options.context,
						});
					} catch (err: any) {
						// Rethrow the error
						throw err;
					}
				})();

				if (options.includeContext === true) {
					if (!result.context) {
						result.context = {};
					}
					return resolve(result);
				} else {
					return resolve(result.data);
				}
			} catch (err: any) {
				reject(err);
			}
		});
	}

	async projects(): Promise<
		{
			name: string;
			description: string;
			type: string;
		}[]
	> {
		return this.request({ route: "projects" });
	}

	async connect() {
		if (this._connectionState === CONNECTION_STATE_DISCONNECTED) {
			this._connectionState = CONNECTION_STATE_CONNECTING;

			this._socket = connectSocket(this.url);

			this._socket.on("connect", () => {
				this._connectionState = CONNECTION_STATE_CONNECTED;
				this.emit("connect");
			});

			this._socket.on("disconnect", () => {
				this._connectionState = CONNECTION_STATE_DISCONNECTED;
				this.emit("disconnect");
			});

			this._socket.on("reconnecting", () => {
				this._connectionState = CONNECTION_STATE_CONNECTING;
				this.emit("reconnecting");
			});

			this._socket.on("reconnect", () => {
				this._connectionState = CONNECTION_STATE_CONNECTED;
				this.emit("reconnect");
			});

			this._socket.on("reconnect_failed", () => {
				this._connectionState = CONNECTION_STATE_DISCONNECTED;
				this.emit("reconnect_failed");
			});
		}
	}

	async disconnect() {
		if (this._connectionState === CONNECTION_STATE_CONNECTED) {
			this._connectionState = CONNECTION_STATE_DISCONNECTING;
			this._socket?.disconnect();
		}
	}

	async reconnect() {
		if (this._connectionState === CONNECTION_STATE_DISCONNECTED) {
			this.connect();
		}
	}

	async destroy() {
		this.disconnect();
		// this._socket?.destroy();
	}

	async reset(options: IvipBaseSettingsOptions) {
		this._connectionState = CONNECTION_STATE_DISCONNECTED;
		this._socket = null;
		this._ready = false;
		this.isDeleted = false;

		await this.disconnect();

		this.settings = new IvipBaseSettings(joinObjects(this.settings.options, options));

		this.storage = applySettings(this.settings.dbname, this.settings.storage);

		this.isServer = typeof this.settings.server === "object";

		this.databases.clear();
		this.auth.clear();

		this.emit("reset");

		await this.initialize();
	}
}

export function initializeApp(options: IvipBaseSettingsOptions): IvipBaseApp {
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

	newApp.initialize();

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

export function getAppsName(): string[] {
	return Array.from(_apps.keys());
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
