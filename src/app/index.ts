import { ID, SimpleEventEmitter, Types, Utils } from "ivipbase-core";
import { DEFAULT_ENTRY_NAME, _apps } from "./internal";
import { AppError, ERROR_FACTORY } from "../controller/erros";

import { isPossiblyServer, LocalServer } from "../server";
import { CustomStorage, applySettings } from "./verifyStorage";
import { IvipBaseSettings } from "./settings";
import { DataBase } from "../database";
import { Auth } from "../auth";
import _request from "../controller/request";
import { connect as connectSocket } from "socket.io-client";
import { joinObjects } from "../utils";
import { RequestError } from "../controller/request/error";
import { IPCPeer, getIPCPeer } from "../ipc";
import { Storage } from "../storage";
import { AxiosProgressEvent } from "axios";
import { Local } from "../local";
import { IvipBaseSettingsBrowser, IvipBaseSettingsServer, IvipBaseSettingsOptions } from "./settings/browser";

type IOWebSocket = ReturnType<typeof connectSocket>;

const CONNECTION_STATE_DISCONNECTED = "disconnected";
const CONNECTION_STATE_CONNECTING = "connecting";
const CONNECTION_STATE_CONNECTED = "connected";
const CONNECTION_STATE_DISCONNECTING = "disconnecting";

export class IvipBaseApp extends SimpleEventEmitter {
	public _ready = false;
	public id = ID.generate();
	readonly name: string = DEFAULT_ENTRY_NAME;
	public settings: IvipBaseSettings;
	public storage: CustomStorage;
	isDeleted: boolean = false;
	public isServer: boolean;
	server?: LocalServer;
	readonly databases: Map<string, DataBase> = new Map();
	readonly auth: Map<string, Auth> = new Map();
	readonly storageFile: Map<string, Storage> = new Map();
	public local?: Local;

	private _connectionState:
		| typeof CONNECTION_STATE_DISCONNECTED
		| typeof CONNECTION_STATE_CONNECTING
		| typeof CONNECTION_STATE_CONNECTED
		| typeof CONNECTION_STATE_DISCONNECTING
		| typeof CONNECTION_STATE_DISCONNECTED;

	private _socket: IOWebSocket | null = null;
	private _ipc: IPCPeer | undefined | null = undefined;

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

		this.storage = applySettings(this);

		this.isServer = Boolean(typeof this.settings.server === "object" && this.settings.server !== null && this.settings.isServer);

		if (this.settings.isPossiplyServer) {
			this._ipc = getIPCPeer(this.name);
		}

