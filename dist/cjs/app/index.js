"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteApp = exports.getFirstApp = exports.getAppsName = exports.getApps = exports.getApp = exports.appExists = exports.initializeApp = exports.IvipBaseApp = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const internal_1 = require("./internal");
const erros_1 = require("../controller/erros");
const server_1 = require("../server");
const verifyStorage_1 = require("./verifyStorage");
const settings_1 = require("./settings");
const database_1 = require("../database");
const request_1 = __importDefault(require("../controller/request"));
const socket_io_client_1 = require("socket.io-client");
const utils_1 = require("../utils");
const error_1 = require("../controller/request/error");
const CONNECTION_STATE_DISCONNECTED = "disconnected";
const CONNECTION_STATE_CONNECTING = "connecting";
const CONNECTION_STATE_CONNECTED = "connected";
const CONNECTION_STATE_DISCONNECTING = "disconnecting";
class IvipBaseApp extends ivipbase_core_1.SimpleEventEmitter {
    constructor(options) {
        super();
        this._ready = false;
        this.name = internal_1.DEFAULT_ENTRY_NAME;
        this.isDeleted = false;
        this.databases = new Map();
        this.auth = new Map();
        this._socket = null;
        this._connectionState = CONNECTION_STATE_DISCONNECTED;
        if (typeof options.name === "string") {
            this.name = options.name;
        }
        this.settings = options.settings instanceof settings_1.IvipBaseSettings ? options.settings : new settings_1.IvipBaseSettings();
        if (typeof options.isDeleted === "boolean") {
            this.isDeleted = options.isDeleted;
        }
        this.storage = (0, verifyStorage_1.applySettings)(this.settings.dbname, this.settings.storage);
        this.isServer = typeof this.settings.server === "object";
        this.on("ready", () => {
            this._ready = true;
        });
    }
    async initialize() {
        var _a;
        if (!this._ready) {
            if (!this.isServer && (typeof this.settings.database === "string" || (Array.isArray(this.settings.database) && this.settings.database.length > 0))) {
                await new Promise((resolve) => {
                    if (this._socket) {
                        this.disconnect();
                        this._socket = null;
                    }
                    this.once("connect", () => {
                        resolve();
                    });
                    this.connect();
                });
            }
            if (this.settings.bootable) {
                const dbList = Array.isArray(this.settings.dbname) ? this.settings.dbname : [this.settings.dbname];
                await this.storage.ready();
                if (this.isServer) {
                    if (!this.server) {
                        this.server = new server_1.LocalServer(this, this.settings.server);
                    }
                    await this.server.ready();
                }
                for (const dbName of dbList) {
                    const db = (_a = this.databases.get(dbName)) !== null && _a !== void 0 ? _a : new database_1.DataBase(dbName, this);
                    await db.ready();
                    if (!this.databases.has(dbName)) {
                        this.databases.set(dbName, db);
                    }
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
    async ready(callback) {
        if (!this._ready) {
            // Aguarda o evento ready
            await new Promise((resolve) => this.once("ready", resolve));
        }
        callback === null || callback === void 0 ? void 0 : callback();
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
    async onConnect(callback, isOnce = false) {
        let count = 0;
        const event = () => {
            if (this._ready && this.isConnected) {
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
            if (!this._ready) {
                this.ready(() => {
                    event();
                });
            }
        };
        if (!this.isServer && (typeof this.settings.database === "string" || (Array.isArray(this.settings.database) && this.settings.database.length > 0))) {
            this.on("connect", event);
            event();
            return {
                stop: () => {
                    this.off("connect", event);
                },
            };
        }
        event();
        return {
            stop: () => { },
        };
    }
    get isReady() {
        return this._ready;
    }
    get url() {
        var _a;
        return `${this.settings.protocol}://${(_a = this.settings.host) !== null && _a !== void 0 ? _a : "localhost"}${typeof this.settings.port === "number" ? `:${this.settings.port}` : ""}`;
    }
    async request(options) {
        const url = `${this.url}/${options.route.replace(/^\/+/, "")}`;
        return new Promise(async (resolve, reject) => {
            try {
                const result = await (async () => {
                    try {
                        return await (0, request_1.default)(options.method || "GET", url, {
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
        var _a, _b;
        if (!socket) {
            throw new Error(`Cannot send request because websocket connection is not open`);
        }
        const requestId = ivipbase_core_1.ID.generate();
        const accessToken = (_b = (_a = this.auth.get(dbName)) === null || _a === void 0 ? void 0 : _a.currentUser) === null || _b === void 0 ? void 0 : _b.accessToken;
        // const request = data;
        // request.req_id = requestId;
        // request.access_token = accessToken;
        const request = Object.assign(Object.assign({}, data), { req_id: requestId, access_token: accessToken, dbName });
        return new Promise((resolve, reject) => {
            const checkConnection = () => {
                if (!(socket === null || socket === void 0 ? void 0 : socket.connected)) {
                    return reject(new error_1.RequestError(request, null, "websocket", "No open websocket connection"));
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
                    const err = new error_1.RequestError(request, null, "timeout", `Server did not respond to "${event}" request after ${retry + 1} tries`);
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
                    const err = new error_1.RequestError(request, response, code, message);
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
            this._socket = (0, socket_io_client_1.connect)(this.url, {
                // Use default socket.io connection settings:
                path: `/socket.io`,
                autoConnect: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000,
                randomizationFactor: 0.5,
                transports: ["websocket"], // Override default setting of ['polling', 'websocket']
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
        var _a;
        if (this._connectionState === CONNECTION_STATE_CONNECTED) {
            this._connectionState = CONNECTION_STATE_DISCONNECTING;
            (_a = this._socket) === null || _a === void 0 ? void 0 : _a.disconnect();
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
        await this.destroy();
        this._connectionState = CONNECTION_STATE_DISCONNECTED;
        this._socket = null;
        this._ready = false;
        this.isDeleted = false;
        this.settings = new settings_1.IvipBaseSettings((0, utils_1.joinObjects)(this.settings.options, options));
        this.storage = (0, verifyStorage_1.applySettings)(this.settings.dbname, this.settings.storage);
        this.isServer = typeof this.settings.server === "object";
        this.auth.clear();
        this.databases.clear();
        this.emit("reset");
        await this.initialize();
    }
}
exports.IvipBaseApp = IvipBaseApp;
function initializeApp(options) {
    const settings = new settings_1.IvipBaseSettings(options);
    const newApp = new IvipBaseApp({
        name: settings.name,
        settings,
    });
    const existingApp = internal_1._apps.get(newApp.name);
    if (existingApp) {
        if (ivipbase_core_1.Utils.deepEqual(newApp.settings, existingApp.settings)) {
            return existingApp;
        }
        else {
            throw erros_1.ERROR_FACTORY.create("duplicate-app" /* AppError.DUPLICATE_APP */, { appName: newApp.name });
        }
    }
    internal_1._apps.set(newApp.name, newApp);
    newApp.initialize();
    return newApp;
}
exports.initializeApp = initializeApp;
function appExists(name) {
    return typeof name === "string" && internal_1._apps.has(name);
}
exports.appExists = appExists;
function getApp(name = internal_1.DEFAULT_ENTRY_NAME) {
    const app = internal_1._apps.get(name);
    if (!app) {
        throw erros_1.ERROR_FACTORY.create("no-app" /* AppError.NO_APP */, { appName: name });
    }
    return app;
}
exports.getApp = getApp;
function getApps() {
    return Array.from(internal_1._apps.values());
}
exports.getApps = getApps;
function getAppsName() {
    return Array.from(internal_1._apps.keys());
}
exports.getAppsName = getAppsName;
function getFirstApp() {
    let app;
    if (internal_1._apps.has(internal_1.DEFAULT_ENTRY_NAME)) {
        app = internal_1._apps.get(internal_1.DEFAULT_ENTRY_NAME);
    }
    app = !app ? getApps()[0] : app;
    if (!app) {
        throw erros_1.ERROR_FACTORY.create("no-app" /* AppError.NO_APP */, { appName: internal_1.DEFAULT_ENTRY_NAME });
    }
    return app;
}
exports.getFirstApp = getFirstApp;
function deleteApp(app) {
    const name = app.name;
    if (internal_1._apps.has(name)) {
        internal_1._apps.delete(name);
        app.isDeleted = true;
    }
}
exports.deleteApp = deleteApp;
//# sourceMappingURL=index.js.map