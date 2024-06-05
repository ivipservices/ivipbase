import { ID, SimpleEventEmitter, Utils } from "ivipbase-core";
import { DEFAULT_ENTRY_NAME, _apps } from "./internal.js";
import { ERROR_FACTORY } from "../controller/erros/index.js";
import { LocalServer } from "../server/index.js";
import { applySettings } from "./verifyStorage/index.js";
import { IvipBaseSettings } from "./settings/index.js";
import { DataBase } from "../database/index.js";
import _request from "../controller/request/index.js";
import { connect as connectSocket } from "socket.io-client";
import { joinObjects } from "../utils/index.js";
import { RequestError } from "../controller/request/error.js";
import { IPCPeer, getIPCPeer } from "../ipc/index.js";
const CONNECTION_STATE_DISCONNECTED = "disconnected";
const CONNECTION_STATE_CONNECTING = "connecting";
const CONNECTION_STATE_CONNECTED = "connected";
const CONNECTION_STATE_DISCONNECTING = "disconnecting";
export class IvipBaseApp extends SimpleEventEmitter {
    constructor(options) {
        super();
        this._ready = false;
        this.id = ID.generate();
        this.name = DEFAULT_ENTRY_NAME;
        this.isDeleted = false;
        this.databases = new Map();
        this.auth = new Map();
        this._socket = null;
        this._ipc = undefined;
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
        if (this.settings.isPossiplyServer) {
            this._ipc = getIPCPeer(this.name);
        }
        this.on("ready", (data) => {
            this._ready = true;
        });
    }
    on(event, callback) {
        return super.on(event, callback);
    }
    emit(event, data) {
        super.emit(event, data);
        return this;
    }
    async initialize() {
        if (!this._ready) {
            const id = this.id;
            if (!this.isServer && (typeof this.settings.database === "string" || (Array.isArray(this.settings.database) && this.settings.database.length > 0))) {
                await new Promise((resolve) => {
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
                const dbList = Array.isArray(this.settings.dbname) ? this.settings.dbname : [this.settings.dbname];
                await this.storage.ready();
                if (this.isServer) {
                    if (!this.server) {
                        this.server = new LocalServer(this, this.settings.server);
                    }
                    await this.server.ready();
                }
                for (const dbName of dbList) {
                    const db = this.databases.get(dbName) ?? new DataBase(dbName, this);
                    await db.ready();
                    if (!this.databases.has(dbName)) {
                        this.databases.set(dbName, db);
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
    async ready(callback) {
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
    get ipc() {
        if (!this.settings.isPossiplyServer) {
            return;
        }
        if (this._ipc instanceof IPCPeer === false) {
            this._ipc = getIPCPeer(this.name);
        }
        this._ipc.on("connect", () => {
            this.emit("connectIPC", this._ipc);
        });
        return this._ipc;
    }
    async ipcReady(callback) {
        if (!this._ipc && this.settings.isPossiplyServer) {
            // Aguarda o evento ready
            await new Promise((resolve) => this.once("connectIPC", resolve));
        }
        if (this._ipc instanceof IPCPeer) {
            callback?.(this._ipc);
        }
    }
    async onConnect(callback, isOnce = false) {
        let count = 0, isReset = false;
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
        if (!this.isServer && (typeof this.settings.database === "string" || (Array.isArray(this.settings.database) && this.settings.database.length > 0))) {
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
    get url() {
        return `${this.settings.protocol}://${this.settings.host ?? "localhost"}${typeof this.settings.port === "number" ? `:${this.settings.port}` : ""}`;
    }
    async request(options) {
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
                    }
                    catch (err) {
                        // Rethrow the error
                        throw err;
                    }
                })();
                if (options.includeContext === true) {
                    if (!result.context) {
                        result.context = {};
                    }
                    return resolve(result);
                }
                else {
                    return resolve(result.data);
                }
            }
            catch (err) {
                reject(err);
            }
        });
    }
    websocketRequest(socket, event, data, dbName) {
        if (!socket) {
            throw new Error(`Cannot send request because websocket connection is not open`);
        }
        const requestId = ID.generate();
        const accessToken = this.auth.get(dbName)?.currentUser?.accessToken;
        // const request = data;
        // request.req_id = requestId;
        // request.access_token = accessToken;
        const request = { ...data, req_id: requestId, access_token: accessToken, dbName };
        return new Promise((resolve, reject) => {
            const checkConnection = () => {
                if (!socket?.connected) {
                    return reject(new RequestError(request, null, "websocket", "No open websocket connection"));
                }
            };
            checkConnection();
            let timeout;
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
            const handle = (response) => {
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
    async projects() {
        return this.request({ route: "projects" });
    }
    async connect() {
        if (this._connectionState === CONNECTION_STATE_DISCONNECTED) {
            this._connectionState = CONNECTION_STATE_CONNECTING;
            const dbNames = Array.isArray(this.settings.dbname) ? this.settings.dbname : [this.settings.dbname];
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
                    dbNames: JSON.stringify(dbNames),
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
    async reset(options) {
        this.emit("destroyed");
        this.id = ID.generate();
        await this.destroy();
        this._connectionState = CONNECTION_STATE_DISCONNECTED;
        this._socket = null;
        this._ready = false;
        this.isDeleted = false;
        this.settings = new IvipBaseSettings(joinObjects(this.settings.options, options));
        this.storage = applySettings(this.settings.dbname, this.settings.storage);
        this.isServer = typeof this.settings.server === "object";
        // this.auth.clear();
        this.databases.clear();
        this.emit("reset");
        await this.initialize();
    }
}
export function initializeApp(options) {
    const settings = new IvipBaseSettings(options);
    const newApp = new IvipBaseApp({
        name: settings.name,
        settings,
    });
    const existingApp = _apps.get(newApp.name);
    if (existingApp) {
        if (Utils.deepEqual(newApp.settings, existingApp.settings)) {
            return existingApp;
        }
        else {
            throw ERROR_FACTORY.create("duplicate-app" /* AppError.DUPLICATE_APP */, { appName: newApp.name });
        }
    }
    _apps.set(newApp.name, newApp);
    newApp.initialize();
    return newApp;
}
export function appExists(name) {
    return typeof name === "string" && _apps.has(name);
}
export function getApp(name = DEFAULT_ENTRY_NAME) {
    const app = _apps.get(name);
    if (!app) {
        throw ERROR_FACTORY.create("no-app" /* AppError.NO_APP */, { appName: name });
    }
    return app;
}
export function getApps() {
    return Array.from(_apps.values());
}
export function getAppsName() {
    return Array.from(_apps.keys());
}
export function getFirstApp() {
    let app;
    if (_apps.has(DEFAULT_ENTRY_NAME)) {
        app = _apps.get(DEFAULT_ENTRY_NAME);
    }
    app = !app ? getApps()[0] : app;
    if (!app) {
        throw ERROR_FACTORY.create("no-app" /* AppError.NO_APP */, { appName: DEFAULT_ENTRY_NAME });
    }
    return app;
}
export function deleteApp(app) {
    const name = app.name;
    if (_apps.has(name)) {
        _apps.delete(name);
        app.isDeleted = true;
    }
}
//# sourceMappingURL=index.js.map