		this.on("ready", (data) => {
			this._ready = true;
		});
	}

	on<d = undefined>(event: "ready", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
	on<d = undefined>(event: "connect", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
	on<d = undefined>(event: "disconnect", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
	on<d = undefined>(event: "reconnecting", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
	on<d = undefined>(event: "reconnect", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
	on<d = undefined>(event: "reconnect_failed", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
	on<d = undefined>(event: "reset", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
	on<d = undefined>(event: "destroyed", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
	on<d = IPCPeer>(event: "connectIPC", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
	on(event: string, callback: any) {
		return super.on(event, callback as any);
	}

	emit(event: "ready", data?: undefined): this;
	emit(event: "connect", data?: undefined): this;
	emit(event: "disconnect", data?: undefined): this;
	emit(event: "reconnecting", data?: undefined): this;
	emit(event: "reconnect", data?: undefined): this;
	emit(event: "reconnect_failed", data?: undefined): this;
	emit(event: "reset", data?: undefined): this;
	emit(event: "destroyed", data?: undefined): this;
	emit(event: "connectIPC", data: IPCPeer): this;
	emit(event: string, data: any) {
		super.emit(event, data);
		return this;
	}

	async initialize() {
		if (!this._ready) {
			const id = this.id;

			if (this.settings.bootable && !this.isServer && this.settings.databaseNames.length > 0) {
				await new Promise<void>((resolve) => {
					if (this._socket) {
						this.disconnect();
						this._socket = null;
					}

					const fn = () => resolve();

					this.once("connect", fn);

					this.on("reset", () => {
						this.off("connect", fn);
						resolve();
					});

					this.on("destroyed", () => {
						this.off("connect", fn);
						resolve();
					});

					this.connect();
				});
			}

			if (this.settings.bootable && this.id === id) {
				await this.storage.ready();

				if (this.isServer) {
					if (!this.server) {
						this.server = new LocalServer(this, this.settings.server);
					}

					await this.server.ready();
				}

				for (const dbName of this.settings.databaseNames) {
					const db = this.databases.get(dbName) ?? new DataBase(dbName, this);
					await db.ready();
					if (!this.databases.has(dbName)) {
						this.databases.set(dbName, db);
						this.storageFile.set(dbName, new Storage(this, db));
					}
				}
			}

			if (this.id === id) {
				this.emit("ready");
			}
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
		return this.isServer || this._connectionState === CONNECTION_STATE_CONNECTED;
	}

	get isConnecting() {
		return !this.isServer && this._connectionState === CONNECTION_STATE_CONNECTING;
	}

	get connectionState() {
		return this.isServer ? CONNECTION_STATE_CONNECTED : this._connectionState;
	}

	get socket() {
		return this._socket;
	}

	get ipc(): IPCPeer | undefined {
		if (!this.settings.isPossiplyServer) {
			return;
		}

		if (this._ipc instanceof IPCPeer === false) {
			this._ipc = getIPCPeer(this.name);
		}

		this._ipc.on("connect", () => {
			this.emit("connectIPC", this._ipc as any);
		});

		return this._ipc as IPCPeer;
	}

	async ipcReady(callback?: (ipc: IPCPeer) => void) {
		if (!this._ipc && this.settings.isPossiplyServer) {
			// Aguarda o evento ready
			await new Promise((resolve) => this.once("connectIPC", resolve));
		}
		if (this._ipc instanceof IPCPeer) {
			callback?.(this._ipc);
		}
	}

	async onConnect(callback: (socket: IOWebSocket | null) => void, isOnce: boolean = false) {
		let count = 0,
			isReset = false;
		const event = () => {
			if (isReset) {
				return;
			}

			if (this.isConnected) {
				count++;

				if (count > 1 && isOnce) {
					return;
				}

				callback(this.socket);
				if (isOnce) {
					this.off("connect", event);
				}

				return;
			}
		};

		if (!this.isServer && this.settings.databaseNames.length > 0) {
			this.on("connect", event);
		}

		event();

		this.on("reset", () => {
			isReset = true;
			this.off("connect", event);
		});

		this.on("destroyed", () => {
			isReset = true;
			this.off("connect", event);
		});

		return {
			stop: () => {
				this.off("connect", event);
			},
		};
	}

	get isReady() {
		return this._ready;
	}

	get url(): string {
		const { protocol, host, port } = this.settings.definitions;
		return `${protocol}://${host ?? "localhost"}${typeof port === "number" ? `:${port}` : ""}`;
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
		onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
		onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void;
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

	websocketRequest<ResponseType = Record<string, any>>(socket: IOWebSocket | null, event: string, data: any, dbName: string) {
		if (!socket) {
			throw new Error(`Cannot send request because websocket connection is not open`);
		}
		const requestId = ID.generate();
		const accessToken = this.auth.get(dbName)?.currentUser?.accessToken;
		// const request = data;
		// request.req_id = requestId;
		// request.access_token = accessToken;
		const request = { ...data, req_id: requestId, access_token: accessToken, dbName };

		type T = ResponseType & {
			req_id: string;
			success: boolean;
			reason?: string | { code: string; message: string };
		};
		return new Promise<T>((resolve, reject) => {
			const checkConnection = () => {
				if (!socket?.connected) {
					return reject(new RequestError(request, null, "websocket", "No open websocket connection"));
				}
			};
			checkConnection();

			let timeout: NodeJS.Timeout;

			const send = (retry = 0) => {
				checkConnection();
				socket.emit(event, request);
				timeout = setTimeout(() => {
					if (retry < 2) {
						return send(retry + 1);
					}
					socket.off("result", handle);
					const err = new RequestError(request, null, "timeout", `Server did not respond to "${event}" request after ${retry + 1} tries`);
					reject(err);
				}, 1000);
			};

			const handle = (response: T) => {
				if (response.req_id === requestId) {
					clearTimeout(timeout);
					socket.off("result", handle);
					if (response.success) {
						return resolve(response);
					}
					// Access denied?
					const code = typeof response.reason === "object" ? response.reason.code : response.reason;
					const message = typeof response.reason === "object" ? response.reason.message : `request failed: ${code}`;
					const err = new RequestError(request, response, code, message);
					reject(err);
				}
			};

			socket.on("result", handle);
			send();
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

			this._socket = connectSocket(this.url.replace(/^http(s?)/gi, "ws$1"), {
				// Use default socket.io connection settings:
				path: `/socket.io`,
				autoConnect: true,
				reconnectionDelay: 1000,
				reconnectionDelayMax: 5000,
				timeout: 20000,
				randomizationFactor: 0.5,
				transports: ["websocket"], // Override default setting of ['polling', 'websocket']
				query: {
					dbNames: JSON.stringify(this.settings.databaseNames),
					id: this.id,
				},
			});

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

			return;
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
		this._socket = null;
	}

	async reset(options: IvipBaseSettingsOptions): Promise<IvipBaseApp> {
		this._ready = false;
		this.emit("destroyed");
		this.id = ID.generate();
		await this.destroy();
		this._connectionState = CONNECTION_STATE_DISCONNECTED;
		this._socket = null;
		this.isDeleted = false;

		this.settings = new IvipBaseSettings(joinObjects(this.settings.options, options));

		this.storage = applySettings(this);

		this.isServer = typeof this.settings.server === "object";

		// this.auth.clear();
		this.databases.clear();
		this.storageFile.clear();

		this.emit("reset");

		await this.initialize();
		await this.ready();
		return this;
	}
}

function appendNewApp(app: IvipBaseApp) {
	const existingApp = _apps.get(app.name);
	if (existingApp) {
		if (Utils.deepEqual(app.settings, existingApp.settings)) {
			return existingApp;
		} else {
			throw ERROR_FACTORY.create(AppError.DUPLICATE_APP, { appName: app.name });
		}
	}

	_apps.set(app.name, app);

	app.initialize();

	return app;
}

export function initializeApp(options: IvipBaseSettingsBrowser): IvipBaseApp {
	const settings = new IvipBaseSettings({
		isServer: false,
		...(options as any),
	});

	const newApp: IvipBaseApp = new IvipBaseApp({
		name: settings.definitions.name,
		settings,
	});

	return appendNewApp(newApp);
}

export function initializeAppServer(options: IvipBaseSettingsServer): IvipBaseApp {
	if (!isPossiblyServer) {
		throw ERROR_FACTORY.create(AppError.INVALID_ARGUMENT, { message: "" });
	}

	const settings = new IvipBaseSettings({
		isServer: true,
		...(options as any),
	});

	const newApp: IvipBaseApp = new IvipBaseApp({
		name: settings.definitions.name,
		settings,
	});

	return appendNewApp(newApp);
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
