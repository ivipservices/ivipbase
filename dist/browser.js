(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ivipbase = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
const ipc_1 = require("../ipc");
const CONNECTION_STATE_DISCONNECTED = "disconnected";
const CONNECTION_STATE_CONNECTING = "connecting";
const CONNECTION_STATE_CONNECTED = "connected";
const CONNECTION_STATE_DISCONNECTING = "disconnecting";
class IvipBaseApp extends ivipbase_core_1.SimpleEventEmitter {
    constructor(options) {
        super();
        this._ready = false;
        this.id = ivipbase_core_1.ID.generate();
        this.name = internal_1.DEFAULT_ENTRY_NAME;
        this.isDeleted = false;
        this.databases = new Map();
        this.auth = new Map();
        this._socket = null;
        this._ipc = undefined;
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
        if (this.settings.isPossiplyServer) {
            this._ipc = (0, ipc_1.getIPCPeer)(this.name);
        }
        this.on("ready", () => {
            this._ready = true;
        });
    }
    async initialize() {
        var _a;
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
    get ipc() {
        if (!this.settings.isPossiplyServer) {
            return;
        }
        if (this._ipc instanceof ipc_1.IPCPeer === false) {
            this._ipc = (0, ipc_1.getIPCPeer)(this.name);
        }
        return this._ipc;
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
            this._socket = (0, socket_io_client_1.connect)(this.url.replace(/^http(s?)/gi, "ws$1"), {
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
        this.emit("destroyed");
        this.id = ivipbase_core_1.ID.generate();
        await this.destroy();
        this._connectionState = CONNECTION_STATE_DISCONNECTED;
        this._socket = null;
        this._ready = false;
        this.isDeleted = false;
        this.settings = new settings_1.IvipBaseSettings((0, utils_1.joinObjects)(this.settings.options, options));
        this.storage = (0, verifyStorage_1.applySettings)(this.settings.dbname, this.settings.storage);
        this.isServer = typeof this.settings.server === "object";
        // this.auth.clear();
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

},{"../controller/erros":7,"../controller/request":10,"../controller/request/error":11,"../database":24,"../ipc":28,"../server":31,"../utils":34,"./internal":2,"./settings":3,"./verifyStorage":4,"ivipbase-core":99,"socket.io-client":104}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._apps = exports.DEFAULT_ENTRY_NAME = void 0;
exports.DEFAULT_ENTRY_NAME = "[DEFAULT]";
/**
 * @internal
 */
exports._apps = new Map();

},{}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IvipBaseSettings = exports.ServerEmailSettings = void 0;
const internal_1 = require("../internal");
const verifyStorage_1 = require("../verifyStorage");
class NotImplementedError extends Error {
    constructor(name) {
        super(`${name} is not implemented`);
    }
}
class ServerEmailSettings {
    constructor(options) {
        this.prepareModel = () => ({
            title: "",
            subject: "",
            message: "",
        });
        this.server = options.server;
    }
    /** Função a ser chamada quando um e-mail precisa ser enviado */
    send(request) {
        throw new NotImplementedError("ServerEmail");
    }
}
exports.ServerEmailSettings = ServerEmailSettings;
const hostnameRegex = /^((https?):\/\/)?(localhost|([\da-z\.-]+\.[a-z\.]{2,6}|[\d\.]+))(\:{1}(\d+))?$/;
class IvipBaseSettings {
    constructor(options = {}) {
        this.options = options;
        this.name = internal_1.DEFAULT_ENTRY_NAME;
        this.dbname = "root";
        this.database = {
            name: "root",
            description: "iVipBase database",
        };
        this.description = "";
        this.logLevel = "log";
        this.storage = new verifyStorage_1.DataStorageSettings();
        this.protocol = "http";
        this.host = "localhost";
        this.isServer = false;
        this.isValidClient = true;
        this.isConnectionDefined = false;
        this.bootable = true;
        this.defaultRules = { rules: {} };
        this.reset(options);
    }
    get isPossiplyServer() {
        return false;
    }
    reset(options = {}) {
        var _a, _b, _c, _d;
        if (typeof options.name === "string") {
            this.name = options.name;
        }
        if (typeof options.dbname === "string" || Array.isArray(options.dbname)) {
            this.dbname = (Array.isArray(options.dbname) ? options.dbname : [options.dbname]).filter((n) => typeof n === "string" && n.trim() !== "");
            this.dbname = this.dbname.length > 0 ? this.dbname : "root";
        }
        if (Array.isArray(options.database) || typeof options.database === "object") {
            this.database = (Array.isArray(options.database) ? options.database : [options.database]).filter((o) => {
                return typeof o === "object" && typeof o.name === "string" && o.name.trim() !== "";
            });
            this.dbname = Array.isArray(this.dbname) ? this.dbname : typeof this.dbname === "string" ? [this.dbname] : [];
            this.dbname = this.dbname.concat(this.database.map(({ name }) => name));
            this.dbname = this.dbname.length > 0 ? this.dbname : "root";
        }
        const databases = Array.isArray(this.dbname) ? this.dbname : [this.dbname];
        this.database = Array.isArray(this.database) ? this.database : [this.database];
        databases.forEach((name) => {
            const index = this.database.findIndex((db) => db.name === name);
            if (index === -1) {
                this.database.push({ name, description: `IvipBase database` });
            }
        });
        this.description = (_a = options.description) !== null && _a !== void 0 ? _a : `IvipBase database`;
        if (typeof options.logLevel === "string" && ["log", "warn", "error"].includes(options.logLevel)) {
            this.logLevel = options.logLevel;
        }
        if ((0, verifyStorage_1.validSettings)(options.storage)) {
            this.storage = options.storage;
        }
        const [_, _protocol, protocol, host, _host, _port, port] = (_b = (typeof options.host === "string" ? options.host : "").match(hostnameRegex)) !== null && _b !== void 0 ? _b : [];
        this.isConnectionDefined = !!host;
        this.protocol = ["https", "http"].includes(protocol) ? protocol : options.protocol === "https" ? "https" : "http";
        this.host = host !== null && host !== void 0 ? host : "localhost";
        this.port = port ? parseInt(port) : options.port;
        this.bootable = (_c = options.bootable) !== null && _c !== void 0 ? _c : true;
        this.defaultRules = (_d = options.defaultRules) !== null && _d !== void 0 ? _d : { rules: {} };
    }
}
exports.IvipBaseSettings = IvipBaseSettings;

},{"../internal":2,"../verifyStorage":4}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStorageSettings = exports.DataStorage = exports.CustomStorage = exports.applySettings = exports.validSettings = void 0;
const storage_1 = require("../../controller/storage");
Object.defineProperty(exports, "CustomStorage", { enumerable: true, get: function () { return storage_1.CustomStorage; } });
Object.defineProperty(exports, "DataStorage", { enumerable: true, get: function () { return storage_1.DataStorage; } });
Object.defineProperty(exports, "DataStorageSettings", { enumerable: true, get: function () { return storage_1.DataStorageSettings; } });
function validSettings(options) {
    return options instanceof storage_1.DataStorageSettings || options instanceof storage_1.CustomStorage;
}
exports.validSettings = validSettings;
function applySettings(dbname, options) {
    if (options instanceof storage_1.DataStorageSettings) {
        return new storage_1.DataStorage(dbname, options);
    }
    else if (options instanceof storage_1.CustomStorage) {
        return options;
    }
    return new storage_1.DataStorage(dbname, options);
}
exports.applySettings = applySettings;

},{"../../controller/storage":20}],5:[function(require,module,exports){
"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuth = exports.Auth = exports.AuthUser = void 0;
const app_1 = require("../app");
const database_1 = require("../database");
const ivipbase_core_1 = require("ivipbase-core");
const localStorage_1 = __importDefault(require("../utils/localStorage"));
const utils_1 = require("../utils");
const base64_1 = __importDefault(require("../utils/base64"));
const AUTH_USER_LOGIN_ERROR_MESSAGE = "auth/login-failed";
class AuthUser {
    constructor(auth, user, access_token = undefined) {
        var _a, _b, _c;
        this.auth = auth;
        /**
         * Whether the user's email address has been verified
         */
        this.emailVerified = false;
        /**
         * Whether the user has to change their password
         */
        this.changePassword = false;
        this._lastAccessTokenRefresh = 0;
        Object.assign(this, user);
        if (!user.uid) {
            throw new Error("User details is missing required uid field");
        }
        this.uid = user.uid;
        this.displayName = (_a = user.displayName) !== null && _a !== void 0 ? _a : "unknown";
        this.created = (_b = user.created) !== null && _b !== void 0 ? _b : new Date(0).toISOString();
        this.settings = (_c = user.settings) !== null && _c !== void 0 ? _c : {};
        this._accessToken = access_token;
        this._lastAccessTokenRefresh = 0;
    }
    get accessToken() {
        return this._accessToken;
    }
    get providerData() {
        return [];
    }
    /**
     * Atualiza os dados do perfil de um usuário.
     * @param profile O displayName e o photoURL do perfil para atualizar.
     * @returns Uma promise que é resolvida quando a atualização for concluída.
     * @throws auth/invalid-display-name Lançado se o nome de exibição for inválido.
     * @throws auth/invalid-photo-url Lançado se a URL da foto for inválida.
     */
    async updateProfile(profile) {
        var _a;
        const result = await this.auth.app.request({ method: "POST", route: `/auth/${this.auth.database}/update`, data: profile });
        Object.assign(this, (_a = result.user) !== null && _a !== void 0 ? _a : {});
    }
    /**
     * Atualiza o endereço de e-mail do usuário.
     * @param email O novo endereço de e-mail do usuário.
     * @returns Uma promise que é resolvida se o novo e-mail for válido e atualizado com sucesso no banco de dados do usuário.
     * @throws auth/email-already-in-use Lançado se o e-mail já estiver em uso por outro usuário.
     * @throws auth/invalid-email Lançado se o e-mail não for válido.
     * @throws auth/requires-recent-login Lançado se o último tempo de login do usuário não atender ao limite de segurança. Use reauthenticateWithCredential para resolver. Isso não se aplica se o usuário for anônimo.
     */
    async updateEmail(email) {
        var _a;
        const result = await this.auth.app.request({
            method: "POST",
            route: `/auth/${this.auth.database}/update`,
            data: {
                email,
            },
        });
        Object.assign(this, (_a = result.user) !== null && _a !== void 0 ? _a : {});
    }
    /**
     * Atualiza o nome de usuário do usuário.
     * @param username O novo nome de usuário do usuário.
     * @returns Uma promise que é resolvida se o novo nome de usuário for válido e atualizado com sucesso no banco de dados do usuário.
     * @throws auth/username-already-in-use Lançado se o nome de usuário já estiver em uso por outro usuário.
     * @throws auth/invalid-username Lançado se o nome de usuário não for válido.
     * @throws auth/requires-recent-login Lançado se o último tempo de login do usuário não atender ao limite de segurança. Use reauthenticateWithCredential para resolver. Isso não se aplica se o usuário for anônimo.
     */
    async updateUsername(username) {
        var _a;
        const result = await this.auth.app.request({
            method: "POST",
            route: `/auth/${this.auth.database}/update`,
            data: {
                username,
            },
        });
        Object.assign(this, (_a = result.user) !== null && _a !== void 0 ? _a : {});
    }
    /**
     * Atualiza a senha do usuário.
     * @param currentPassword A senha atual do usuário.
     * @param newPassword A nova senha do usuário.
     * @returns Uma promise que é resolvida se a nova senha for válida e atualizada com sucesso no banco de dados do usuário.
     * @throws auth/weak-password Lançado se a senha não for forte o suficiente.
     * @throws auth/requires-recent-login Lançado se o último tempo de login do usuário não atender ao limite de segurança. Use reauthenticateWithCredential para resolver. Isso não se aplica se o usuário for anônimo.
     */
    async updatePassword(currentPassword, newPassword) {
        if (!this.accessToken) {
            throw new Error(`auth/requires-recent-login`);
        }
        const result = await this.auth.app.request({
            method: "POST",
            route: `/auth/${this.auth.database}/change_password`,
            data: { uid: this.uid, password: currentPassword, new_password: newPassword },
        });
        this._accessToken = result.access_token;
        this._lastAccessTokenRefresh = Date.now();
        this.auth.emit("signin", this);
    }
    /**
     * Envia um e-mail de verificação para um usuário.
     * @returns Uma promise que é resolvida quando o e-mail for enviado.
     * @throws auth/missing-android-pkg-name Lançado se o nome do pacote Android estiver ausente quando o aplicativo Android for necessário.
     * @throws auth/missing-continue-uri Lançado se a URL de continuação estiver ausente quando o widget da web for necessário.
     * @throws auth/missing-ios-bundle-id Lançado se o ID do pacote iOS estiver ausente quando o aplicativo iOS for necessário.
     * @throws auth/invalid-continue-uri Lançado se a URL de continuação for inválida.
     * @throws auth/unauthorized-continue-uri Lançado se o domínio da URL de continuação não estiver na lista de permissões. Coloque o domínio na lista de permissões no console do Firebase.
     */
    async sendEmailVerification() {
        if (!this.accessToken) {
            throw new Error(`auth/requires-recent-login`);
        }
        const result = await this.auth.app.request({
            method: "POST",
            route: `/auth/${this.auth.database}/send_email_verification`,
            data: { username: this.username, email: this.email },
        });
    }
    /**
     * Exclui a conta do usuário (também desconecta o usuário)
     * @returns Uma promise que é resolvida quando a conta do usuário for excluída
     * @throws auth/requires-recent-login Lançado se o último tempo de login do usuário não atender ao limite de segurança. Use reauthenticateWithCredential para resolver. Isso não se aplica se o usuário for anônimo.
     */
    async delete() {
        const result = await this.auth.app.request({ method: "POST", route: `/auth/${this.auth.database}/delete`, data: { uid: this.uid } });
        if (result) {
            const access_token = this._accessToken;
            this._accessToken = undefined;
            this._lastAccessTokenRefresh = 0;
            this.auth.emit("signout", access_token);
        }
    }
    /**
     * Retorna um JSON Web Token (JWT) usado para identificar o usuário a um serviço Firebase.
     * @param forceRefresh Indica se deve ou não forçar a atualização do token
     * @returns Uma promise que é resolvida com o token atual se não tiver expirado. Caso contrário, será null.
     */
    async getIdToken(forceRefresh) {
        var _a, _b;
        const now = Date.now();
        forceRefresh = forceRefresh || now - this._lastAccessTokenRefresh > 1000 * 60 * 15; // 15 minutes
        if (this._accessToken && forceRefresh) {
            this._lastAccessTokenRefresh = Date.now();
            try {
                const result = await this.auth.app.request({
                    method: "POST",
                    route: `/auth/${this.auth.database}/signin`,
                    data: { method: "token", access_token: this._accessToken, client_id: this.auth.app.socket && this.auth.app.socket.id },
                });
                Object.assign(this, (_a = result.user) !== null && _a !== void 0 ? _a : {});
                this._accessToken = result.access_token;
                this.auth.emit("signin", this);
            }
            catch (_c) {
                this._lastAccessTokenRefresh = 0;
                const access_token = this._accessToken;
                this._accessToken = undefined;
                this.auth.emit("signout", access_token);
                throw new Error(AUTH_USER_LOGIN_ERROR_MESSAGE);
            }
        }
        return Promise.resolve((_b = this._accessToken) !== null && _b !== void 0 ? _b : "");
    }
    /**
     * Retorna um JSON Web Token (JWT) desserializado usado para identificar o usuário a um serviço Firebase.
     * @param forceRefresh Indica se deve ou não forçar a atualização do token
     * @returns Uma promise que é resolvida com o token atual se não tiver expirado. Caso contrário, será null.
     */
    getIdTokenResult(forceRefresh) {
        throw new Error("Method not implemented.");
    }
    /**
     * Atualiza o usuário atual, se estiver conectado.
     * @returns Uma promise que é resolvida com o usuário atual após uma possível atualização do token.
     */
    async reload(forceRefresh = true) {
        if (!this._accessToken) {
            throw new Error(AUTH_USER_LOGIN_ERROR_MESSAGE);
        }
        await this.getIdToken(forceRefresh);
    }
    /**
     * Retorna uma representação JSON serializável deste objeto.
     * @returns Uma representação JSON serializável deste objeto.
     */
    toJSON() {
        var _a;
        return {
            uid: this.uid,
            username: this.username,
            email: this.email,
            displayName: this.displayName,
            photoURL: this.photoURL,
            emailVerified: this.emailVerified,
            created: this.created,
            prevSignin: this.prevSignin,
            prevSigninIp: this.prevSigninIp,
            lastSignin: this.lastSignin,
            lastSigninIp: this.lastSigninIp,
            changePassword: this.changePassword,
            changePasswordRequested: this.changePasswordRequested,
            changePasswordBefore: this.changePasswordBefore,
            settings: this.settings,
            accessToken: this.accessToken,
            providerData: (_a = this.providerData) !== null && _a !== void 0 ? _a : [],
        };
    }
    /**
     * Cria uma instância de AuthUser a partir de um objeto JSON.
     * @param auth Uma instância de Auth.
     * @param json Um objeto JSON representando um usuário.
     * @returns Uma instância de AuthUser criada a partir do objeto JSON.
     */
    static fromJSON(auth, json) {
        const { accessToken, providerData } = json, userInfo = __rest(json, ["accessToken", "providerData"]);
        return new AuthUser(auth, userInfo, accessToken);
    }
}
exports.AuthUser = AuthUser;
class Auth extends ivipbase_core_1.SimpleEventEmitter {
    constructor(database, app) {
        super();
        this.database = database;
        this.app = app;
        this._ready = false;
        /**
         * Currently signed in user
         */
        this._user = null;
        this.isValidAuth = app.isServer || !app.settings.isValidClient ? false : true;
        this.on("ready", () => {
            this._ready = true;
        });
        this.on("signin", (user) => {
            var _a;
            try {
                if (user) {
                    this._user = user;
                    localStorage_1.default.setItem(`[${this.database}][auth_user]`, base64_1.default.encode(JSON.stringify(user.toJSON())));
                }
                else {
                    this._user = null;
                    localStorage_1.default.removeItem(`[${this.database}][auth_user]`);
                }
            }
            catch (_b) {
                this._user = null;
                localStorage_1.default.removeItem(`[${this.database}][auth_user]`);
            }
            if (!this._ready) {
                this.emit("ready");
            }
            (_a = this.app.socket) === null || _a === void 0 ? void 0 : _a.emit("signin", { dbName: this.database, accessToken: user.accessToken });
        });
        this.on("signout", (accessToken) => {
            var _a;
            this._user = null;
            localStorage_1.default.removeItem(`[${this.database}][auth_user]`);
            if (!this._ready) {
                this.emit("ready");
            }
            if (accessToken) {
                (_a = this.app.socket) === null || _a === void 0 ? void 0 : _a.emit("signout", { dbName: this.database, accessToken });
            }
        });
        this.initialize();
    }
    async initialize() {
        this._ready = false;
        this.app.onConnect(async (socket) => {
            var _a;
            try {
                if (!this._user) {
                    const user = localStorage_1.default.getItem(`[${this.database}][auth_user]`);
                    if (user) {
                        this._user = AuthUser.fromJSON(this, JSON.parse(base64_1.default.decode(user)));
                        await this._user.reload(false);
                    }
                    else if (!this._ready) {
                        this.emit("ready");
                    }
                }
                if (((_a = this._user) === null || _a === void 0 ? void 0 : _a.accessToken) && socket) {
                    socket.emit("signin", { dbName: this.database, accessToken: this._user.accessToken });
                }
            }
            catch (_b) {
                this._user = null;
                localStorage_1.default.removeItem(`[${this.database}][auth_user]`);
                if (!this._ready) {
                    this.emit("ready");
                }
            }
        }, true);
    }
    /**
     * Aguarda até que o módulo Auth esteja pronto.
     * @param callback Uma função de retorno de chamada que será chamada quando o módulo Auth estiver pronto.
     * @returns Uma promise que é resolvida quando o módulo Auth estiver pronto.
     */
    async ready(callback) {
        if (!this._ready) {
            // Aguarda o evento ready
            await new Promise((resolve) => this.once("ready", resolve));
        }
        callback === null || callback === void 0 ? void 0 : callback(this._user);
    }
    get user() {
        return this._user;
    }
    set user(value) {
        try {
            if (value) {
                localStorage_1.default.setItem(`[${this.database}][auth_user]`, base64_1.default.encode(JSON.stringify(value.toJSON())));
            }
            else {
                localStorage_1.default.removeItem(`[${this.database}][auth_user]`);
            }
        }
        catch (_a) { }
        this._user = value;
    }
    get currentUser() {
        return this.user;
    }
    handleSignInResult(result, emitEvent = true) {
        if (!result || !result.user || !result.access_token) {
            this.user = null;
            this.emit("signout");
            throw new Error("auth/user-not-found");
        }
        const user = new AuthUser(this, result.user, result.access_token);
        this.user = user;
        const details = { user: user, accessToken: result.access_token, provider: result.provider };
        emitEvent && this.emit("signin", details.user);
        return this.user;
    }
    /**
     * Cria uma nova conta de usuário associada ao endereço de e-mail e senha especificados.
     * @param email O endereço de e-mail do usuário.
     * @param password A senha escolhida pelo usuário.
     * @param signIn Se deve ou não fazer login após a criação do usuário
     * @returns Uma promise que é resolvida com as informações do novo usuário criado.
     * @throws auth/email-already-in-use Lançado se já existir uma conta com o endereço de e-mail fornecido.
     * @throws auth/invalid-email Lançado se o endereço de e-mail não for válido.
     * @throws auth/operation-not-allowed Lançado se contas de e-mail/senha não estiverem habilitadas. Habilite contas de e-mail/senha no Console do Firebase, na aba Auth.
     * @throws auth/weak-password Lançado se a senha não for forte o suficiente.
     */
    async createUserWithEmailAndPassword(email, password, signIn = true) {
        const result = await this.app.request({
            method: "POST",
            route: `/auth/${this.database}/signup`,
            data: {
                username: (0, utils_1.sanitizeEmailPrefix)(email),
                email,
                password,
                displayName: email,
                display_name: email,
                settings: {},
            },
        });
        if (signIn) {
            return this.handleSignInResult(result);
        }
        return new AuthUser(this, result.user, result.access_token);
    }
    /**
     * Cria uma nova conta de usuário associada ao nome de usuário e senha especificados.
     * @param username O nome de usuário do usuário.
     * @param email O endereço de e-mail do usuário.
     * @param password A senha escolhida pelo usuário.
     * @param signIn Se deve ou não fazer login após a criação do usuário
     * @returns Uma promise que é resolvida com as informações do novo usuário criado.
     * @throws auth/email-already-in-use Lançado se já existir uma conta com o endereço de e-mail fornecido.
     * @throws auth/invalid-email Lançado se o endereço de e-mail não for válido.
     * @throws auth/operation-not-allowed Lançado se contas de e-mail/senha não estiverem habilitadas. Habilite contas de e-mail/senha no Console do Firebase, na aba Auth.
     * @throws auth/weak-password Lançado se a senha não for forte o suficiente.
     * @throws auth/username-already-in-use Lançado se já existir uma conta com o nome de usuário fornecido.
     * @throws auth/invalid-username Lançado se o nome de usuário não for válido.
     * @throws auth/operation-not-allowed Lançado se contas de nome de usuário/senha não estiverem habilitadas. Habilite contas de nome de usuário/senha no Console do Firebase, na aba Auth.
     * @throws auth/weak-username Lançado se o nome de usuário não for forte o suficiente.
     * @throws auth/username-not-allowed Lançado se o nome de usuário não for permitido.
     * @throws auth/username-not-found Lançado se não houver usuário correspondente ao nome de usuário fornecido.
     * @throws auth/username-required Lançado se o nome de usuário não for fornecido.
     * @throws auth/email-required Lançado se o endereço de e-mail não for fornecido.
     * @throws auth/password-required Lançado se a senha não for fornecida.
     * @throws auth/username-email-mismatch Lançado se o nome de usuário e o endereço de e-mail não corresponderem.
     * @throws auth/username-email-already-in-use Lançado se já existir uma conta com o nome de usuário ou endereço de e-mail fornecido.
     * @throws auth/username-email-not-found Lançado se não houver usuário correspondente ao nome de usuário ou endereço de e-mail fornecido.
     * @throws auth/username-email-required Lançado se o nome de usuário e o endereço de e-mail não forem fornecidos.
     * @throws auth/username-email-require-recent-login Lançado se o último tempo de login do usuário não atender ao limite de segurança. Use reauthenticateWithCredential para resolver. Isso não se aplica se o usuário for anônimo.
     */
    async createUserWithUsernameAndPassword(username, email, password, signIn = true) {
        const result = await this.app.request({
            method: "POST",
            route: `/auth/${this.database}/signup`,
            data: {
                username,
                email,
                password,
                displayName: email,
                display_name: email,
                settings: {},
            },
        });
        if (signIn) {
            return this.handleSignInResult(result);
        }
        return new AuthUser(this, result.user, result.access_token);
    }
    /**
     * Loga de forma assíncrona usando um email e senha.
     * @param email O endereço de e-mail do usuário.
     * @param password A senha do usuário.
     * @returns Uma promise que é resolvida com as informações do usuário recém-criado.
     * @throws auth/desconnect Lançado se o servidor não estiver conectado.
     * @throws auth/system-error Lançado se ocorrer um erro interno no servidor.
     * @throws auth/invalid-email Lançado se o endereço de e-mail não for válido.
     * @throws auth/user-disabled Lançado se o usuário correspondente ao e-mail fornecido foi desativado.
     * @throws auth/user-not-found Lançado se não houver usuário correspondente ao e-mail fornecido.
     * @throws auth/wrong-password Lançado se a senha for inválida para o e-mail fornecido, ou se a conta correspondente ao e-mail não tiver uma senha definida.
     */
    async signInWithEmailAndPassword(email, password) {
        var _a;
        try {
            const result = await this.app
                .request({
                method: "POST",
                route: `/auth/${this.database}/signin`,
                data: { method: "email", email, password, client_id: this.app.socket && this.app.socket.id },
            })
                .catch((e) => { });
            return this.handleSignInResult(result);
        }
        catch (error) {
            const access_token = (_a = this.user) === null || _a === void 0 ? void 0 : _a.accessToken;
            this.user = null;
            this.emit("signout", access_token);
            throw error;
        }
    }
    /**
     * Loga de forma assíncrona usando um nome de usuário e senha.
     * @param username O nome de usuário do usuário.
     * @param password A senha do usuário.
     * @returns Uma promise que é resolvida com as informações do usuário recém-criado.
     * @throws auth/invalid-username Lançado se o nome de usuário não for válido.
     * @throws auth/user-disabled Lançado se o usuário correspondente ao nome de usuário fornecido foi desativado.
     * @throws auth/user-not-found Lançado se não houver usuário correspondente ao nome de usuário fornecido.
     * @throws auth/wrong-password Lançado se a senha for inválida para o nome de usuário fornecido, ou se a conta correspondente ao nome de usuário não tiver uma senha definida.
     */
    async signInWithUsernameAndPassword(username, password) {
        var _a;
        try {
            const result = await this.app.request({
                method: "POST",
                route: `/auth/${this.database}/signin`,
                data: { method: "account", username, password, client_id: this.app.socket && this.app.socket.id },
            });
            return this.handleSignInResult(result);
        }
        catch (error) {
            const access_token = (_a = this.user) === null || _a === void 0 ? void 0 : _a.accessToken;
            this.user = null;
            this.emit("signout", access_token);
            throw error;
        }
    }
    /**
     * Loga de forma assíncrona usando um token de acesso.
     * @param token O token de acesso do usuário.
     * @param emitEvent Se deve ou não emitir o evento de login
     * @returns Uma promise que é resolvida com as informações do usuário recém-criado.
     * @throws auth/invalid-token Lançado se o token de acesso não for válido.
     * @throws auth/user-disabled Lançado se o usuário correspondente ao token de acesso fornecido foi desativado.
     * @throws auth/user-not-found Lançado se não houver usuário correspondente ao token de acesso fornecido.
     * @throws auth/wrong-token Lançado se o token de acesso for inválido para o usuário fornecido.
     */
    async signInWithToken(token, emitEvent = true) {
        var _a;
        try {
            const result = await this.app.request({
                method: "POST",
                route: `/auth/${this.database}/signin`,
                data: { method: "token", access_token: token, client_id: this.app.socket && this.app.socket.id },
            });
            return this.handleSignInResult(result, emitEvent);
        }
        catch (error) {
            const access_token = (_a = this.user) === null || _a === void 0 ? void 0 : _a.accessToken;
            this.user = null;
            this.emit("signout", access_token);
            throw error;
        }
    }
    /**
     * Desconecta o usuário atual.
     * @returns Uma promise que é resolvida quando a operação de desconexão for concluída.
     */
    async signOut() {
        if (!this.user || !this.user.accessToken) {
            return Promise.resolve();
        }
        const result = await this.app.request({ method: "POST", route: `/auth/${this.database}/signout`, data: { client_id: this.app.socket && this.app.socket.id } });
        const access_token = this.user.accessToken;
        this.user = null;
        localStorage_1.default.removeItem(`[${this.database}][auth_user]`);
        this.emit("signout", access_token);
    }
    /**
     * Adiciona um observador para mudanças no estado de login do usuário.
     * @param callback Uma função observadora do usuário. Esta função recebe o usuário atual como parâmetro. Se o usuário estiver conectado, o parâmetro é as informações do usuário; caso contrário, é null.
     * @returns Uma função que remove o observador.
     */
    onAuthStateChanged(callback) {
        const byCallback = (user) => {
            callback(user instanceof AuthUser ? user : null);
        };
        this.on("signin", byCallback);
        this.on("signout", byCallback);
        const stop = () => {
            this.off("signin", byCallback);
            this.off("signout", byCallback);
        };
        return {
            stop,
        };
    }
    /**
     * Adiciona um observador para mudanças no token de ID do usuário conectado, que inclui eventos de login, logout e atualização de token.
     * @param callback Uma função observadora do usuário. Esta função recebe o usuário atual como parâmetro. Se o usuário estiver conectado, o parâmetro é as informações do usuário; caso contrário, é null.
     * @returns Uma função que remove o observador.
     */
    onIdTokenChanged(callback) {
        const byCallback = (user) => {
            var _a;
            callback(user instanceof AuthUser ? (_a = user === null || user === void 0 ? void 0 : user.accessToken) !== null && _a !== void 0 ? _a : null : null);
        };
        this.on("signin", byCallback);
        this.on("signout", byCallback);
        const stop = () => {
            this.off("signin", byCallback);
            this.off("signout", byCallback);
        };
        return {
            stop,
        };
    }
    /**
     * Define de forma assíncrona o usuário fornecido como currentUser na instância de Auth atual. Será feita uma cópia da instância do usuário fornecido e definida como currentUser.
     * @param user Um usuário a ser definido como currentUser na instância de Auth atual.
     * @returns Uma promise que é resolvida quando o usuário é definido como currentUser na instância de Auth atual.
     * @throws auth/invalid-user-token Lançado se o token do usuário fornecido for inválido.
     * @throws auth/user-token-expired Lançado se o token do usuário fornecido estiver expirado.
     * @throws auth/null-user Lançado se o usuário fornecido for nulo.
     * @throws auth/tenant-id-mismatch Lançado se o ID do locatário do usuário fornecido não corresponder ao ID do locatário da instância de Auth.
     */
    updateCurrentUser(user) {
        this.user = user;
    }
    /**
     * Envia um e-mail de redefinição de senha para o endereço de e-mail fornecido.
     * @param email O endereço de e-mail do usuário.
     * @returns Uma promise que é resolvida quando o e-mail de redefinição de senha é enviado.
     * @throws auth/invalid-email Lançado se o endereço de e-mail não for válido.
     * @throws auth/missing-android-pkg-name Lançado se o nome do pacote Android estiver ausente quando o aplicativo Android for necessário.
     * @throws auth/missing-continue-uri Lançado se a URL de continuação estiver ausente quando o widget da web for necessário.
     * @throws auth/missing-ios-bundle-id Lançado se o ID do pacote iOS estiver ausente quando o aplicativo iOS for necessário.
     * @throws auth/invalid-continue-uri Lançado se a URL de continuação for inválida.
     * @throws auth/unauthorized-continue-uri Lançado se o domínio da URL de continuação não estiver na lista de permissões. Coloque o domínio na lista de permissões no console do Firebase.
     * @throws auth/user-not-found Lançado se não houver usuário correspondente ao endereço de e-mail.
     */
    async sendPasswordResetEmail(email) {
        const result = await this.app.request({ method: "POST", route: `/auth/${this.database}/forgot_password`, data: { email } });
    }
    /**
     * Aplica um código de verificação enviado ao usuário por e-mail ou outro mecanismo fora de banda.
     * @param code Código de verificação enviado ao usuário.
     * @returns Uma promise que é resolvida com o endereço de e-mail do usuário se o código de verificação for válido.
     * @throws auth/expired-action-code Lançado se o código de ação expirou.
     * @throws auth/invalid-action-code Lançado se o código de ação for inválido.
     * @throws auth/user-disabled Lançado se o usuário correspondente ao código de ação estiver desativado.
     * @throws auth/user-not-found Lançado se o usuário correspondente ao código de ação não for encontrado.
     */
    async applyActionCode(code) {
        const result = await this.app.request({ method: "POST", route: `/auth/${this.database}/verify_email`, data: { code } });
        return result.email;
    }
    /**
     * Verifica um código de verificação enviado ao usuário por e-mail ou outro mecanismo fora de banda.
     * @param code Código de verificação enviado ao usuário.
     * @returns Uma promise que é resolvida com o endereço de e-mail do usuário se o código de verificação for válido.
     * @throws auth/expired-action-code Lançado se o código de ação expirou.
     * @throws auth/invalid-action-code Lançado se o código de ação for inválido.
     * @throws auth/user-disabled Lançado se o usuário correspondente ao código de ação estiver desativado.
     * @throws auth/user-not-found Lançado se o usuário correspondente ao código de ação não for encontrado.
     */
    checkActionCode(code) {
        throw new Error("Method not implemented.");
    }
    /**
     * Confirma o novo endereço de e-mail do usuário usando um código de verificação.
     * @param code O código de verificação de e-mail enviado ao usuário.
     * @returns Uma promise que é resolvida com o endereço de e-mail do usuário se o novo e-mail for verificado com sucesso.
     * @throws auth/expired-action-code Lançado se o código de ação expirou.
     * @throws auth/invalid-action-code Lançado se o código de ação for inválido.
     * @throws auth/user-disabled Lançado se o usuário correspondente ao código de ação estiver desativado.
     * @throws auth/user-not-found Lançado se o usuário correspondente ao código de ação não for encontrado.
     * @throws auth/weak-password Lançado se o novo e-mail for inválido.
     */
    async confirmPasswordReset(code, newPassword) {
        const result = await this.app.request({ method: "POST", route: `/auth/${this.database}/reset_password`, data: { code, password: newPassword } });
    }
    /**
     * Verifica um código de redefinição de senha enviado ao usuário por e-mail ou outro mecanismo fora de banda.
     * @param code Código de redefinição de senha enviado ao usuário.
     * @returns Uma promise que é resolvida com o endereço de e-mail do usuário se o código de redefinição de senha for válido.
     * @throws auth/expired-action-code Lançado se o código de ação expirou.
     * @throws auth/invalid-action-code Lançado se o código de ação for inválido.
     * @throws auth/user-disabled Lançado se o usuário correspondente ao código de ação estiver desativado.
     * @throws auth/user-not-found Lançado se o usuário correspondente ao código de ação não for encontrado.
     */
    verifyPasswordResetCode(code) {
        throw new Error("Method not implemented.");
    }
}
exports.Auth = Auth;
function getAuth(...args) {
    let app = args.find((a) => a instanceof app_1.IvipBaseApp), dbName;
    const appNames = (0, app_1.getAppsName)();
    if (!app) {
        const name = appNames.find((n) => args.includes(n));
        app = name ? (0, app_1.getApp)(name) : (0, app_1.getFirstApp)();
    }
    let database = args.find((d) => typeof d === "string" && appNames.includes(d) !== true);
    if (typeof database !== "string") {
        database = app.settings.dbname;
    }
    dbName = (Array.isArray(database) ? database : [database])[0];
    if (!(0, database_1.hasDatabase)(dbName)) {
        throw new Error(`Database "${dbName}" does not exist`);
    }
    if (app.auth.has(dbName)) {
        return app.auth.get(dbName);
    }
    const auth = new Auth(dbName, app);
    app.auth.set(dbName, auth);
    return auth;
}
exports.getAuth = getAuth;

},{"../app":1,"../database":24,"../utils":34,"../utils/base64":33,"../utils/localStorage":35,"ivipbase-core":99}],6:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ID = exports.ascii85 = exports.PathReference = exports.Utils = exports.SimpleCache = exports.SimpleEventEmitter = exports.PathInfo = exports.DataStorageSettings = exports.CustomStorage = void 0;
var storage_1 = require("./controller/storage");
Object.defineProperty(exports, "CustomStorage", { enumerable: true, get: function () { return storage_1.CustomStorage; } });
Object.defineProperty(exports, "DataStorageSettings", { enumerable: true, get: function () { return storage_1.DataStorageSettings; } });
__exportStar(require("./app"), exports);
__exportStar(require("./database"), exports);
__exportStar(require("./auth"), exports);
__exportStar(require("./ipc"), exports);
var ivipbase_core_1 = require("ivipbase-core");
Object.defineProperty(exports, "PathInfo", { enumerable: true, get: function () { return ivipbase_core_1.PathInfo; } });
Object.defineProperty(exports, "SimpleEventEmitter", { enumerable: true, get: function () { return ivipbase_core_1.SimpleEventEmitter; } });
Object.defineProperty(exports, "SimpleCache", { enumerable: true, get: function () { return ivipbase_core_1.SimpleCache; } });
Object.defineProperty(exports, "Utils", { enumerable: true, get: function () { return ivipbase_core_1.Utils; } });
Object.defineProperty(exports, "PathReference", { enumerable: true, get: function () { return ivipbase_core_1.PathReference; } });
Object.defineProperty(exports, "ascii85", { enumerable: true, get: function () { return ivipbase_core_1.ascii85; } });
Object.defineProperty(exports, "ID", { enumerable: true, get: function () { return ivipbase_core_1.ID; } });

},{"./app":1,"./auth":5,"./controller/storage":20,"./database":24,"./ipc":28,"ivipbase-core":99}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_FACTORY = void 0;
const util_1 = require("./util");
const ERRORS = {
    ["no-app" /* AppError.NO_APP */]: "Nenhum aplicativo iVipBase '{$appName}' foi criado - " + "chame inicializeApp() primeiro",
    ["bad-app-name" /* AppError.BAD_APP_NAME */]: "Nome de aplicativo ilegal: '{$appName}",
    ["duplicate-app" /* AppError.DUPLICATE_APP */]: "O aplicativo Firebase chamado '{$appName}' já existe com diferentes opções ou configurações",
    ["app-deleted" /* AppError.APP_DELETED */]: "Aplicativo iVipBase chamado '{$appName}' já excluído",
    ["db-disconnected" /* AppError.DB_DISCONNECTED */]: "Banco de dados '{$dbName}' desconectado",
    ["db-connection-error" /* AppError.DB_CONNECTION_ERROR */]: "Database connection error: {$error}",
    ["db-not-found" /* AppError.DB_NOT_FOUND */]: "Banco de dados '{$dbName}' não encontrado",
};
exports.ERROR_FACTORY = new util_1.ErrorFactory("app", "iVipBase", ERRORS);

},{"./util":8}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorFactory = exports.MainError = void 0;
const ERROR_NAME = "iVipBaseError";
class MainError extends Error {
    constructor(
    /** O código de erro para este erro. */
    code, message, 
    /** Dados personalizados para este erro. */
    customData) {
        super(message);
        this.code = code;
        this.customData = customData;
        /** O nome personalizado para todos os iVipBaseError. */
        this.name = ERROR_NAME;
        // Fix For ES5
        // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(this, MainError.prototype);
        // Mantém o rastreamento de pilha adequado para onde nosso erro foi gerado.
        // Disponível apenas no V8.
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ErrorFactory.prototype.create);
        }
    }
}
exports.MainError = MainError;
const PATTERN = /\{\$([^}]+)}/g;
function replaceTemplate(template, data) {
    return template.replace(PATTERN, (_, key) => {
        const value = data[key];
        return value != null ? String(value) : `<${key}?>`;
    });
}
class ErrorFactory {
    constructor(service, serviceName, errors) {
        this.service = service;
        this.serviceName = serviceName;
        this.errors = errors;
    }
    create(code, ...data) {
        const customData = data[0] || {};
        const fullCode = `${this.service}/${code}`;
        const template = this.errors[code];
        const message = template ? replaceTemplate(template, customData) : "Error";
        // Nome do serviço: Mensagem de erro (serviço/código).
        const fullMessage = `${this.serviceName}: ${message} (${fullCode}).`;
        const error = new MainError(fullCode, fullMessage, customData);
        return error;
    }
}
exports.ErrorFactory = ErrorFactory;

},{}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeQuery = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const utils_1 = require("./storage/MDE/utils");
const ivip_utils_1 = require("ivip-utils");
const noop = () => { };
/**
 *
 * @param storage Instância de armazenamento de destino
 * @param dbName Nome do banco de dados
 * @param path Caminho da coleção de objetos para executar a consulta
 * @param query Consulta a ser executada
 * @param options Opções adicionais
 * @returns Retorna uma promise que resolve com os dados ou caminhos correspondentes em `results`
 */
async function executeQuery(api, database, path, query, options = { snapshots: false, include: undefined, exclude: undefined, child_objects: undefined, eventHandler: noop }) {
    var _a, _b, _c;
    if (typeof options !== "object") {
        options = {};
    }
    if (typeof options.snapshots === "undefined") {
        options.snapshots = false;
    }
    const originalPath = path;
    path = ivipbase_core_1.PathInfo.get([api.storage.settings.prefix, originalPath]).path;
    const context = {};
    context.database_cursor = ivipbase_core_1.ID.generate();
    const queryFilters = query.filters.map((f) => (Object.assign({}, f)));
    const querySort = query.order.map((s) => (Object.assign({}, s)));
    const nodes = await api.storage
        .getNodesBy(database, path, false, 2, false, true)
        .then((nodes) => {
        const childrens = nodes.filter(({ path: p }) => ivipbase_core_1.PathInfo.get(p).isChildOf(path));
        return Promise.resolve(childrens.map((node) => {
            var _a;
            if (node.content && (node.content.type === utils_1.nodeValueTypes.OBJECT || node.content.type === utils_1.nodeValueTypes.ARRAY)) {
                const childrens = nodes.filter(({ path: p }) => ivipbase_core_1.PathInfo.get(p).isChildOf(node.path));
                node.content.value = childrens.reduce((acc, { path, content }) => {
                    acc[ivipbase_core_1.PathInfo.get(path).key] = content.value;
                    return acc;
                }, (_a = node.content.value) !== null && _a !== void 0 ? _a : {});
            }
            return node;
        }));
    })
        .catch(() => Promise.resolve([]));
    let results = [];
    const pathInfo = ivipbase_core_1.PathInfo.get(path);
    const isWildcardPath = pathInfo.keys.some((key) => key === "*" || key.toString().startsWith("$")); // path.includes('*');
    const vars = isWildcardPath ? pathInfo.keys.filter((key) => typeof key === "string" && key.startsWith("$")) : [];
    for (const node of nodes) {
        const value = (0, utils_1.processReadNodeValue)(node.content).value;
        if (typeof value !== "object" || value === null) {
            continue;
        }
        const node_path = ivipbase_core_1.PathInfo.get(node.path);
        const params = Object.fromEntries(Object.entries(ivipbase_core_1.PathInfo.extractVariables(path, node_path.path)).filter(([key]) => vars.includes(key)));
        const node_val = Object.assign(Object.assign({}, params), value);
        const filters = queryFilters.filter((f) => ["<", "<=", "==", "!=", ">=", ">", "like", "!like", "in", "!in", "exists", "!exists", "between", "!between", "matches", "!matches", "has", "!has", "contains", "!contains"].includes(f.op));
        const isFiltersValid = filters.every((f) => {
            const val = (0, ivip_utils_1.isDate)(node_val[f.key]) ? new Date(node_val[f.key]).getTime() : node_val[f.key];
            const op = f.op;
            const compare = (0, ivip_utils_1.isDate)(f.compare) ? new Date(f.compare).getTime() : f.compare;
            switch (op) {
                case "<":
                    return val < compare;
                case "<=":
                    return val <= compare;
                case "==":
                    return val === compare;
                case "!=":
                    return val !== compare;
                case ">=":
                    return val >= compare;
                case ">":
                    return val > compare;
                case "in":
                case "!in": {
                    if (!(f.compare instanceof Array)) {
                        return op === "!in";
                    }
                    const isIn = f.compare instanceof Array && f.compare.includes(val);
                    return op === "in" ? isIn : !isIn;
                }
                case "exists":
                case "!exists": {
                    const isExists = val !== undefined && val !== null;
                    return op === "exists" ? isExists : !isExists;
                }
                case "between":
                case "!between": {
                    if (!(f.compare instanceof Array)) {
                        return op === "!between";
                    }
                    const isBetween = f.compare instanceof Array && val >= f.compare[0] && val <= f.compare[1];
                    return op === "between" ? isBetween : !isBetween;
                }
                case "like":
                case "!like": {
                    if (typeof compare !== "string") {
                        return op === "!like";
                    }
                    const pattern = "^" + compare.replace(/\*/g, ".*").replace(/\?/g, ".") + "$";
                    const re = new RegExp(pattern, "i");
                    const isLike = re.test(val);
                    return op === "like" ? isLike : !isLike;
                }
                case "matches":
                case "!matches": {
                    if (typeof compare !== "string") {
                        return op === "!matches";
                    }
                    const re = new RegExp(compare, "i");
                    const isMatch = re.test(val);
                    return op === "matches" ? isMatch : !isMatch;
                }
                case "has":
                case "!has": {
                    if (typeof val !== "object") {
                        return op === "!has";
                    }
                    const hasKey = Object.keys(val).includes(compare);
                    return op === "has" ? hasKey : !hasKey;
                }
                case "contains":
                case "!contains": {
                    if (!(val instanceof Array)) {
                        return op === "!contains";
                    }
                    const contains = val.includes(compare);
                    return op === "contains" ? contains : !contains;
                }
            }
            return false;
        });
        if (isFiltersValid) {
            results.push({ path: node.path, val: value });
        }
    }
    results = results
        .sort((a, b) => {
        const compare = (i) => {
            const o = querySort[i];
            const trailKeys = ivipbase_core_1.PathInfo.get(typeof o.key === "number" ? `[${o.key}]` : o.key).keys;
            let left = trailKeys.reduce((val, key) => (val !== null && typeof val === "object" && key in val ? val[key] : null), a.val);
            let right = trailKeys.reduce((val, key) => (val !== null && typeof val === "object" && key in val ? val[key] : null), b.val);
            left = (0, ivip_utils_1.isDate)(left) ? new Date(left).getTime() : left;
            right = (0, ivip_utils_1.isDate)(right) ? new Date(right).getTime() : right;
            if (left === null) {
                return right === null ? 0 : o.ascending ? -1 : 1;
            }
            if (right === null) {
                return o.ascending ? 1 : -1;
            }
            if (left == right) {
                if (i < querySort.length - 1) {
                    return compare(i + 1);
                }
                else {
                    return a.path < b.path ? -1 : 1;
                }
            }
            else if (left < right) {
                return o.ascending ? -1 : 1;
            }
            // else if (left > right) {
            return o.ascending ? 1 : -1;
            // }
        };
        return compare(0);
    })
        .slice(query.skip, query.skip + Math.abs(query.take > 0 ? query.take : results.length));
    const isRealtime = typeof options.monitor === "object" && [(_a = options.monitor) === null || _a === void 0 ? void 0 : _a.add, (_b = options.monitor) === null || _b === void 0 ? void 0 : _b.change, (_c = options.monitor) === null || _c === void 0 ? void 0 : _c.remove].some((val) => val === true);
    if (options.snapshots) {
        for (let i = 0; i < results.length; i++) {
            const path = results[i].path.replace(`${api.storage.settings.prefix}`, "").replace(/^(\/)+/gi, "");
            const val = await api.storage.get(database, path, {
                include: options.include,
                exclude: options.exclude,
            });
            results[i] = { path: path, val };
        }
    }
    return {
        results: options.snapshots ? results : results.map(({ path }) => path),
        context: null,
        stop: async () => { },
    };
}
exports.executeQuery = executeQuery;
exports.default = executeQuery;

},{"./storage/MDE/utils":19,"ivip-utils":72,"ivipbase-core":99}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = require("./error");
/**
 * @returns returns a promise that resolves with an object containing data and an optionally returned context
 */
async function request(method, url, options = { accessToken: null, data: null, dataReceivedCallback: null, dataRequestCallback: null, context: null }) {
    var _a;
    let postData = options.data;
    if (typeof postData === "undefined" || postData === null) {
        postData = "";
    }
    else if (typeof postData === "object") {
        postData = JSON.stringify(postData);
    }
    const headers = {
        "DataBase-Context": JSON.stringify(options.context || null),
    };
    const init = {
        method,
        headers,
        body: undefined,
    };
    if (typeof options.dataRequestCallback === "function") {
        // Stream data to the server instead of posting all from memory at once
        headers["Content-Type"] = "text/plain"; // Prevent server middleware parsing the content as JSON
        postData = "";
        const chunkSize = 1024 * 512; // Use large chunk size, we have to store everything in memory anyway.
        let chunk;
        while ((chunk = await options.dataRequestCallback(chunkSize))) {
            postData += chunk;
        }
        init.body = postData;
    }
    else if (postData.length > 0) {
        headers["Content-Type"] = "application/json";
        init.body = postData;
    }
    if (options.accessToken) {
        headers["Authorization"] = `Bearer ${options.accessToken}`;
    }
    const request = { url, method, headers, body: undefined };
    const res = await fetch(request.url, init).catch((err) => {
        // console.error(err);
        throw new error_1.RequestError(request, null, "fetch_failed", err.message);
    });
    let data = "";
    if (typeof options.dataReceivedCallback === "function") {
        // Stream response
        const reader = (_a = res.body) === null || _a === void 0 ? void 0 : _a.getReader();
        await new Promise((resolve, reject) => {
            (async function readNext() {
                var _a;
                try {
                    const result = await (reader === null || reader === void 0 ? void 0 : reader.read());
                    (_a = options.dataReceivedCallback) === null || _a === void 0 ? void 0 : _a.call(options, result === null || result === void 0 ? void 0 : result.value);
                    if (result === null || result === void 0 ? void 0 : result.done) {
                        return resolve();
                    }
                    readNext();
                }
                catch (err) {
                    reader === null || reader === void 0 ? void 0 : reader.cancel("error");
                    reject(err);
                }
            })();
        });
    }
    else {
        data = await res.text();
    }
    const isJSON = data[0] === "{" || data[0] === "["; // || (res.headers['content-type'] || '').startsWith('application/json')
    if (res.status === 200) {
        const contextHeader = res.headers.get("DataBase-Context");
        let context;
        if (contextHeader && contextHeader[0] === "{") {
            context = JSON.parse(contextHeader);
        }
        else {
            context = {};
        }
        if (isJSON) {
            data = JSON.parse(data);
        }
        return { context, data };
    }
    else {
        request.body = postData;
        const response = {
            statusCode: res.status,
            statusMessage: res.statusText,
            headers: res.headers,
            body: data,
        };
        let code = res.status, message = res.statusText;
        if (isJSON) {
            const err = JSON.parse(data);
            if (err.code) {
                code = err.code;
            }
            if (err.message) {
                message = err.message;
            }
        }
        throw new error_1.RequestError(request, response, code, message);
    }
}
exports.default = request;

},{"./error":11}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOT_CONNECTED_ERROR_MESSAGE = exports.RequestError = void 0;
class RequestError extends Error {
    get isNetworkError() {
        return this.response === null;
    }
    constructor(request, response, code, message = "unknown error") {
        super(message);
        this.request = request;
        this.response = response;
        this.code = code;
        this.message = message;
    }
}
exports.RequestError = RequestError;
exports.NOT_CONNECTED_ERROR_MESSAGE = "remote database is not connected"; //'DataBaseClient is not connected';

},{}],12:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomStorage = exports.CustomStorageSettings = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const erros_1 = require("../erros");
const MDE_1 = __importStar(require("./MDE"));
class CustomStorageSettings extends MDE_1.MDESettings {
    constructor(options = {}) {
        super(options);
    }
}
exports.CustomStorageSettings = CustomStorageSettings;
class CustomStorage extends MDE_1.default {
    constructor(options = {}) {
        const { logLevel } = options, _options = __rest(options, ["logLevel"]);
        super(Object.assign(Object.assign({}, _options), { getMultiple: (database, e) => {
                if (!this.ready) {
                    throw erros_1.ERROR_FACTORY.create("db-disconnected" /* AppError.DB_DISCONNECTED */, { dbName: this.dbName });
                }
                return this.getMultiple(database, e);
            }, setNode: (database, path, content, node) => {
                if (!this.ready) {
                    throw erros_1.ERROR_FACTORY.create("db-disconnected" /* AppError.DB_DISCONNECTED */, { dbName: this.dbName });
                }
                return this.setNode(database, path, content, node);
            }, removeNode: (database, path, content, node) => {
                if (!this.ready) {
                    throw erros_1.ERROR_FACTORY.create("db-disconnected" /* AppError.DB_DISCONNECTED */, { dbName: this.dbName });
                }
                return this.removeNode(database, path, content, node);
            } }));
        this._dbName = "CustomStorage";
        this.logLevel = "log";
        this.logLevel = logLevel || "log";
        this._debug = new ivipbase_core_1.DebugLogger(this.logLevel, `[${this.dbName}]`);
    }
    get dbName() {
        return this._dbName;
    }
    set dbName(value) {
        this._dbName = value;
        this._debug = new ivipbase_core_1.DebugLogger(this.logLevel, `[${this._dbName}]`);
    }
    get debug() {
        return this._debug;
    }
}
exports.CustomStorage = CustomStorage;

},{"../erros":7,"./MDE":16,"ivipbase-core":99}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStorage = exports.DataStorageSettings = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const erros_1 = require("../erros");
const CustomStorage_1 = require("./CustomStorage");
class DataStorageSettings extends CustomStorage_1.CustomStorageSettings {
    constructor(options = {}) {
        super(options);
    }
}
exports.DataStorageSettings = DataStorageSettings;
class DataStorage extends CustomStorage_1.CustomStorage {
    constructor(database, options = {}) {
        super(options);
        this.data = {};
        this.dbName = "TempStorage";
        (Array.isArray(database) ? database : [database])
            .filter((name) => typeof name === "string" && name.trim() !== "")
            .forEach((name) => {
            this.data[name] = new Map();
        });
        this.emit("ready");
    }
    async getMultiple(database, { regex }) {
        if (!this.data[database]) {
            throw erros_1.ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
        }
        const list = [];
        this.data[database].forEach((content, path) => {
            if (regex.test(path)) {
                if (content) {
                    list.push(ivipbase_core_1.Utils.cloneObject({ path, content }));
                }
            }
        });
        return list;
    }
    async setNode(database, path, content) {
        if (!this.data[database]) {
            throw erros_1.ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
        }
        this.data[database].set(path, content);
    }
    async removeNode(database, path) {
        if (!this.data[database]) {
            throw erros_1.ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
        }
        this.data[database].delete(path);
    }
}
exports.DataStorage = DataStorage;

},{"../erros":7,"./CustomStorage":12,"ivipbase-core":99}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomStorageNodeInfo = exports.NodeInfo = exports.NodeAddress = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const utils_1 = require("./utils");
class NodeAddress {
    constructor(path) {
        this.path = path;
    }
    toString() {
        return `"/${this.path}"`;
    }
    /**
     * Compares this address to another address
     */
    equals(address) {
        return ivipbase_core_1.PathInfo.get(this.path).equals(address.path);
    }
}
exports.NodeAddress = NodeAddress;
class NodeInfo {
    constructor(info) {
        this.path = info.path;
        this.type = info.type;
        this.index = info.index;
        this.key = info.key;
        this.exists = info.exists;
        this.address = info.address;
        this.value = info.value;
        this.childCount = info.childCount;
        if (typeof this.path === "string" && typeof this.key === "undefined" && typeof this.index === "undefined") {
            const pathInfo = ivipbase_core_1.PathInfo.get(this.path);
            if (typeof pathInfo.key === "number") {
                this.index = pathInfo.key;
            }
            else {
                this.key = pathInfo.key;
            }
        }
        if (typeof this.exists === "undefined") {
            this.exists = true;
        }
    }
    get valueType() {
        var _a;
        return (_a = this.type) !== null && _a !== void 0 ? _a : -1;
    }
    get valueTypeName() {
        return (0, utils_1.getValueTypeName)(this.valueType);
    }
    toString() {
        if (!this.exists) {
            return `"${this.path}" doesn't exist`;
        }
        if (this.address) {
            return `"${this.path}" is ${this.valueTypeName} stored at ${this.address.toString()}`;
        }
        else {
            return `"${this.path}" is ${this.valueTypeName} with value ${this.value}`;
        }
    }
}
exports.NodeInfo = NodeInfo;
class CustomStorageNodeInfo extends NodeInfo {
    constructor(info) {
        super(info);
        this.revision = info.revision;
        this.revision_nr = info.revision_nr;
        this.created = info.created;
        this.modified = info.modified;
    }
}
exports.CustomStorageNodeInfo = CustomStorageNodeInfo;

},{"./utils":19,"ivipbase-core":99}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ivipbase_core_1 = require("ivipbase-core");
const utils_1 = require("./utils");
const utils_2 = require("../../../utils");
function destructureData(type, path, data, options = {}) {
    var _a, _b, _c, _d;
    let result = (_a = options === null || options === void 0 ? void 0 : options.previous_result) !== null && _a !== void 0 ? _a : [];
    let pathInfo = ivipbase_core_1.PathInfo.get(path);
    const revision = (_b = options === null || options === void 0 ? void 0 : options.assert_revision) !== null && _b !== void 0 ? _b : ivipbase_core_1.ID.generate();
    options.assert_revision = revision;
    options.include_checks = typeof options.include_checks === "boolean" ? options.include_checks : true;
    const resolveConflict = (node) => {
        const comparison = result.find((n) => ivipbase_core_1.PathInfo.get(n.path).equals(node.path));
        if (!comparison) {
            result.push(node);
            return;
        }
        else if (node.type === "VERIFY") {
            return;
        }
        result = result.filter((n) => !ivipbase_core_1.PathInfo.get(n.path).equals(node.path));
        if (comparison.content.type !== node.content.type) {
            result.push(node);
            return;
        }
        if (comparison.type === "VERIFY") {
            comparison.type = "UPDATE";
        }
        node.content.value = (0, utils_2.joinObjects)(comparison.content.value, node.content.value);
        result.push(node);
    };
    const include_checks = options.include_checks;
    // if (options.include_checks) {
    // 	while (typeof pathInfo.parentPath === "string" && pathInfo.parentPath.trim() !== "") {
    // 		const node: NodesPending = {
    // 			path: pathInfo.parentPath,
    // 			type: "VERIFY",
    // 			content: {
    // 				type: (typeof pathInfo.key === "number" ? nodeValueTypes.ARRAY : nodeValueTypes.OBJECT) as any,
    // 				value: {},
    // 				revision,
    // 				revision_nr: 1,
    // 				created: Date.now(),
    // 				modified: Date.now(),
    // 			},
    // 		};
    // 		resolveConflict(node);
    // 		pathInfo = PathInfo.get(pathInfo.parentPath);
    // 	}
    // }
    options.include_checks = false;
    let value = data;
    let valueType = (0, utils_1.getValueType)(value);
    if (valueType === utils_1.VALUE_TYPES.OBJECT || valueType === utils_1.VALUE_TYPES.ARRAY) {
        value = {};
        valueType = Array.isArray(data) ? utils_1.VALUE_TYPES.ARRAY : utils_1.VALUE_TYPES.OBJECT;
        for (let key in data) {
            if (valueType === utils_1.VALUE_TYPES.OBJECT && (0, utils_1.valueFitsInline)(data[key], this.settings)) {
                value[key] = (0, utils_1.getTypedChildValue)(data[key]);
                if (value[key] === null) {
                    result = destructureData.apply(this, [type, ivipbase_core_1.PathInfo.get([path, valueType === utils_1.VALUE_TYPES.OBJECT ? key : parseInt(key)]).path, null, Object.assign(Object.assign({}, options), { previous_result: result })]);
                }
                continue;
            }
            result = destructureData.apply(this, [type, ivipbase_core_1.PathInfo.get([path, valueType === utils_1.VALUE_TYPES.OBJECT ? key : parseInt(key)]).path, data[key], Object.assign(Object.assign({}, options), { previous_result: result })]);
        }
    }
    const parentPath = ivipbase_core_1.PathInfo.get(pathInfo.parentPath);
    const isObjectFitsInline = [utils_1.VALUE_TYPES.ARRAY, utils_1.VALUE_TYPES.OBJECT].includes(valueType)
        ? result.findIndex((n) => {
            return ivipbase_core_1.PathInfo.get(n.path).isChildOf(pathInfo) || ivipbase_core_1.PathInfo.get(n.path).isDescendantOf(pathInfo);
        }) < 0 && Object.keys(value).length === 0
        : (0, utils_1.valueFitsInline)(value, this.settings);
    if (parentPath.path && parentPath.path.trim() !== "") {
        const parentNode = (_c = result.find((node) => ivipbase_core_1.PathInfo.get(node.path).equals(parentPath))) !== null && _c !== void 0 ? _c : {
            path: parentPath.path,
            type: "UPDATE",
            content: {
                type: (typeof pathInfo.key === "number" ? utils_1.nodeValueTypes.ARRAY : utils_1.nodeValueTypes.OBJECT),
                value: {},
                revision,
                revision_nr: 1,
                created: Date.now(),
                modified: Date.now(),
            },
        };
        parentNode.type = "UPDATE";
        if (parentNode.content.value === null || typeof parentNode.content.value !== "object") {
            parentNode.content.value = {};
        }
        if (parentNode.content.type === utils_1.nodeValueTypes.OBJECT || parentNode.content.type === utils_1.nodeValueTypes.ARRAY) {
            parentNode.content.value[pathInfo.key] = isObjectFitsInline ? (0, utils_1.getTypedChildValue)(value) : null;
            result = result.filter((node) => !ivipbase_core_1.PathInfo.get(node.path).equals(parentPath));
            resolveConflict(parentNode);
        }
    }
    const node = {
        path,
        type: isObjectFitsInline ? "SET" : type,
        content: {
            type: valueType,
            value: isObjectFitsInline ? null : value,
            revision,
            revision_nr: 1,
            created: Date.now(),
            modified: Date.now(),
        },
    };
    resolveConflict(node);
    const verifyNodes = [];
    for (const node of result) {
        const pathInfo = ivipbase_core_1.PathInfo.get(node.path);
        const parentNode = (_d = result.find((n) => ivipbase_core_1.PathInfo.get(n.path).isParentOf(node.path))) !== null && _d !== void 0 ? _d : verifyNodes.find((n) => ivipbase_core_1.PathInfo.get(n.path).isParentOf(node.path));
        if (!parentNode && pathInfo.parentPath && pathInfo.parentPath.trim() !== "" && include_checks) {
            const verifyNode = {
                path: pathInfo.parentPath,
                type: "VERIFY",
                content: {
                    type: (typeof pathInfo.key === "number" ? utils_1.nodeValueTypes.ARRAY : utils_1.nodeValueTypes.OBJECT),
                    value: {},
                    revision,
                    revision_nr: 1,
                    created: Date.now(),
                    modified: Date.now(),
                },
            };
            verifyNodes.push(verifyNode);
        }
    }
    return verifyNodes.concat(result).map((node) => {
        node.path = node.path.replace(/\/+$/g, "");
        return node;
    });
}
exports.default = destructureData;

},{"../../../utils":34,"./utils":19,"ivipbase-core":99}],16:[function(require,module,exports){
"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MDESettings = exports.VALUE_TYPES = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const NodeInfo_1 = require("./NodeInfo");
const utils_1 = require("./utils");
Object.defineProperty(exports, "VALUE_TYPES", { enumerable: true, get: function () { return utils_1.VALUE_TYPES; } });
const prepareMergeNodes_1 = __importDefault(require("./prepareMergeNodes"));
const structureNodes_1 = __importDefault(require("./structureNodes"));
const destructureData_1 = __importDefault(require("./destructureData"));
const utils_2 = require("../../../utils");
const DEBUG_MODE = false;
const NOOP = () => { };
/**
 * Representa as configurações de um MDE.
 */
class MDESettings {
    /**
     * Cria uma instância de MDESettings com as opções fornecidas.
     * @param options - Opções para configurar o node.
     */
    constructor(options) {
        /**
         * O prefixo associado ao armazenamento de dados. Por padrão, é "root".
         * @type {string}
         * @default "root"
         */
        this.prefix = "root";
        /**
         * Tamanho máximo, em bytes, dos dados filhos a serem armazenados em um registro pai
         * antes de serem movidos para um registro dedicado. O valor padrão é 50.
         * @type {number}
         * @default 50
         */
        this.maxInlineValueSize = 50;
        /**
         * Em vez de lançar erros em propriedades não definidas, esta opção permite
         * remover automaticamente as propriedades não definidas. O valor padrão é false.
         * @type {boolean}
         * @default false
         */
        this.removeVoidProperties = false;
        /**
         * @returns {Promise<any>}
         */
        this.commit = () => { };
        /**
         * @param reason
         */
        this.rollback = () => { };
        /**
         * Uma função que realiza um get/pesquisa de dados na base de dados com base em uma expressão regular resultada da propriedade pathToRegex em MDE.
         *
         * @type {((database: database: string, expression: {regex: RegExp, query: string[] }, simplifyValues?: boolean) => Promise<StorageNodeInfo[]> | StorageNodeInfo[]) | undefined}
         * @default undefined
         */
        this.getMultiple = () => [];
        /**
         * Uma função que realiza um set de um node na base de dados com base em um path especificado.
         *
         * @type {(((path:string, content: StorageNode, node: StorageNodeInfo) => Promise<void> | void) | undefined}
         * @default undefined
         */
        this.setNode = () => { };
        /**
         * Uma função que realiza um remove de um node na base de dados com base em um path especificado.
         *
         * @type {(((path:string, content: StorageNode, node: StorageNodeInfo) => Promise<void> | void) | undefined}
         * @default undefined
         */
        this.removeNode = () => { };
        if (typeof options.prefix === "string" && options.prefix.trim() !== "") {
            this.prefix = options.prefix;
        }
        if (typeof options.maxInlineValueSize === "number") {
            this.maxInlineValueSize = options.maxInlineValueSize;
        }
        if (typeof options.removeVoidProperties === "boolean") {
            this.removeVoidProperties = options.removeVoidProperties;
        }
        if (typeof options.removeVoidProperties === "boolean") {
            this.removeVoidProperties = options.removeVoidProperties;
        }
        if (typeof options.commit === "function") {
            this.commit = options.commit;
        }
        if (typeof options.rollback === "function") {
            this.rollback = options.rollback;
        }
        this.getMultiple = async (database, reg) => {
            if (typeof options.getMultiple === "function") {
                return await Promise.race([options.getMultiple(database, reg)]).then((response) => {
                    return Promise.resolve(response !== null && response !== void 0 ? response : []);
                });
            }
            return [];
        };
        this.setNode = async (database, path, content, node) => {
            if (typeof options.setNode === "function") {
                await Promise.race([options.setNode(database, path, (0, utils_2.removeNulls)(content), (0, utils_2.removeNulls)(node))]);
            }
        };
        this.removeNode = async (database, path, content, node) => {
            if (typeof options.removeNode === "function") {
                await Promise.race([options.removeNode(database, path, (0, utils_2.removeNulls)(content), (0, utils_2.removeNulls)(node))]);
            }
        };
        if (typeof options.init === "function") {
            this.init = options.init;
        }
    }
}
exports.MDESettings = MDESettings;
class MDE extends ivipbase_core_1.SimpleEventEmitter {
    createTid() {
        return DEBUG_MODE ? ++this._lastTid : ivipbase_core_1.ID.generate();
    }
    constructor(options = {}) {
        super();
        this._ready = false;
        this.schemas = {};
        this.settings = new MDESettings(options);
        this._lastTid = 0;
        this.on("ready", () => {
            this._ready = true;
        });
        this.init();
    }
    get debug() {
        return new ivipbase_core_1.DebugLogger(undefined, "MDE");
    }
    init() {
        if (typeof this.settings.init === "function") {
            this.settings.init.apply(this, []);
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
    /**
     * Converte um caminho em uma consulta de expressão regular e SQL LIKE pattern.
     *
     * @param {string} path - O caminho a ser convertido.
     * @param {boolean} [onlyChildren=false] - Se verdadeiro, exporta apenas os filhos do node especificado.
     * @param {boolean} [allHeirs=false] - Se verdadeiro, exporta todos os descendentes em relação ao path especificado.
     * @returns {{regex: RegExp, query: string[]}} - O objeto contendo a expressão regular e a query resultante.
     */
    preparePathQuery(path, onlyChildren = false, allHeirs = false, includeAncestor = false) {
        const pathsRegex = [];
        const querys = [];
        const pathsLike = [];
        /**
         * Substitui o caminho por uma expressão regular.
         * @param path - O caminho a ser convertido em expressão regular.
         * @returns {string} O caminho convertido em expressão regular.
         */
        const replasePathToRegex = (path) => {
            path = path.replace(/\/((\*)|(\$[^/\$]*))/g, "/([^/]*)");
            path = path.replace(/\[\*\]/g, "\\[(\\d+)\\]");
            path = path.replace(/\[(\d+)\]/g, "\\[$1\\]");
            return path;
        };
        /**
         * Substitui o caminho por um padrão SQL LIKE.
         * @param path - O caminho a ser convertido em um padrão SQL LIKE.
         * @returns {string} O caminho convertido em um padrão SQL LIKE.
         */
        const replacePathToLike = (path) => {
            path = path.replace(/\/((\*)|(\$[^/\$]*))/g, "/%");
            path = path.replace(/\[\*\]/g, "[%]");
            path = path.replace(/\[(\d+)\]/g, "[$1]");
            return path;
        };
        // Adiciona a expressão regular do caminho principal ao array.
        pathsRegex.push(replasePathToRegex(path));
        // Adiciona o padrão SQL LIKE do caminho principal ao array.
        pathsLike.push(replacePathToLike(path).replace(/\/$/gi, ""));
        querys.push(`LIKE '${replacePathToLike(path).replace(/\/$/gi, "")}'`);
        if (onlyChildren) {
            pathsRegex.forEach((exp) => pathsRegex.push(`${exp}(((\/([^/\\[\\]]*))|(\\[([0-9]*)\\])){1})`));
            pathsLike.forEach((exp) => querys.push(`LIKE '${exp}/%'`));
            pathsLike.forEach((exp) => pathsLike.push(`${exp}/%`));
        }
        else if (allHeirs === true) {
            pathsRegex.forEach((exp) => pathsRegex.push(`${exp}(((\/([^/\\[\\]]*))|(\\[([0-9]*)\\])){1,})`));
            pathsLike.forEach((exp) => querys.push(`LIKE '${exp}/%'`));
            pathsLike.forEach((exp) => pathsLike.push(`${exp}/%`));
        }
        else if (typeof allHeirs === "number") {
            pathsRegex.forEach((exp) => pathsRegex.push(`${exp}(((\/([^/\\[\\]]*))|(\\[([0-9]*)\\])){1,${allHeirs}})`));
            // pathsLike.forEach((exp) => querys.push(`LIKE '${exp}/%'`));
            // pathsLike.forEach((exp) => pathsLike.push(`${exp}/%`));
            const p = pathsLike;
            let m = "/%";
            for (let i = 0; i < allHeirs; i++) {
                p.forEach((exp) => querys.push(`LIKE '${exp}${m}'`));
                p.forEach((exp) => pathsLike.push(`${exp}${m}`));
                m += "/%";
            }
        }
        let parent = ivipbase_core_1.PathInfo.get(path).parent;
        // Obtém o caminho pai e adiciona a expressão regular correspondente ao array.
        if (includeAncestor) {
            while (parent) {
                pathsRegex.push(replasePathToRegex(parent.path));
                pathsLike.push(replacePathToLike(parent.path).replace(/\/$/gi, ""));
                querys.push(`LIKE '${replacePathToLike(parent.path).replace(/\/$/gi, "")}'`);
                parent = parent.parent;
            }
        }
        else if (parent) {
            pathsRegex.push(replasePathToRegex(parent.path));
            pathsLike.push(replacePathToLike(parent.path).replace(/\/$/gi, ""));
            querys.push(`LIKE '${replacePathToLike(parent.path).replace(/\/$/gi, "")}'`);
        }
        // Cria a expressão regular completa combinando as expressões individuais no array.
        const fullRegex = new RegExp(`^(${pathsRegex.map((e) => e.replace(/\/$/gi, "/?")).join("$)|(")}$)`);
        return {
            regex: fullRegex,
            query: querys.filter((e, i, l) => l.indexOf(e) === i && e !== ""),
        };
    }
    /**
     * Verifica se um caminho específico existe no nó.
     * @param {string} database - Nome do banco de dados.
     * @param path - O caminho a ser verificado.
     * @returns {Promise<boolean>} `true` se o caminho existir no nó, `false` caso contrário.
     */
    async isPathExists(database, path) {
        path = ivipbase_core_1.PathInfo.get([this.settings.prefix, path]).path;
        const nodeList = await this.getNodesBy(database, path, false, false).then((nodes) => {
            return Promise.resolve(nodes
                .sort(({ content: { modified: aM } }, { content: { modified: bM } }) => {
                return aM > bM ? -1 : aM < bM ? 1 : 0;
            })
                .filter(({ path, content: { modified } }, i, l) => {
                const indexRecent = l.findIndex(({ path: p, content: { modified: m } }) => p === path && m > modified);
                return indexRecent < 0 || indexRecent === i;
            }));
        });
        let nodeSelected = nodeList.find(({ path: p }) => ivipbase_core_1.PathInfo.get(p).equals(path) || ivipbase_core_1.PathInfo.get(p).isParentOf(path));
        if (!nodeSelected) {
            return false;
        }
        else if (ivipbase_core_1.PathInfo.get(nodeSelected.path).isParentOf(path)) {
            const key = ivipbase_core_1.PathInfo.get(path).key;
            return key !== null && nodeSelected.content.type === utils_1.nodeValueTypes.OBJECT && Object.keys(nodeSelected.content.value).includes(key);
        }
        return ivipbase_core_1.PathInfo.get(nodeSelected.path).equals(path);
    }
    /**
     * Obtém uma lista de nodes com base em um caminho e opções adicionais.
     *
     * @param {string} database - Nome do banco de dados.
     * @param {string} path - O caminho a ser usado para filtrar os nodes.
     * @param {boolean} [onlyChildren=false] - Se verdadeiro, exporta apenas os filhos do node especificado.
     * @param {boolean} [allHeirs=false] - Se verdadeiro, exporta todos os descendentes em relação ao path especificado.
     * @returns {Promise<StorageNodeInfo[]>} - Uma Promise que resolve para uma lista de informações sobre os nodes.
     * @throws {Error} - Lança um erro se ocorrer algum problema durante a busca assíncrona.
     */
    async getNodesBy(database, path, onlyChildren = false, allHeirs = false, includeAncestor = false, simplifyValues = false) {
        const expression = this.preparePathQuery(path, onlyChildren, allHeirs, includeAncestor);
        // console.log("getNodesBy::1::", reg.source);
        let result = [];
        try {
            result = await this.settings.getMultiple(database, expression, simplifyValues);
        }
        catch (_a) { }
        // console.log("getNodesBy::2::", JSON.stringify(result, null, 4));
        let nodes = result.filter(({ path: p, content }) => ivipbase_core_1.PathInfo.get(path).equals(p) && (content.type !== utils_1.nodeValueTypes.EMPTY || content.value !== null || content.value !== undefined));
        if (nodes.length <= 0) {
            nodes = result.filter(({ path: p }) => ivipbase_core_1.PathInfo.get(path).isChildOf(p));
        }
        else if (onlyChildren) {
            nodes = result.filter(({ path: p }) => ivipbase_core_1.PathInfo.get(path).equals(p) || ivipbase_core_1.PathInfo.get(path).isParentOf(p));
        }
        else if (allHeirs === true || typeof allHeirs === "number") {
            nodes = result.filter(({ path: p }) => ivipbase_core_1.PathInfo.get(path).equals(p) || ivipbase_core_1.PathInfo.get(path).isAncestorOf(p));
        }
        if (includeAncestor) {
            nodes = result.filter(({ path: p }) => ivipbase_core_1.PathInfo.get(p).isParentOf(path) || ivipbase_core_1.PathInfo.get(p).isAncestorOf(path)).concat(nodes);
        }
        return nodes.filter(({ path }, i, l) => l.findIndex(({ path: p }) => p === path) === i);
    }
    /**
     * Obtém o node pai de um caminho específico.
     * @param {string} database - Nome do banco de dados.
     * @param path - O caminho para o qual o node pai deve ser obtido.
     * @returns {Promise<StorageNodeInfo | undefined>} O node pai correspondente ao caminho ou `undefined` se não for encontrado.
     */
    async getNodeParentBy(database, path) {
        const pathInfo = ivipbase_core_1.PathInfo.get(path);
        const nodes = await this.getNodesBy(database, path, false);
        return nodes
            .filter((node) => {
            const nodePath = ivipbase_core_1.PathInfo.get(node.path);
            return nodePath.path === "" || pathInfo.path === nodePath.path || nodePath.isParentOf(pathInfo);
        })
            .sort((a, b) => {
            const pathA = ivipbase_core_1.PathInfo.get(a.path);
            const pathB = ivipbase_core_1.PathInfo.get(b.path);
            return pathA.isDescendantOf(pathB.path) ? -1 : pathB.isDescendantOf(pathA.path) ? 1 : 0;
        })
            .shift();
    }
    /**
     * Obtém informações personalizadas sobre um node com base no caminho especificado.
     *
     * @param {string} database - Nome do banco de dados.
     * @param {string} path - O caminho do node para o qual as informações devem ser obtidas.
     * @returns {CustomStorageNodeInfo} - Informações personalizadas sobre o node especificado.
     */
    async getInfoBy(database, path, options = {}) {
        var _a, _b, _c, _d;
        const { include_child_count = true, include_prefix = true, cache_nodes } = options;
        const pathInfo = include_prefix ? ivipbase_core_1.PathInfo.get([this.settings.prefix, path]) : ivipbase_core_1.PathInfo.get(path);
        const mainPath = include_prefix ? pathInfo.path.replace(this.settings.prefix + "/", "") : pathInfo.path;
        const nodes = await this.getNodesBy(database, pathInfo.path, true, false);
        const mainNode = nodes.find(({ path: p }) => ivipbase_core_1.PathInfo.get(p).equals(pathInfo.path) || ivipbase_core_1.PathInfo.get(p).isParentOf(pathInfo.path));
        const defaultNode = new NodeInfo_1.CustomStorageNodeInfo({
            path: mainPath,
            key: typeof pathInfo.key === "string" ? pathInfo.key : undefined,
            index: typeof pathInfo.key === "number" ? pathInfo.key : undefined,
            type: 0,
            exists: false,
            address: undefined,
            created: new Date(),
            modified: new Date(),
            revision: "",
            revision_nr: 0,
        });
        if (!mainNode) {
            return defaultNode;
        }
        const content = (0, utils_1.processReadNodeValue)(mainNode.content);
        let value = content.value;
        if (pathInfo.isChildOf(mainNode.path) && pathInfo.key) {
            if ([utils_1.nodeValueTypes.OBJECT, utils_1.nodeValueTypes.ARRAY].includes(mainNode.content.type)) {
                if (Object.keys(value).includes(pathInfo.key)) {
                    value = value[pathInfo.key];
                }
                else {
                    value = null;
                }
            }
            else {
                value = null;
            }
        }
        const containsChild = nodes.findIndex(({ path: p }) => pathInfo.isParentOf(p)) >= 0;
        const isArrayChild = !containsChild && mainNode.content.type === utils_1.nodeValueTypes.ARRAY;
        const info = new NodeInfo_1.CustomStorageNodeInfo({
            path: mainPath,
            key: typeof pathInfo.key === "string" ? pathInfo.key : typeof pathInfo.key !== "number" ? "" : undefined,
            index: typeof pathInfo.key === "number" ? pathInfo.key : undefined,
            type: value !== null ? (0, utils_1.getValueType)(value) : containsChild ? (isArrayChild ? utils_1.VALUE_TYPES.ARRAY : utils_1.VALUE_TYPES.OBJECT) : 0,
            exists: value !== null || containsChild,
            address: new NodeInfo_1.NodeAddress(mainPath),
            created: (_a = new Date(content.created)) !== null && _a !== void 0 ? _a : new Date(),
            modified: (_b = new Date(content.modified)) !== null && _b !== void 0 ? _b : new Date(),
            revision: (_c = content.revision) !== null && _c !== void 0 ? _c : "",
            revision_nr: (_d = content.revision_nr) !== null && _d !== void 0 ? _d : 0,
        });
        info.value = value !== null || value !== undefined ? value : null;
        // if (!PathInfo.get(mainNode.path).equals(pathInfo.path)) {
        // 	info.value = (typeof info.key === "string" ? info.value[info.key] : typeof info.index === "number" ? info.value[info.index] : null) ?? null;
        // }
        if (include_child_count && (containsChild || isArrayChild)) {
            info.childCount = nodes.reduce((c, { path: p }) => c + (pathInfo.isParentOf(p) ? 1 : 0), Object.keys(info.value).length);
        }
        if (info.value !== null && ["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(info.value))) {
            info.value = Object.fromEntries(Object.entries(info.value).sort((a, b) => {
                const key1 = a[0].toString();
                const key2 = b[0].toString();
                return key1.startsWith("__") && !key2.startsWith("__") ? 1 : !key1.startsWith("__") && key2.startsWith("__") ? -1 : key1 > key2 ? 1 : key1 < key2 ? -1 : 0;
            }));
        }
        return info;
    }
    getChildren(database, path, options = {}) {
        const pathInfo = ivipbase_core_1.PathInfo.get([this.settings.prefix, path]);
        const next = async (callback) => {
            var _a, _b, _c;
            const nodes = await this.getNodesBy(database, pathInfo.path, true, false);
            const mainNode = nodes.find(({ path: p }) => ivipbase_core_1.PathInfo.get(p).equals(pathInfo.path));
            let isContinue = true;
            if (!mainNode || ![utils_1.VALUE_TYPES.OBJECT, utils_1.VALUE_TYPES.ARRAY].includes((_a = mainNode.content.type) !== null && _a !== void 0 ? _a : -1)) {
                return;
            }
            const isArray = mainNode.content.type === utils_1.VALUE_TYPES.ARRAY;
            const value = mainNode.content.value;
            let keys = Object.keys(value).map((key) => (isArray ? parseInt(key) : key));
            if (options.keyFilter) {
                keys = keys.filter((key) => options.keyFilter.includes(key));
            }
            keys.length > 0 &&
                keys.every((key) => {
                    var _a;
                    const child = (0, utils_1.getTypeFromStoredValue)(value[key]);
                    const info = new NodeInfo_1.CustomStorageNodeInfo({
                        path: pathInfo.childPath(key).replace(this.settings.prefix + "/", ""),
                        key: isArray ? undefined : key,
                        index: isArray ? key : undefined,
                        type: child.type,
                        address: null,
                        exists: true,
                        value: child.value,
                        revision: mainNode.content.revision,
                        revision_nr: mainNode.content.revision_nr,
                        created: new Date(mainNode.content.created),
                        modified: new Date(mainNode.content.modified),
                    });
                    isContinue = (_a = callback(info)) !== null && _a !== void 0 ? _a : true;
                    return isContinue; // stop .every loop if canceled
                });
            if (!isContinue) {
                return;
            }
            const childNodes = nodes
                .filter((node) => !(pathInfo.equals(node.path) || !pathInfo.isParentOf(node.path)))
                .sort((a, b) => {
                var _a, _b;
                const key1 = ((_a = ivipbase_core_1.PathInfo.get(a.path).key) !== null && _a !== void 0 ? _a : a.path).toString();
                const key2 = ((_b = ivipbase_core_1.PathInfo.get(b.path).key) !== null && _b !== void 0 ? _b : b.path).toString();
                return key1.startsWith("__") && !key2.startsWith("__") ? 1 : !key1.startsWith("__") && key2.startsWith("__") ? -1 : key1 > key2 ? 1 : key1 < key2 ? -1 : 0;
            });
            for (let node of childNodes) {
                if (!isContinue) {
                    break;
                }
                if (pathInfo.equals(node.path) || !pathInfo.isParentOf(node.path)) {
                    continue;
                }
                if (options.keyFilter) {
                    const key = ivipbase_core_1.PathInfo.get(node.path).key;
                    if (options.keyFilter.includes(key !== null && key !== void 0 ? key : "")) {
                        continue;
                    }
                }
                const key = ivipbase_core_1.PathInfo.get(node.path).key;
                const info = new NodeInfo_1.CustomStorageNodeInfo({
                    path: node.path.replace(this.settings.prefix + "/", ""),
                    type: node.content.type,
                    key: isArray ? undefined : (_b = key) !== null && _b !== void 0 ? _b : "",
                    index: isArray ? key : undefined,
                    address: new NodeInfo_1.NodeAddress(node.path),
                    exists: true,
                    value: null, // not loaded
                    revision: node.content.revision,
                    revision_nr: node.content.revision_nr,
                    created: new Date(node.content.created),
                    modified: new Date(node.content.modified),
                });
                isContinue = (_c = callback(info)) !== null && _c !== void 0 ? _c : true;
            }
        };
        return {
            next,
        };
    }
    async get(database, path, options) {
        var _a;
        const _b = options !== null && options !== void 0 ? options : {}, { include_info_node, onlyChildren } = _b, _options = __rest(_b, ["include_info_node", "onlyChildren"]);
        path = ivipbase_core_1.PathInfo.get([this.settings.prefix, path]).path;
        const nodes = await this.getNodesBy(database, path, onlyChildren, true);
        const main_node = nodes.find(({ path: p }) => ivipbase_core_1.PathInfo.get(p).equals(path) || ivipbase_core_1.PathInfo.get(p).isParentOf(path));
        if (!main_node) {
            return undefined;
        }
        // console.log(JSON.stringify(nodes, null, 4));
        const value = (_a = (0, utils_2.removeNulls)((0, structureNodes_1.default)(path, nodes, _options))) !== null && _a !== void 0 ? _a : null;
        return !include_info_node ? value : Object.assign(Object.assign({}, main_node.content), { value });
    }
    /**
     * Define um valor no armazenamento com o caminho especificado.
     *
     * @param {string} database - Nome do banco de dados.
     * @param {string} path - O caminho do node a ser definido.
     * @param {any} value - O valor a ser armazenado em nodes.
     * @param {Object} [options] - Opções adicionais para controlar o comportamento da definição.
     * @param {string} [options.assert_revision] - Uma string que representa a revisão associada ao node, se necessário.
     * @returns {Promise<void>}
     */
    async set(database, path, value, options = {}, type = "SET") {
        var _a;
        type = typeof value !== "object" || value instanceof Array || value instanceof ArrayBuffer || value instanceof Date ? "UPDATE" : type;
        path = ivipbase_core_1.PathInfo.get([this.settings.prefix, path]).path;
        const nodes = destructureData_1.default.apply(this, [type, path, value, options]);
        //console.log("now", JSON.stringify(nodes.find((node) => node.path === "root/test") ?? {}, null, 4));
        const byNodes = await this.getNodesBy(database, path, false, true, true);
        //console.log("olt", JSON.stringify(byNodes.find((node) => node.path === "root/test") ?? {}, null, 4));
        const { added, modified, removed } = prepareMergeNodes_1.default.apply(this, [path, byNodes, nodes]);
        // console.log(JSON.stringify(modified, null, 4));
        // console.log("set", JSON.stringify(nodes, null, 4));
        // console.log("set-added", JSON.stringify(added, null, 4));
        // console.log("set-modified", JSON.stringify(modified, null, 4));
        // console.log("set-removed", JSON.stringify(removed, null, 4));
        const batchError = [];
        const promises = [];
        for (let node of removed) {
            this.emit("remove", {
                name: "remove",
                path: ivipbase_core_1.PathInfo.get(ivipbase_core_1.PathInfo.get(node.path).keys.slice(1)).path,
                value: (0, utils_2.removeNulls)(node.content.value),
            });
            promises.push(async () => {
                try {
                    await Promise.race([this.settings.removeNode(database, node.path, node.content, node)]).catch((e) => {
                        batchError.push({
                            path: node.path,
                            content: Object.assign(Object.assign({}, node.content), { type: 0, value: null }),
                        });
                    });
                }
                catch (_a) { }
            });
        }
        for (let node of modified) {
            this.emit("change", {
                name: "change",
                path: ivipbase_core_1.PathInfo.get(ivipbase_core_1.PathInfo.get(node.path).keys.slice(1)).path,
                value: (0, utils_2.removeNulls)(node.content.value),
                previous: (0, utils_2.removeNulls)((_a = node.previous_content) === null || _a === void 0 ? void 0 : _a.value),
            });
            promises.push(async () => {
                try {
                    await Promise.race([this.settings.setNode(database, node.path, (0, utils_2.removeNulls)(node.content), (0, utils_2.removeNulls)(node))]).catch((e) => {
                        batchError.push(node);
                    });
                }
                catch (_a) { }
            });
        }
        for (let node of added) {
            this.emit("add", {
                name: "add",
                path: ivipbase_core_1.PathInfo.get(ivipbase_core_1.PathInfo.get(node.path).keys.slice(1)).path,
                value: (0, utils_2.removeNulls)(node.content.value),
            });
            promises.push(async () => {
                try {
                    await Promise.race([this.settings.setNode(database, node.path, (0, utils_2.removeNulls)(node.content), (0, utils_2.removeNulls)(node))]).catch((e) => {
                        batchError.push(node);
                    });
                }
                catch (_a) { }
            });
        }
        for (let p of promises) {
            try {
                await p();
            }
            catch (_b) { }
        }
    }
    async update(database, path, value, options = {}) {
        // const beforeValue = await this.get(database, path);
        // value = joinObjects(beforeValue, value);
        await this.set(database, path, value, options, "UPDATE");
    }
    /**
     * Atualiza um nó obtendo seu valor, executando uma função de retorno de chamada que transforma
     * o valor atual e retorna o novo valor a ser armazenado. Garante que o valor lido
     * não mude enquanto a função de retorno de chamada é executada, ou executa a função de retorno de chamada novamente se isso acontecer.
     * @param database nome do banco de dados
     * @param path caminho
     * @param callback função que transforma o valor atual e retorna o novo valor a ser armazenado. Pode retornar uma Promise
     * @param options opções opcionais usadas pela implementação para chamadas recursivas
     * @returns Retorna um novo cursor se o registro de transação estiver habilitado
     */
    async transact(database, path, callback, options = { no_lock: false, suppress_events: false, context: undefined }) {
        var _a, _b;
        const useFakeLock = options && options.no_lock === true;
        const tid = this.createTid();
        // const lock = useFakeLock
        //     ? { tid, release: NOOP } // Trava falsa, vamos usar verificação de revisão e tentativas novamente em vez disso
        //     : await this.nodeLocker.lock(path, tid, true, 'transactNode');
        const lock = { tid, release: NOOP };
        try {
            const node = await this.get(database, path, { include_info_node: true });
            const checkRevision = (_a = node === null || node === void 0 ? void 0 : node.revision) !== null && _a !== void 0 ? _a : ivipbase_core_1.ID.generate();
            let newValue;
            try {
                newValue = await Promise.race([callback((_b = node === null || node === void 0 ? void 0 : node.value) !== null && _b !== void 0 ? _b : null)]).catch((err) => {
                    this.debug.error(`Error in transaction callback: ${err.message}`);
                });
            }
            catch (err) {
                this.debug.error(`Error in transaction callback: ${err.message}`);
            }
            if (typeof newValue === "undefined") {
                // Callback did not return value. Cancel transaction
                return;
            }
            const cursor = await this.update(database, path, newValue, { assert_revision: checkRevision, tid: lock.tid, suppress_events: options.suppress_events, context: options.context });
            return cursor;
        }
        catch (err) {
            throw err;
        }
        finally {
            lock.release();
        }
    }
    byPrefix(prefix) {
        return Object.assign(Object.assign({}, this), { prefix: prefix });
    }
    /**
     * Adiciona, atualiza ou remove uma definição de esquema para validar os valores do nó antes que sejam armazenados no caminho especificado
     * @param database nome do banco de dados
     * @param path caminho de destino para impor o esquema, pode incluir curingas. Ex: 'users/*\/posts/*' ou 'users/$uid/posts/$postid'
     * @param schema definições de tipo de esquema. Quando um valor nulo é passado, um esquema previamente definido é removido.
     */
    setSchema(database, path, schema, warnOnly = false) {
        var _a;
        const schemas = (_a = this.schemas[database]) !== null && _a !== void 0 ? _a : (this.schemas[database] = []);
        if (typeof schema === "undefined") {
            throw new TypeError("schema argument must be given");
        }
        if (schema === null) {
            // Remove o esquema previamente definido no caminho
            const i = schemas.findIndex((s) => s.path === path);
            i >= 0 && schemas.splice(i, 1);
            return;
        }
        // Analise o esquema, adicione ou atualize-o
        const definition = new ivipbase_core_1.SchemaDefinition(schema, {
            warnOnly,
            warnCallback: (message) => this.debug.warn(message),
        });
        const item = schemas.find((s) => s.path === path);
        if (item) {
            item.schema = definition;
        }
        else {
            schemas.push({ path, schema: definition });
            schemas.sort((a, b) => {
                const ka = ivipbase_core_1.PathInfo.getPathKeys(a.path), kb = ivipbase_core_1.PathInfo.getPathKeys(b.path);
                if (ka.length === kb.length) {
                    return 0;
                }
                return ka.length < kb.length ? -1 : 1;
            });
        }
        this.schemas[database] = schemas;
    }
    /**
     * Obtém a definição de esquema atualmente ativa para o caminho especificado
     */
    getSchema(database, path) {
        var _a;
        const schemas = (_a = this.schemas[database]) !== null && _a !== void 0 ? _a : (this.schemas[database] = []);
        const item = schemas.find((item) => item.path === path);
        return item
            ? { path, schema: item.schema.source, text: item.schema.text }
            : {
                path: path,
                schema: {},
                text: "",
            };
    }
    /**
     * Obtém todas as definições de esquema atualmente ativas
     */
    getSchemas(database) {
        var _a;
        const schemas = (_a = this.schemas[database]) !== null && _a !== void 0 ? _a : (this.schemas[database] = []);
        return schemas.map((item) => ({ path: item.path, schema: item.schema.source, text: item.schema.text }));
    }
    /**
     * Valida os esquemas do nó que está sendo atualizado e de seus filhos
     * @param database nome do banco de dados
     * @param path caminho sendo gravado
     * @param value o novo valor, ou atualizações para o valor atual
     * @example
     * // defina o esquema para cada tag de cada post do usuário:
     * db.schema.set(
     *  'root',
     *  'users/$uid/posts/$postId/tags/$tagId',
     *  { name: 'string', 'link_id?': 'number' }
     * );
     *
     * // Inserção que falhará:
     * db.ref('users/352352/posts/572245').set({
     *  text: 'this is my post',
     *  tags: { sometag: 'negue isso' } // <-- sometag deve ser do tipo objeto
     * });
     *
     * // Inserção que falhará:
     * db.ref('users/352352/posts/572245').set({
     *  text: 'this is my post',
     *  tags: {
     *      tag1: { name: 'firstpost', link_id: 234 },
     *      tag2: { name: 'novato' },
     *      tag3: { title: 'Não permitido' } // <-- propriedade title não permitida
     *  }
     * });
     *
     * // Atualização que falha se o post não existir:
     * db.ref('users/352352/posts/572245/tags/tag1').update({
     *  name: 'firstpost'
     * }); // <-- o post está faltando a propriedade text
     */
    validateSchema(database, path, value, options = { updates: false }) {
        var _a;
        const schemas = (_a = this.schemas[database]) !== null && _a !== void 0 ? _a : (this.schemas[database] = []);
        let result = { ok: true };
        const pathInfo = ivipbase_core_1.PathInfo.get(path);
        schemas
            .filter((s) => pathInfo.isOnTrailOf(s.path))
            .every((s) => {
            if (pathInfo.isDescendantOf(s.path)) {
                // Dado que o caminho de verificação é um descendente do caminho de definição de esquema
                const ancestorPath = ivipbase_core_1.PathInfo.fillVariables(s.path, path);
                const trailKeys = pathInfo.keys.slice(ivipbase_core_1.PathInfo.getPathKeys(s.path).length);
                result = s.schema.check(ancestorPath, value, options.updates, trailKeys);
                return result.ok;
            }
            // Dado que o caminho de verificação está no caminho de definição de esquema ou em um caminho superior
            const trailKeys = ivipbase_core_1.PathInfo.getPathKeys(s.path).slice(pathInfo.keys.length);
            if (options.updates === true && trailKeys.length > 0 && !(trailKeys[0] in value)) {
                // Corrige #217: esta atualização em um caminho superior não afeta nenhum dado no caminho alvo do esquema
                return result.ok;
            }
            const partial = options.updates === true && trailKeys.length === 0;
            const check = (path, value, trailKeys) => {
                if (trailKeys.length === 0) {
                    // Check this node
                    return s.schema.check(path, value, partial);
                }
                else if (value === null) {
                    return { ok: true }; // Não no final do caminho, mas não há mais nada para verificar
                }
                const key = trailKeys[0];
                if (typeof key === "string" && (key === "*" || key[0] === "$")) {
                    // Curinga. Verifique cada chave em valor recursivamente
                    if (value === null || typeof value !== "object") {
                        // Não é possível verificar os filhos, porque não há nenhum. Isso é
                        // possível se outra regra permitir que o valor no caminho atual
                        // seja algo diferente de um objeto.
                        return { ok: true };
                    }
                    let result;
                    Object.keys(value).every((childKey) => {
                        const childPath = ivipbase_core_1.PathInfo.getChildPath(path, childKey);
                        const childValue = value[childKey];
                        result = check(childPath, childValue, trailKeys.slice(1));
                        return result.ok;
                    });
                    return result;
                }
                else {
                    const childPath = ivipbase_core_1.PathInfo.getChildPath(path, key);
                    const childValue = value[key];
                    return check(childPath, childValue, trailKeys.slice(1));
                }
            };
            result = check(path, value, trailKeys);
            return result.ok;
        });
        return result;
    }
}
exports.default = MDE;

},{"../../../utils":34,"./NodeInfo":14,"./destructureData":15,"./prepareMergeNodes":17,"./structureNodes":18,"./utils":19,"ivipbase-core":99}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ivipbase_core_1 = require("ivipbase-core");
const utils_1 = require("./utils");
/**
 * Responsável pela mesclagem de nodes soltos, apropriado para evitar conflitos de dados.
 *
 * @param {string} path - Caminho do node a ser processado.
 * @param {StorageNodeInfo[]} nodes - Lista de nodes a serem processados.
 * @param {StorageNodeInfo[]} comparison - Lista de nodes para comparação.
 *
 * @returns {{
 *   result: StorageNodeInfo[];
 *   added: StorageNodeInfo[];
 *   modified: StorageNodeInfo[];
 *   removed: StorageNodeInfo[];
 * }} Retorna uma lista de informações sobre os nodes de acordo com seu estado.
 */
function prepareMergeNodes(path, nodes, comparison) {
    var _a, _b, _c, _d;
    const revision = ivipbase_core_1.ID.generate();
    let result = [];
    let added = [];
    let modified = [];
    let removed = [];
    nodes = nodes.map((node) => {
        node.path = node.path.replace(/\/+$/g, "");
        return node;
    });
    comparison = comparison.map((node) => {
        node.path = node.path.replace(/\/+$/g, "");
        return node;
    });
    // console.log(path, JSON.stringify(nodes, null, 4));
    // console.log(nodes.find(({ path }) => path === "root/__auth__/accounts/admin"));
    for (let node of nodes) {
        let pathInfo = ivipbase_core_1.PathInfo.get(node.path);
        let response = comparison.find(({ path }) => ivipbase_core_1.PathInfo.get(path).equals(node.path));
        if (response) {
            continue;
        }
        while (pathInfo && pathInfo.path.trim() !== "") {
            response = comparison.find(({ path }) => ivipbase_core_1.PathInfo.get(path).equals(pathInfo.path));
            if (response && response.type === "SET") {
                removed.push(node);
                nodes = nodes.filter((n) => !ivipbase_core_1.PathInfo.get(n.path).equals(node.path));
                break;
            }
            pathInfo = ivipbase_core_1.PathInfo.get(pathInfo.parentPath);
        }
    }
    for (let node of comparison) {
        const pathInfo = ivipbase_core_1.PathInfo.get(node.path);
        if (node.content.type === utils_1.nodeValueTypes.EMPTY || node.content.value === null || node.content.value === undefined) {
            const iten = (_a = nodes.find(({ path }) => ivipbase_core_1.PathInfo.get(path).equals(node.path))) !== null && _a !== void 0 ? _a : node;
            removed.push(iten);
            nodes = nodes.filter(({ path }) => !ivipbase_core_1.PathInfo.get(path).equals(iten.path));
            continue;
        }
        if (node.type === "VERIFY") {
            if (nodes.findIndex(({ path }) => ivipbase_core_1.PathInfo.get(node.path).equals(path)) < 0) {
                result.push(node);
                added.push(node);
            }
            continue;
        }
        else {
            const currentNode = nodes.find(({ path }) => ivipbase_core_1.PathInfo.get(path).equals(node.path));
            if (currentNode) {
                let n;
                if (node.type === "SET") {
                    n = Object.assign(Object.assign({}, node), { previous_content: currentNode.content });
                }
                else {
                    n = {
                        path: node.path,
                        type: "UPDATE",
                        content: {
                            type: node.content.type,
                            value: null,
                            created: node.content.created,
                            modified: Date.now(),
                            revision,
                            revision_nr: node.content.revision_nr + 1,
                        },
                        previous_content: currentNode.content,
                    };
                    if (n.content.type === utils_1.nodeValueTypes.OBJECT || n.content.type === utils_1.nodeValueTypes.ARRAY) {
                        n.content.value = Object.assign(Object.assign({}, (typeof currentNode.content.value === "object" ? (_b = currentNode.content.value) !== null && _b !== void 0 ? _b : {} : {})), (typeof node.content.value === "object" ? (_c = node.content.value) !== null && _c !== void 0 ? _c : {} : {}));
                    }
                    else {
                        n.content.value = node.content.value;
                    }
                }
                if (n) {
                    if (JSON.stringify(n.content.value) !== JSON.stringify((_d = n.previous_content) === null || _d === void 0 ? void 0 : _d.value)) {
                        modified.push(n);
                    }
                    result.push(n);
                }
            }
            else {
                added.push(node);
                result.push(node);
            }
        }
    }
    const modifyRevision = (node) => {
        if (node.previous_content) {
            node.content.created = node.previous_content.created;
            node.content.revision_nr = node.previous_content.revision_nr;
        }
        if (node.type === "SET" || node.type === "UPDATE") {
            node.content.modified = Date.now();
        }
        node.content.revision = revision;
        node.content.revision_nr = node.content.revision_nr + 1;
        return node;
    };
    result = result.filter((n, i, l) => l.findIndex(({ path: p }) => ivipbase_core_1.PathInfo.get(p).equals(n.path)) === i).map(modifyRevision);
    added = added.filter((n, i, l) => l.findIndex(({ path: p }) => ivipbase_core_1.PathInfo.get(p).equals(n.path)) === i).map(modifyRevision);
    modified = modified.filter((n, i, l) => l.findIndex(({ path: p }) => ivipbase_core_1.PathInfo.get(p).equals(n.path)) === i).map(modifyRevision);
    removed = removed.filter((n, i, l) => l.findIndex(({ path: p }) => ivipbase_core_1.PathInfo.get(p).equals(n.path)) === i).map(modifyRevision);
    // console.log("removed:", JSON.stringify(removed, null, 4));
    // console.log("RESULT:", path, JSON.stringify(result, null, 4));
    // console.log(path, JSON.stringify({ result, added, modified, removed }, null, 4));
    return { result, added, modified, removed };
}
exports.default = prepareMergeNodes;

},{"./utils":19,"ivipbase-core":99}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ivipbase_core_1 = require("ivipbase-core");
const utils_1 = require("./utils");
function structureNodes(path, nodes, options = {}) {
    var _a, _b;
    options.path_main = !options.path_main ? path : options.path_main;
    const include = ((_a = options === null || options === void 0 ? void 0 : options.include) !== null && _a !== void 0 ? _a : []).map((p) => { var _a; return ivipbase_core_1.PathInfo.get([(_a = options.path_main) !== null && _a !== void 0 ? _a : path, p]); });
    const exclude = ((_b = options === null || options === void 0 ? void 0 : options.exclude) !== null && _b !== void 0 ? _b : []).map((p) => { var _a; return ivipbase_core_1.PathInfo.get([(_a = options.path_main) !== null && _a !== void 0 ? _a : path, p]); });
    const pathInfo = ivipbase_core_1.PathInfo.get(path);
    const checkIncludedPath = (from) => {
        const p = ivipbase_core_1.PathInfo.get(from);
        const isInclude = include.length > 0 ? include.findIndex((path) => p.equals(path) || p.isDescendantOf(path)) >= 0 : true;
        return exclude.findIndex((path) => p.equals(path) || p.isDescendantOf(path)) < 0 && isInclude;
    };
    let value = undefined;
    if (nodes.length === 1) {
        const { path: p, content } = nodes[0];
        value = (0, utils_1.processReadNodeValue)(content).value;
        if (content.type === utils_1.nodeValueTypes.OBJECT) {
            value = Object.fromEntries(Object.entries(value).filter(([k, v]) => {
                const p = ivipbase_core_1.PathInfo.get([path, k]);
                return checkIncludedPath(p.path);
            }));
        }
        if (pathInfo.equals(p) !== true) {
            value = pathInfo.key !== null && pathInfo.key in value ? value[pathInfo.key] : undefined;
        }
    }
    else if (nodes.length > 1) {
        nodes = nodes
            .filter(({ path }) => checkIncludedPath(path))
            .sort(({ path: p1 }, { path: p2 }) => {
            return ivipbase_core_1.PathInfo.get(p1).isAncestorOf(p2) ? -1 : ivipbase_core_1.PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
        });
        const responsibleNode = nodes.find(({ path: p }) => pathInfo.equals(p));
        if (!responsibleNode) {
            value = undefined;
        }
        else {
            value = (0, utils_1.processReadNodeValue)(responsibleNode.content).value;
            const child_nodes = nodes.filter(({ path: p }) => pathInfo.isParentOf(p));
            for (let node of child_nodes) {
                const pathInfo = ivipbase_core_1.PathInfo.get(node.path);
                if (pathInfo.key === null) {
                    continue;
                }
                const v = structureNodes(node.path, nodes.filter(({ path: p }) => pathInfo.equals(p) || pathInfo.isAncestorOf(p)), options);
                value[pathInfo.key] = v;
            }
        }
    }
    return value;
}
exports.default = structureNodes;

},{"./utils":19,"ivipbase-core":99}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTypeFromStoredValue = exports.processReadNodeValue = exports.getTypedChildValue = exports.valueFitsInline = exports.promiseState = exports.getValueType = exports.getNodeValueType = exports.getValueTypeDefault = exports.getValueTypeName = exports.VALUE_TYPES = exports.nodeValueTypes = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const ivip_utils_1 = require("ivip-utils");
const { assert } = ivipbase_core_1.Lib;
exports.nodeValueTypes = {
    EMPTY: 0,
    // Native types:
    OBJECT: 1,
    ARRAY: 2,
    NUMBER: 3,
    BOOLEAN: 4,
    STRING: 5,
    BIGINT: 7,
    // Custom types:
    DATETIME: 6,
    BINARY: 8,
    REFERENCE: 9,
    DEDICATED_RECORD: 99,
};
exports.VALUE_TYPES = exports.nodeValueTypes;
/**
 * Retorna o nome descritivo de um tipo de valor com base no código do tipo.
 *
 * @param {number} valueType - O código do tipo de valor.
 * @returns {string} - O nome descritivo do tipo de valor correspondente.
 * @throws {Error} - Se o código do tipo de valor fornecido for desconhecido.
 *
 * @example
 * const typeName = getValueTypeName(VALUE_TYPES.STRING);
 * // Retorna: "string"
 *
 * @example
 * const typeName = getValueTypeName(99);
 * // Retorna: "dedicated_record"
 */
function getValueTypeName(valueType) {
    switch (valueType) {
        case exports.VALUE_TYPES.ARRAY:
            return "array";
        case exports.VALUE_TYPES.BINARY:
            return "binary";
        case exports.VALUE_TYPES.BOOLEAN:
            return "boolean";
        case exports.VALUE_TYPES.DATETIME:
            return "date";
        case exports.VALUE_TYPES.NUMBER:
            return "number";
        case exports.VALUE_TYPES.OBJECT:
            return "object";
        case exports.VALUE_TYPES.REFERENCE:
            return "reference";
        case exports.VALUE_TYPES.STRING:
            return "string";
        case exports.VALUE_TYPES.BIGINT:
            return "bigint";
        case exports.VALUE_TYPES.DEDICATED_RECORD:
            return "dedicated_record";
        default:
            return "unknown";
    }
}
exports.getValueTypeName = getValueTypeName;
/**
 * Retorna um valor padrão para um tipo de valor com base no código do tipo.
 *
 * @param {number} valueType - O código do tipo de valor.
 * @returns {any} - Um valor padrão correspondente ao tipo de valor especificado.
 *
 * @example
 * const defaultValue = getValueTypeDefault(VALUE_TYPES.STRING);
 * // Retorna: ""
 *
 * @example
 * const defaultValue = getValueTypeDefault(VALUE_TYPES.NUMBER);
 * // Retorna: 0
 */
function getValueTypeDefault(valueType) {
    switch (valueType) {
        case exports.VALUE_TYPES.ARRAY:
            return [];
        case exports.VALUE_TYPES.OBJECT:
            return {};
        case exports.VALUE_TYPES.NUMBER:
            return 0;
        case exports.VALUE_TYPES.BOOLEAN:
            return false;
        case exports.VALUE_TYPES.STRING:
            return "";
        case exports.VALUE_TYPES.BIGINT:
            return BigInt(0);
        case exports.VALUE_TYPES.DATETIME:
            return new Date().toISOString();
        case exports.VALUE_TYPES.BINARY:
            return new Uint8Array();
        case exports.VALUE_TYPES.REFERENCE:
            return null;
        default:
            return undefined; // Or any other default value you prefer
    }
}
exports.getValueTypeDefault = getValueTypeDefault;
/**
 * Determina o tipo de valor de um node com base no valor fornecido.
 *
 * @param {unknown} value - O valor a ser avaliado.
 * @returns {number} - O código do tipo de valor correspondente.
 *
 * @example
 * const valueType = getNodeValueType([1, 2, 3]);
 * // Retorna: VALUE_TYPES.ARRAY
 *
 * @example
 * const valueType = getNodeValueType(new PathReference());
 * // Retorna: VALUE_TYPES.REFERENCE
 */
function getNodeValueType(value) {
    if (value instanceof Array) {
        return exports.VALUE_TYPES.ARRAY;
    }
    else if (value instanceof ivipbase_core_1.PathReference) {
        return exports.VALUE_TYPES.REFERENCE;
    }
    else if (value instanceof ArrayBuffer) {
        return exports.VALUE_TYPES.BINARY;
    }
    else if ((0, ivip_utils_1.isDate)(value)) {
        return exports.VALUE_TYPES.DATETIME;
    }
    // TODO else if (value instanceof DataDocument) { return VALUE_TYPES.DOCUMENT; }
    else if (typeof value === "string") {
        return exports.VALUE_TYPES.STRING;
    }
    else if (typeof value === "object") {
        return exports.VALUE_TYPES.OBJECT;
    }
    else if (typeof value === "bigint") {
        return exports.VALUE_TYPES.BIGINT;
    }
    return exports.VALUE_TYPES.EMPTY;
}
exports.getNodeValueType = getNodeValueType;
/**
 * Determina o tipo de valor de um dado com base no valor fornecido.
 *
 * @param {unknown} value - O valor a ser avaliado.
 * @returns {number} - O código do tipo de valor correspondente.
 *
 * @example
 * const valueType = getValueType([1, 2, 3]);
 * // Retorna: VALUE_TYPES.ARRAY
 *
 * @example
 * const valueType = getValueType(new PathReference());
 * // Retorna: VALUE_TYPES.REFERENCE
 */
function getValueType(value) {
    if (value instanceof Array) {
        return exports.VALUE_TYPES.ARRAY;
    }
    else if (value instanceof ivipbase_core_1.PathReference) {
        return exports.VALUE_TYPES.REFERENCE;
    }
    else if (value instanceof ArrayBuffer) {
        return exports.VALUE_TYPES.BINARY;
    }
    else if ((0, ivip_utils_1.isDate)(value)) {
        return exports.VALUE_TYPES.DATETIME;
    }
    // TODO else if (value instanceof DataDocument) { return VALUE_TYPES.DOCUMENT; }
    else if (typeof value === "string") {
        return exports.VALUE_TYPES.STRING;
    }
    else if (typeof value === "object" && value !== null) {
        return exports.VALUE_TYPES.OBJECT;
    }
    else if (typeof value === "number") {
        return exports.VALUE_TYPES.NUMBER;
    }
    else if (typeof value === "boolean") {
        return exports.VALUE_TYPES.BOOLEAN;
    }
    else if (typeof value === "bigint") {
        return exports.VALUE_TYPES.BIGINT;
    }
    return exports.VALUE_TYPES.EMPTY;
}
exports.getValueType = getValueType;
const promiseState = (p) => {
    const t = { __timestamp__: Date.now() };
    return Promise.race([p, t]).then((v) => (v === t ? "pending" : "fulfilled"), () => "rejected");
};
exports.promiseState = promiseState;
/**
 * Verifica se um valor pode ser armazenado em um objeto pai ou se deve ser movido
 * para um registro dedicado com base nas configurações de tamanho máximo (`maxInlineValueSize`).
 * @param value - O valor a ser verificado.
 * @returns {boolean} `true` se o valor pode ser armazenado inline, `false` caso contrário.
 * @throws {TypeError} Lança um erro se o tipo do valor não for suportado.
 */
function valueFitsInline(value, settings) {
    value = value == undefined ? null : value;
    if (typeof value === "number" || typeof value === "boolean" || (0, ivip_utils_1.isDate)(value)) {
        return true;
    }
    else if (typeof value === "string") {
        if (value.length > settings.maxInlineValueSize) {
            return false;
        }
        // Se a string contém caracteres Unicode, o tamanho em bytes será maior do que `value.length`.
        const encoded = (0, ivip_utils_1.encodeString)(value);
        return encoded.length < settings.maxInlineValueSize;
    }
    else if (value instanceof ivipbase_core_1.PathReference) {
        if (value.path.length > settings.maxInlineValueSize) {
            return false;
        }
        // Se o caminho contém caracteres Unicode, o tamanho em bytes será maior do que `value.path.length`.
        const encoded = (0, ivip_utils_1.encodeString)(value.path);
        return encoded.length < settings.maxInlineValueSize;
    }
    else if (value instanceof ArrayBuffer) {
        return value.byteLength < settings.maxInlineValueSize;
    }
    else if (value instanceof Array) {
        return value.length === 0;
    }
    else if (typeof value === "object") {
        return value === null || Object.keys(value).length === 0;
    }
    else {
        throw new TypeError("What else is there?");
    }
}
exports.valueFitsInline = valueFitsInline;
/**
 * Obtém um valor tipado apropriado para armazenamento com base no tipo do valor fornecido.
 * @param val - O valor a ser processado.
 * @returns {any} O valor processado.
 * @throws {Error} Lança um erro se o valor não for suportado ou se for nulo.
 */
function getTypedChildValue(val) {
    if (val === null || val === undefined) {
        return null;
        //throw new Error(`Not allowed to store null values. remove the property`);
    }
    else if ((0, ivip_utils_1.isDate)(val)) {
        return { type: exports.VALUE_TYPES.DATETIME, value: new Date(val).getTime() };
    }
    else if (["string", "number", "boolean"].includes(typeof val)) {
        return val;
    }
    else if (val instanceof ivipbase_core_1.PathReference) {
        return { type: exports.VALUE_TYPES.REFERENCE, value: val.path };
    }
    else if (val instanceof ArrayBuffer) {
        return { type: exports.VALUE_TYPES.BINARY, value: ivipbase_core_1.ascii85.encode(val) };
    }
    else if (typeof val === "object") {
        assert(Object.keys(val).length === 0 || ("type" in val && val.type === exports.VALUE_TYPES.DEDICATED_RECORD), "child object stored in parent can only be empty");
        return val;
    }
    return val;
}
exports.getTypedChildValue = getTypedChildValue;
/**
 * Processa o valor de um nó de armazenamento durante a leitura, convertendo valores tipados de volta ao formato original.
 * @param node - O nó de armazenamento a ser processado.
 * @returns {StorageNode} O nó de armazenamento processado.
 * @throws {Error} Lança um erro se o tipo de registro autônomo for inválido.
 */
function processReadNodeValue(node) {
    const getTypedChildValue = (val) => {
        // Valor tipado armazenado em um registro pai
        if (val.type === exports.VALUE_TYPES.BINARY) {
            // Binário armazenado em um registro pai como uma string
            return ivipbase_core_1.ascii85.decode(val.value);
        }
        else if (val.type === exports.VALUE_TYPES.DATETIME) {
            // Valor de data armazenado como número
            return new Date(val.value);
        }
        else if (val.type === exports.VALUE_TYPES.REFERENCE) {
            // Referência de caminho armazenada como string
            return new ivipbase_core_1.PathReference(val.value);
        }
        else if (val.type === exports.VALUE_TYPES.DEDICATED_RECORD) {
            return getValueTypeDefault(val.value);
        }
        else {
            throw new Error(`Unhandled child value type ${val.type}`);
        }
    };
    node = JSON.parse(JSON.stringify(node));
    switch (node.type) {
        case exports.VALUE_TYPES.ARRAY: {
            node.value = [];
            break;
        }
        case exports.VALUE_TYPES.OBJECT: {
            // Verifica se algum valor precisa ser convertido
            // NOTA: Arrays são armazenados com propriedades numéricas
            const obj = node.value;
            if (obj !== null) {
                Object.keys(obj).forEach((key) => {
                    const item = obj[key];
                    if (item !== null && typeof item === "object" && "type" in item) {
                        obj[key] = getTypedChildValue(item);
                    }
                });
            }
            node.value = obj;
            break;
        }
        case exports.VALUE_TYPES.BINARY: {
            node.value = ivipbase_core_1.ascii85.decode(node.value);
            break;
        }
        case exports.VALUE_TYPES.REFERENCE: {
            node.value = new ivipbase_core_1.PathReference(node.value);
            break;
        }
        case exports.VALUE_TYPES.STRING: {
            // Nenhuma ação necessária
            // node.value = node.value;
            break;
        }
        default:
            node.value = null;
        // throw new Error(`Invalid standalone record value type: ${node.type}`); // nunca deve acontecer
    }
    return node;
}
exports.processReadNodeValue = processReadNodeValue;
const getTypeFromStoredValue = (val) => {
    let type;
    if (typeof val === "string") {
        type = exports.VALUE_TYPES.STRING;
    }
    else if (typeof val === "number") {
        type = exports.VALUE_TYPES.NUMBER;
    }
    else if (typeof val === "boolean") {
        type = exports.VALUE_TYPES.BOOLEAN;
    }
    else if (val instanceof Array) {
        type = exports.VALUE_TYPES.ARRAY;
    }
    else if (typeof val === "object") {
        if (val && "type" in val) {
            const serialized = val;
            type = serialized.type;
            val = serialized.value;
            if (type === exports.VALUE_TYPES.DATETIME) {
                val = new Date(val);
            }
            else if (type === exports.VALUE_TYPES.REFERENCE) {
                val = new ivipbase_core_1.PathReference(val);
            }
        }
        else {
            type = exports.VALUE_TYPES.OBJECT;
        }
    }
    else {
        throw new Error(`Unknown value type`);
    }
    return { type, value: val };
};
exports.getTypeFromStoredValue = getTypeFromStoredValue;

},{"ivip-utils":72,"ivipbase-core":99}],20:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./DataStorage"), exports);
__exportStar(require("./CustomStorage"), exports);

},{"./CustomStorage":12,"./DataStorage":13}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageDBClient = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const error_1 = require("../controller/request/error");
const auth_1 = require("../auth");
class PromiseTimeoutError extends Error {
}
function promiseTimeout(promise, ms, comment) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new PromiseTimeoutError(`Promise ${comment ? `"${comment}" ` : ""}timed out after ${ms}ms`)), ms);
        function success(result) {
            clearTimeout(timeout);
            resolve(result);
        }
        promise.then(success).catch(reject);
    });
}
class StorageDBClient extends ivipbase_core_1.Api {
    constructor(db) {
        super();
        this.db = db;
        this._realtimeQueries = {};
        this.app = db.app;
        this.url = this.app.url.replace(/\/+$/, "");
        this.initialize();
        this.app.onConnect(async (socket) => {
            const subscribePromises = [];
            this.db.subscriptions.forEach((event, path) => {
                subscribePromises.push(new Promise(async (resolve, reject) => {
                    try {
                        await this.app.websocketRequest(socket, "subscribe", { path: path, event: event }, this.db.name);
                    }
                    catch (err) {
                        if (err.code === "access_denied" && !this.db.accessToken) {
                            this.db.debug.error(`Could not subscribe to event "${event}" on path "${path}" because you are not signed in. If you added this event while offline and have a user access token, you can prevent this by using client.auth.setAccessToken(token) to automatically try signing in after connecting`);
                        }
                        else {
                            this.db.debug.error(err);
                        }
                    }
                }));
            });
            await Promise.all(subscribePromises);
        });
        this.app.ready(() => {
            var _a, _b;
            (_a = this.app.socket) === null || _a === void 0 ? void 0 : _a.on("data-event", (data) => {
                var _a;
                const val = ivipbase_core_1.Transport.deserialize(data.val);
                const context = (_a = data.context) !== null && _a !== void 0 ? _a : {};
                context.acebase_event_source = "server";
                const isValid = this.db.subscriptions.hasValueSubscribersForPath(data.subscr_path);
                if (!isValid) {
                    return;
                }
                this.db.subscriptions.trigger(data.event, data.subscr_path, data.path, val.previous, val.current, context);
            });
            (_b = this.app.socket) === null || _b === void 0 ? void 0 : _b.on("query-event", (data) => {
                var _a;
                data = ivipbase_core_1.Transport.deserialize(data);
                const query = this._realtimeQueries[data.query_id];
                let keepMonitoring = true;
                try {
                    keepMonitoring = query.options.eventHandler(data);
                }
                catch (err) {
                    keepMonitoring = false;
                }
                if (keepMonitoring === false) {
                    delete this._realtimeQueries[data.query_id];
                    (_a = this.app.socket) === null || _a === void 0 ? void 0 : _a.emit("query-unsubscribe", { dbName: this.db.database, query_id: data.query_id });
                }
            });
        });
    }
    get serverPingUrl() {
        return `/ping/${this.db.database}`;
    }
    async initialize() {
        this.app.onConnect(async () => {
            await (0, auth_1.getAuth)(this.db.database).initialize();
            await this.app.request({ route: this.serverPingUrl });
            this.db.emit("ready");
        }, true);
    }
    get isConnected() {
        return this.app.isConnected;
    }
    get isConnecting() {
        return this.app.isConnecting;
    }
    get connectionState() {
        return this.app.connectionState;
    }
    async _request(options) {
        var _a, _b;
        if (this.isConnected || options.ignoreConnectionState === true) {
            const auth = this.app.auth.get(this.db.database);
            try {
                const accessToken = (_a = auth === null || auth === void 0 ? void 0 : auth.currentUser) === null || _a === void 0 ? void 0 : _a.accessToken;
                return await this.db.app.request(Object.assign(Object.assign({}, options), { accessToken }));
            }
            catch (err) {
                (_b = auth === null || auth === void 0 ? void 0 : auth.currentUser) === null || _b === void 0 ? void 0 : _b.reload();
                if (this.isConnected && err.isNetworkError) {
                    // This is a network error, but the websocket thinks we are still connected.
                    this.db.debug.warn(`A network error occurred loading ${options.route}`);
                    // Start reconnection flow
                    // this._handleDetectedDisconnect(err);
                }
                // Rethrow the error
                throw err;
            }
        }
        else {
            // We're not connected. We can wait for the connection to be established,
            // or fail the request now. Because we have now implemented caching, live requests
            // are only executed if they are not allowed to use cached responses. Wait for a
            // connection to be established (max 1s), then retry or fail
            // if (!this.isConnecting || !this.settings.network?.realtime) {
            if (!this.isConnecting) {
                // We're currently not trying to connect, or not using websocket connection (normal connection logic is still used).
                // Fail now
                throw new Error(error_1.NOT_CONNECTED_ERROR_MESSAGE);
            }
            const connectPromise = new Promise((resolve) => { var _a; return (_a = this.app.socket) === null || _a === void 0 ? void 0 : _a.once("connect", resolve); });
            await promiseTimeout(connectPromise, 1000, "Waiting for connection").catch((err) => {
                throw new Error(error_1.NOT_CONNECTED_ERROR_MESSAGE);
            });
            return this._request(options); // Retry
        }
    }
    connect(retry = true) { }
    disconnect() { }
    async subscribe(path, event, callback, settings) {
        try {
            this.db.subscriptions.add(path, event, callback);
            await this.app.websocketRequest(this.app.socket, "subscribe", { path: path, event: event }, this.db.name);
        }
        catch (err) {
            this.db.debug.error(err);
        }
    }
    async unsubscribe(path, event, callback) {
        try {
            this.db.subscriptions.remove(path, event, callback);
            await this.app.websocketRequest(this.app.socket, "unsubscribe", { path: path, event: event }, this.db.name);
        }
        catch (err) {
            this.db.debug.error(err);
        }
    }
    async getInfo() {
        return await this._request({ route: `/info/${this.db.database}` });
    }
    async stats() {
        return this._request({ route: `/stats/${this.db.database}` });
    }
    async set(path, value, options = {
        suppress_events: true,
        context: {},
    }) {
        var _a;
        const data = JSON.stringify(ivipbase_core_1.Transport.serialize(value));
        const { context } = await this._request({ method: "PUT", route: `/data/${this.db.database}/${path}`, data, context: (_a = options.context) !== null && _a !== void 0 ? _a : {}, includeContext: true });
        const cursor = context === null || context === void 0 ? void 0 : context.database_cursor;
        return { cursor };
    }
    async update(path, updates, options = {
        suppress_events: true,
        context: {},
    }) {
        const data = JSON.stringify(ivipbase_core_1.Transport.serialize(updates));
        const { context } = await this._request({ method: "POST", route: `/data/${this.db.database}/${path}`, data, context: options.context, includeContext: true });
        const cursor = context === null || context === void 0 ? void 0 : context.database_cursor;
        return { cursor };
    }
    async transaction(path, callback, options = {
        suppress_events: false,
        context: null,
    }) {
        const { value, context } = await this.get(path, { child_objects: true });
        const newValue = await Promise.race([callback(value !== null && value !== void 0 ? value : null)]);
        return this.update(path, newValue, { suppress_events: options.suppress_events, context: options.context });
    }
    async get(path, options) {
        const { data, context } = await this._request({ route: `/data/${this.db.database}/${path}`, context: options, includeContext: true });
        return { value: ivipbase_core_1.Transport.deserialize(data), context, cursor: context === null || context === void 0 ? void 0 : context.database_cursor };
    }
    exists(path) {
        return this._request({ route: `/exists/${this.db.database}/${path}` });
    }
    async query(path, query, options = { snapshots: false, monitor: { add: false, change: false, remove: false } }) {
        const request = {
            query,
            options,
        };
        if (options.monitor === true || (typeof options.monitor === "object" && (options.monitor.add || options.monitor.change || options.monitor.remove))) {
            console.assert(typeof options.eventHandler === "function", `no eventHandler specified to handle realtime changes`);
            if (!this.app.socket) {
                throw new Error(`Cannot create realtime query because websocket is not connected. Check your AceBaseClient network.realtime setting`);
            }
            request.query_id = ivipbase_core_1.ID.generate();
            request.client_id = this.app.socket.id;
            this._realtimeQueries[request.query_id] = { query, options };
        }
        const reqData = JSON.stringify(ivipbase_core_1.Transport.serialize(request));
        try {
            const { data, context } = await this._request({ method: "POST", route: `/query/${this.db.database}/${path}`, data: reqData, includeContext: true });
            const results = ivipbase_core_1.Transport.deserialize(data);
            const stop = async () => {
                delete this._realtimeQueries[request.query_id];
                await this.app.websocketRequest(this.app.socket, "query-unsubscribe", { query_id: request.query_id }, this.db.name);
            };
            return { results: results.list, context, stop };
        }
        catch (err) {
            throw err;
        }
    }
    reflect(path, type, args) {
        let route = `/reflect/${this.db.database}/${path}?type=${type}`;
        if (typeof args === "object") {
            const query = Object.keys(args).map((key) => {
                return `${key}=${args[key]}`;
            });
            if (query.length > 0) {
                route += `&${query.join("&")}`;
            }
        }
        return this._request({ route });
    }
    export(path, write, options = { format: "json", type_safe: true }) {
        options.format = "json";
        options.type_safe = options.type_safe !== false;
        const route = `/export/${this.db.database}/${path}?format=${options.format}&type_safe=${options.type_safe ? 1 : 0}`;
        return this._request({ route, dataReceivedCallback: (chunk) => write(chunk) });
    }
    import(path, read, options = { format: "json", suppress_events: false }) {
        options.format = "json";
        options.suppress_events = options.suppress_events === true;
        const route = `/import/${this.db.database}/${path}?format=${options.format}&suppress_events=${options.suppress_events ? 1 : 0}`;
        return this._request({ method: "POST", route, dataRequestCallback: (length) => read(length) });
    }
    async getServerInfo() {
        const info = await this._request({ route: `/info/${this.db.database}` }).catch((err) => {
            // Prior to acebase-server v0.9.37, info was at /info (no dbname attached)
            if (!err.isNetworkError) {
                this.db.debug.warn(`Could not get server info, update your acebase server version`);
            }
            return { version: "unknown", time: Date.now() };
        });
        return info;
    }
    setSchema(path, schema, warnOnly = false) {
        if (schema !== null) {
            schema = new ivipbase_core_1.SchemaDefinition(schema).text;
        }
        const data = JSON.stringify({ action: "set", path, schema, warnOnly });
        return this._request({ method: "POST", route: `/schema/${this.db.database}`, data });
    }
    getSchema(path) {
        return this._request({ route: `/schema/${this.db.database}/${path}` });
    }
    getSchemas() {
        return this._request({ route: `/schema/${this.db.database}` });
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async validateSchema(path, value, isUpdate) {
        throw new Error(`Manual schema validation can only be used on standalone databases`);
    }
}
exports.StorageDBClient = StorageDBClient;

},{"../auth":5,"../controller/request/error":11,"ivipbase-core":99}],22:[function(require,module,exports){
(function (process){(function (){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageDBServer = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const MDE_1 = require("../controller/storage/MDE");
const utils_1 = require("../utils");
const executeQuery_1 = __importDefault(require("../controller/executeQuery"));
class StorageDBServer extends ivipbase_core_1.Api {
    constructor(db) {
        super();
        this.db = db;
        this.cache = {};
        this.db.app.storage.ready(() => {
            this.db.emit("ready");
        });
    }
    async getInfo() {
        return {
            dbname: this.db.database,
            version: "",
            time: Date.now(),
            process: process.pid,
        };
    }
    async stats() {
        return {
            writes: 0,
            reads: 0,
            bytesRead: 0,
            bytesWritten: 0,
        };
    }
    subscribe(path, event, callback, settings) {
        this.db.subscriptions.add(path, event, callback);
    }
    unsubscribe(path, event, callback) {
        this.db.subscriptions.remove(path, event, callback);
    }
    async set(path, value, options) {
        await this.db.app.storage.set(this.db.database, path, value);
        return {};
    }
    async get(path, options) {
        if (!options) {
            options = {};
        }
        if (typeof options.include !== "undefined" && !(options.include instanceof Array)) {
            throw new TypeError(`options.include must be an array of key names`);
        }
        if (typeof options.exclude !== "undefined" && !(options.exclude instanceof Array)) {
            throw new TypeError(`options.exclude must be an array of key names`);
        }
        const value = await this.db.app.storage.get(this.db.database, path, options);
        return { value, context: { more: false } };
    }
    async update(path, updates, options) {
        await this.db.app.storage.update(this.db.database, path, updates);
        return {};
    }
    async transaction(path, callback, options = {
        suppress_events: false,
        context: null,
    }) {
        const cursor = await this.db.app.storage.transact(this.db.database, path, callback, { suppress_events: options.suppress_events, context: options.context });
        return Object.assign({}, (cursor && { cursor }));
    }
    async exists(path) {
        return await this.db.app.storage.isPathExists(this.db.database, path);
    }
    async query(path, query, options = { snapshots: false }) {
        const results = await (0, executeQuery_1.default)(this.db.app, this.db.database, path, query, options);
        return results;
    }
    async export(path, stream, options) {
        const data = await this.get(path);
        const json = JSON.stringify(data.value);
        for (let i = 0; i < json.length; i += 1000) {
            await stream(json.slice(i, i + 1000));
        }
    }
    async import(path, read, options) {
        let json = "";
        const chunkSize = 256 * 1024; // 256KB
        const maxQueueBytes = 1024 * 1024; // 1MB
        const state = {
            data: "",
            index: 0,
            offset: 0,
        };
        const readNextChunk = async (append = false) => {
            let data = await read(chunkSize);
            if (data === null) {
                if (state.data) {
                    throw new Error(`Unexpected EOF at index ${state.offset + state.data.length}`);
                }
                else {
                    throw new Error("Unable to read data from stream");
                }
            }
            else if (typeof data === "object") {
                data = ivipbase_core_1.Utils.decodeString(data);
            }
            if (append) {
                state.data += data;
            }
            else {
                state.offset += state.data.length;
                state.data = data;
                state.index = 0;
            }
        };
        return;
    }
    async reflect(path, type, args) {
        var _a, _b, _c, _d, _e, _f;
        args = args || {};
        const getChildren = async (path, limit = 50, skip = 0, from = null) => {
            if (typeof limit === "string") {
                limit = parseInt(limit);
            }
            if (typeof skip === "string") {
                skip = parseInt(skip);
            }
            if (["null", "undefined", null, undefined].includes(from)) {
                from = null;
            }
            const children = []; // Array<{ key: string | number; type: string; value: any; address?: any }>;
            let n = 0, stop = false, more = false; //stop = skip + limit,
            await this.db.app.storage
                .getChildren(this.db.database, path)
                .next((childInfo) => {
                var _a, _b, _c;
                if (stop) {
                    // Stop 1 child too late on purpose to make sure there's more
                    more = true;
                    return false; // Stop iterating
                }
                n++;
                const include = from !== null && childInfo.key ? childInfo.key > from : skip === 0 || n > skip;
                if (include) {
                    children.push((0, utils_1.removeNulls)(Object.assign({ key: (_a = (typeof childInfo.key === "string" ? childInfo.key : childInfo.index)) !== null && _a !== void 0 ? _a : "", type: (_b = childInfo.valueTypeName) !== null && _b !== void 0 ? _b : "unknown", value: (_c = childInfo.value) !== null && _c !== void 0 ? _c : null }, (typeof childInfo.address === "object" && {
                        address: childInfo.address,
                    }))));
                }
                stop = limit > 0 && children.length === limit;
            })
                .catch((err) => {
                throw err;
            });
            return {
                more,
                list: children,
            };
        };
        switch (type) {
            case "children": {
                const result = await getChildren(path, args.limit, args.skip, args.from);
                return result;
            }
            case "info": {
                const info = {
                    key: "",
                    exists: false,
                    type: "unknown",
                    value: undefined,
                    address: undefined,
                    children: {
                        count: 0,
                        more: false,
                        list: [],
                    },
                };
                const nodeInfo = await this.db.app.storage.getInfoBy(this.db.database, path, { include_child_count: args.child_count === true });
                info.key = (_a = (typeof nodeInfo.key !== "undefined" ? nodeInfo.key : nodeInfo.index)) !== null && _a !== void 0 ? _a : "";
                info.exists = (_b = nodeInfo.exists) !== null && _b !== void 0 ? _b : false;
                info.type = (_c = (nodeInfo.exists ? nodeInfo.valueTypeName : undefined)) !== null && _c !== void 0 ? _c : "unknown";
                if (![MDE_1.VALUE_TYPES.OBJECT, MDE_1.VALUE_TYPES.ARRAY].includes((_d = nodeInfo.type) !== null && _d !== void 0 ? _d : 0)) {
                    info.value = nodeInfo.value;
                }
                info.address = typeof nodeInfo.address === "object" ? nodeInfo.address : undefined;
                const isObjectOrArray = nodeInfo.exists && nodeInfo.address && [MDE_1.VALUE_TYPES.OBJECT, MDE_1.VALUE_TYPES.ARRAY].includes((_e = nodeInfo.type) !== null && _e !== void 0 ? _e : 0);
                if (args.child_count === true) {
                    info.children = { count: isObjectOrArray ? (_f = nodeInfo.childCount) !== null && _f !== void 0 ? _f : 0 : 0 };
                }
                else if (typeof args.child_limit === "number" && args.child_limit > 0) {
                    if (isObjectOrArray) {
                        info.children = await getChildren(path, args.child_limit, args.child_skip, args.child_from);
                    }
                }
                return info;
            }
        }
    }
    setSchema(path, schema, warnOnly) {
        return new Promise((resolve, reject) => {
            resolve(this.db.app.storage.setSchema(this.db.database, path, schema, warnOnly));
        });
    }
    getSchema(path) {
        return new Promise((resolve, reject) => {
            resolve(this.db.app.storage.getSchema(this.db.database, path));
        });
    }
    async getSchemas() {
        return new Promise((resolve, reject) => {
            resolve(this.db.app.storage.getSchemas(this.db.database));
        });
    }
    validateSchema(path, value, isUpdate) {
        return new Promise((resolve, reject) => {
            resolve(this.db.app.storage.validateSchema(this.db.database, path, value, { updates: isUpdate }));
        });
    }
}
exports.StorageDBServer = StorageDBServer;

}).call(this)}).call(this,require('_process'))
},{"../controller/executeQuery":9,"../controller/storage/MDE":16,"../utils":34,"_process":102,"ivipbase-core":99}],23:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subscriptions = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const utils_1 = require("../utils");
const SUPPORTED_EVENTS = ["value", "child_added", "child_changed", "child_removed", "mutated", "mutations"];
SUPPORTED_EVENTS.push(...SUPPORTED_EVENTS.map((event) => `notify_${event}`));
class Subscriptions extends ivipbase_core_1.SimpleEventEmitter {
    constructor() {
        super(...arguments);
        this._eventSubscriptions = {};
    }
    forEach(callback) {
        Object.keys(this._eventSubscriptions).forEach((path) => {
            this._eventSubscriptions[path].forEach((sub) => {
                callback(sub.type, path, sub.callback);
            });
        });
    }
    countByPath(path) {
        return (this._eventSubscriptions[path] || []).length;
    }
    /**
     * Adiciona uma assinatura a um nó
     * @param path Caminho para o nó ao qual adicionar a assinatura
     * @param type Tipo da assinatura
     * @param callback Função de retorno de chamada da assinatura
     */
    add(path, type, callback) {
        if (SUPPORTED_EVENTS.indexOf(type) < 0) {
            throw new TypeError(`Invalid event type "${type}"`);
        }
        let pathSubs = this._eventSubscriptions[path];
        if (!pathSubs) {
            pathSubs = this._eventSubscriptions[path] = [];
        }
        // if (pathSubs.findIndex(ps => ps.type === type && ps.callback === callback)) {
        //     storage.debug.warn(`Identical subscription of type ${type} on path "${path}" being added`);
        // }
        pathSubs.push({ created: Date.now(), type, callback });
        this.emit("subscribe", { path, event: type, callback });
    }
    /**
     * Remove 1 ou mais assinaturas de um nó
     * @param path Caminho para o nó do qual remover a assinatura
     * @param type Tipo de assinatura(s) a ser removido (opcional: se omitido, todos os tipos serão removidos)
     * @param callback Callback a ser removido (opcional: se omitido, todos do mesmo tipo serão removidos)
     */
    remove(path, type, callback) {
        const pathSubs = this._eventSubscriptions[path];
        if (!pathSubs) {
            return;
        }
        const next = () => pathSubs.findIndex((ps) => (type ? ps.type === type : true) && (callback ? ps.callback === callback : true));
        let i;
        while ((i = next()) >= 0) {
            pathSubs.splice(i, 1);
        }
        this.emit("unsubscribe", { path, event: type, callback });
    }
    /**
     * Verifica se existem assinantes no caminho fornecido que precisam do valor anterior do nó quando uma alteração é acionada
     * @param path
     */
    hasValueSubscribersForPath(path) {
        const valueNeeded = this.getValueSubscribersForPath(path);
        return !!valueNeeded;
    }
    /**
     * Obtém todos os assinantes no caminho fornecido que precisam do valor anterior do nó quando uma alteração é acionada
     * @param path
     */
    getValueSubscribersForPath(path) {
        // Assinantes que DEVEM ter o valor anterior completo de um nó antes da atualização:
        //  - Eventos "value" no próprio caminho e em qualquer caminho ancestral
        //  - Eventos "child_added", "child_removed" no caminho pai
        //  - Eventos "child_changed" no caminho pai e em seus ancestrais
        //  - TODOS os eventos em caminhos filhos/descendentes
        const pathInfo = new ivipbase_core_1.PathInfo(path);
        const valueSubscribers = [];
        Object.keys(this._eventSubscriptions).forEach((subscriptionPath) => {
            if (pathInfo.equals(subscriptionPath) || pathInfo.isDescendantOf(subscriptionPath)) {
                // Caminho sendo atualizado === subscriptionPath, ou um caminho filho/descendente dele
                // por exemplo, caminho === "posts/123/title"
                // e subscriptionPath é "posts/123/title", "posts/$postId/title", "posts/123", "posts/*", "posts", etc.
                const pathSubs = this._eventSubscriptions[subscriptionPath];
                const eventPath = ivipbase_core_1.PathInfo.fillVariables(subscriptionPath, path);
                pathSubs
                    .filter((sub) => !sub.type.startsWith("notify_")) // Eventos de notificação não precisam de carregamento de valor adicional
                    .forEach((sub) => {
                    let dataPath = null;
                    if (sub.type === "value") {
                        // ["value", "notify_value"].includes(sub.type)
                        dataPath = eventPath;
                    }
                    else if (["mutated", "mutations"].includes(sub.type) && pathInfo.isDescendantOf(eventPath)) {
                        //["mutated", "notify_mutated"].includes(sub.type)
                        dataPath = path; // A única informação necessária são as propriedades sendo atualizadas no caminho alvo
                    }
                    else if (sub.type === "child_changed" && path !== eventPath) {
                        // ["child_changed", "notify_child_changed"].includes(sub.type)
                        const childKey = ivipbase_core_1.PathInfo.getPathKeys(path.slice(eventPath.length).replace(/^\//, ""))[0];
                        dataPath = childKey !== "" ? ivipbase_core_1.PathInfo.getChildPath(eventPath, childKey) : null;
                    }
                    else if (["child_added", "child_removed"].includes(sub.type) && pathInfo.isChildOf(eventPath)) {
                        //["child_added", "child_removed", "notify_child_added", "notify_child_removed"]
                        const childKey = ivipbase_core_1.PathInfo.getPathKeys(path.slice(eventPath.length).replace(/^\//, ""))[0];
                        dataPath = childKey !== "" ? ivipbase_core_1.PathInfo.getChildPath(eventPath, childKey) : null;
                    }
                    if (dataPath !== null && !valueSubscribers.some((s) => s.type === sub.type && s.eventPath === eventPath)) {
                        valueSubscribers.push({ type: sub.type, eventPath, dataPath, subscriptionPath });
                    }
                });
            }
        });
        return valueSubscribers;
    }
    /**
     * Obtém todos os assinantes no caminho fornecido que possivelmente podem ser acionados após a atualização de um nó
     */
    getAllSubscribersForPath(path) {
        const pathInfo = ivipbase_core_1.PathInfo.get(path);
        const subscribers = [];
        Object.keys(this._eventSubscriptions).forEach((subscriptionPath) => {
            // if (pathInfo.equals(subscriptionPath) //path === subscriptionPath
            //     || pathInfo.isDescendantOf(subscriptionPath)
            //     || pathInfo.isAncestorOf(subscriptionPath)
            // ) {
            if (pathInfo.isOnTrailOf(subscriptionPath)) {
                const pathSubs = this._eventSubscriptions[subscriptionPath];
                const eventPath = ivipbase_core_1.PathInfo.fillVariables(subscriptionPath, path);
                pathSubs.forEach((sub) => {
                    let dataPath = null;
                    if (sub.type === "value" || sub.type === "notify_value") {
                        dataPath = eventPath;
                    }
                    else if (["child_changed", "notify_child_changed"].includes(sub.type)) {
                        const childKey = path === eventPath || pathInfo.isAncestorOf(eventPath) ? "*" : ivipbase_core_1.PathInfo.getPathKeys(path.slice(eventPath.length).replace(/^\//, ""))[0];
                        dataPath = childKey !== "" ? ivipbase_core_1.PathInfo.getChildPath(eventPath, childKey) : null;
                    }
                    else if (["mutated", "mutations", "notify_mutated", "notify_mutations"].includes(sub.type)) {
                        dataPath = path;
                    }
                    else if (["child_added", "child_removed", "notify_child_added", "notify_child_removed"].includes(sub.type) &&
                        (pathInfo.isChildOf(eventPath) || path === eventPath || pathInfo.isAncestorOf(eventPath))) {
                        const childKey = path === eventPath || pathInfo.isAncestorOf(eventPath) ? "*" : ivipbase_core_1.PathInfo.getPathKeys(path.slice(eventPath.length).replace(/^\//, ""))[0];
                        dataPath = childKey !== "" ? ivipbase_core_1.PathInfo.getChildPath(eventPath, childKey) : null; //NodePath(subscriptionPath).childPath(childKey);
                    }
                    if (dataPath !== null && !subscribers.some((s) => s.type === sub.type && s.eventPath === eventPath && s.subscriptionPath === subscriptionPath)) {
                        // && subscribers.findIndex(s => s.type === sub.type && s.dataPath === dataPath) < 0
                        subscribers.push({ type: sub.type, eventPath, dataPath, subscriptionPath });
                    }
                });
            }
        });
        return subscribers;
    }
    /**
     * Aciona eventos de assinatura para serem executados em nós relevantes
     * @param event Tipo de evento: "value", "child_added", "child_changed", "child_removed"
     * @param path Caminho para o nó no qual a assinatura está presente
     * @param dataPath Caminho para o nó onde o valor está armazenado
     * @param oldValue Valor antigo
     * @param newValue Novo valor
     * @param context Contexto usado pelo cliente que atualizou esses dados
     */
    trigger(event, path, dataPath, oldValue, newValue, context) {
        //console.warn(`Event "${event}" triggered on node "/${path}" with data of "/${dataPath}": `, newValue);
        const pathSubscriptions = this._eventSubscriptions[path] || [];
        pathSubscriptions
            .filter((sub) => sub.type === event)
            .forEach((sub) => {
            sub.callback(null, dataPath, newValue, oldValue, context);
            // if (event.startsWith('notify_')) {
            //     // Notify only event, run callback without data
            //     sub.callback(null, dataPath);
            // }
            // else {
            //     // Run callback with data
            //     sub.callback(null, dataPath, newValue, oldValue);
            // }
        });
    }
    /**
     * Obtém o impacto de uma atualização no caminho especificado, considerando as assinaturas relevantes.
     * @param path Caminho para a atualização.
     * @param suppressEvents Indica se os eventos devem ser suprimidos.
     * @returns Um objeto contendo informações sobre o impacto da atualização, incluindo caminho de evento superior, assinaturas de evento, assinaturas de valor e indicador de assinaturas de valor existentes.
     */
    getUpdateImpact(path, suppressEvents = false) {
        let topEventPath = path;
        let hasValueSubscribers = false;
        // Obter todas as assinaturas que devem ser executadas nos dados (inclui eventos em nós filhos também)
        const eventSubscriptions = suppressEvents ? [] : this.getAllSubscribersForPath(path);
        // Obter todas as assinaturas para dados neste ou em nós ancestrais, determina quais dados carregar antes do processamento
        const valueSubscribers = suppressEvents ? [] : this.getValueSubscribersForPath(path);
        if (valueSubscribers.length > 0) {
            hasValueSubscribers = true;
            const eventPaths = valueSubscribers
                .map((sub) => {
                return { path: sub.dataPath, keys: ivipbase_core_1.PathInfo.getPathKeys(sub.dataPath) };
            })
                .sort((a, b) => {
                if (a.keys.length < b.keys.length) {
                    return -1;
                }
                else if (a.keys.length > b.keys.length) {
                    return 1;
                }
                return 0;
            });
            const first = eventPaths[0];
            topEventPath = first.path;
            if (valueSubscribers.filter((sub) => sub.dataPath === topEventPath).every((sub) => sub.type === "mutated" || sub.type.startsWith("notify_"))) {
                // Impede o carregamento de todos os dados no caminho, para que apenas as propriedades que mudam sejam carregadas
                hasValueSubscribers = false;
            }
            topEventPath = ivipbase_core_1.PathInfo.fillVariables(topEventPath, path); // Preenche quaisquer curingas no caminho da assinatura
        }
        return { topEventPath, eventSubscriptions, valueSubscribers, hasValueSubscribers };
    }
    /**
     * Executa um callback para cada assinante de valor associado a um caminho, considerando as mudanças nos valores antigo e novo.
     * @param sub Assinante de valor (snapshot) obtido de `this.getValueSubscribersForPath`.
     * @param oldValue Valor antigo.
     * @param newValue Novo valor.
     * @param variables Array de objetos contendo variáveis a serem substituídas no caminho.
     */
    callSubscriberWithValues(sub, currentPath, oldValue, newValue, variables = []) {
        let trigger = true;
        let type = sub.type;
        if (type.startsWith("notify_")) {
            type = type.slice("notify_".length);
        }
        if (type === "mutated") {
            return; // Ignore here, requires different logic
        }
        else if (type === "child_changed" && (oldValue === null || newValue === null)) {
            trigger = false;
        }
        else if (type === "value" || type === "child_changed") {
            const changes = ivipbase_core_1.Utils.compareValues(oldValue, newValue);
            trigger = changes !== "identical";
        }
        else if (type === "child_added") {
            trigger = oldValue === null && newValue !== null;
        }
        else if (type === "child_removed") {
            trigger = oldValue !== null && newValue === null;
        }
        if (!trigger) {
            return;
        }
        const pathKeys = ivipbase_core_1.PathInfo.getPathKeys(sub.dataPath);
        variables.forEach((variable) => {
            // only replaces first occurrence (so multiple *'s will be processed 1 by 1)
            const index = pathKeys.indexOf(variable.name);
            (0, utils_1.assert)(index >= 0, `Variable "${variable.name}" not found in subscription dataPath "${sub.dataPath}"`);
            pathKeys[index] = variable.value;
        });
        const dataPath = pathKeys.reduce((path, key) => (key !== "" ? ivipbase_core_1.PathInfo.getChildPath(path, key) : path), "");
        if (type === "value") {
            oldValue = (0, utils_1.pathValueToObject)(dataPath, currentPath, oldValue);
            newValue = (0, utils_1.pathValueToObject)(dataPath, currentPath, newValue);
        }
        this.trigger(sub.type, sub.subscriptionPath, dataPath, oldValue, newValue, {});
    }
    /**
     * Prepara eventos de mutação com base nas alterações entre um valor antigo e um novo em um determinado caminho.
     * @param currentPath Caminho atual onde as alterações ocorreram.
     * @param oldValue Valor antigo.
     * @param newValue Novo valor.
     * @param compareResult Resultado da comparação entre valores antigo e novo (opcional).
     * @returns Uma matriz de objetos representando as alterações preparadas para eventos de mutação.
     */
    prepareMutationEvents(currentPath, oldValue, newValue, compareResult) {
        const batch = [];
        const result = compareResult || ivipbase_core_1.Utils.compareValues(oldValue, newValue);
        if (result === "identical") {
            return batch; // sem alterações no caminho inscrito
        }
        else if (typeof result === "string") {
            // Estamos em um caminho com uma alteração real
            batch.push({ path: currentPath, oldValue, newValue });
        }
        // else if (oldValue instanceof Array || newValue instanceof Array) {
        //     // Trigger mutated event on the array itself instead of on individual indexes.
        //     // DO convert both arrays to objects because they are sparse
        //     const oldObj = {}, newObj = {};
        //     result.added.forEach(index => {
        //         oldObj[index] = null;
        //         newObj[index] = newValue[index];
        //     });
        //     result.removed.forEach(index => {
        //         oldObj[index] = oldValue[index];
        //         newObj[index] = null;
        //     });
        //     result.changed.forEach(index => {
        //         oldObj[index] = oldValue[index];
        //         newObj[index] = newValue[index];
        //     });
        //     batch.push({ path: currentPath, oldValue: oldObj, newValue: newObj });
        // }
        else {
            // Desabilitado: manipulação de arrays aqui, porque se um cliente estiver usando um banco de dados de cache, isso causará problemas,
            // pois as entradas individuais do array nunca devem ser modificadas.
            // if (oldValue instanceof Array && newValue instanceof Array) {
            //     // Make sure any removed events on arrays will be triggered from last to first
            //     result.removed.sort((a,b) => a < b ? 1 : -1);
            // }
            result.changed.forEach((info) => {
                const childPath = ivipbase_core_1.PathInfo.getChildPath(currentPath, info.key);
                const childValues = ivipbase_core_1.Utils.getChildValues(info.key, oldValue, newValue);
                const childBatch = this.prepareMutationEvents(childPath, childValues.oldValue, childValues.newValue, info.change);
                batch.push(...childBatch);
            });
            result.added.forEach((key) => {
                const childPath = ivipbase_core_1.PathInfo.getChildPath(currentPath, key);
                batch.push({ path: childPath, oldValue: null, newValue: newValue[key] });
            });
            if (oldValue instanceof Array && newValue instanceof Array) {
                result.removed.sort((a, b) => (a < b ? 1 : -1));
            }
            result.removed.forEach((key) => {
                const childPath = ivipbase_core_1.PathInfo.getChildPath(currentPath, key);
                batch.push({ path: childPath, oldValue: oldValue[key], newValue: null });
            });
        }
        return batch;
    }
    triggerAllEvents(path, oldValue, newValue, options = {
        suppress_events: false,
        context: undefined,
        impact: undefined,
    }) {
        const dataChanges = ivipbase_core_1.Utils.compareValues(oldValue, newValue);
        if (dataChanges === "identical") {
            return;
        }
        const updateImpact = options.impact ? options.impact : this.getUpdateImpact(path, options.suppress_events);
        const { topEventPath, eventSubscriptions, hasValueSubscribers, valueSubscribers } = updateImpact;
        // Notifica todas as assinaturas de eventos, deve ser executado com um atraso
        eventSubscriptions
            .filter((sub) => !["mutated", "mutations", "notify_mutated", "notify_mutations"].includes(sub.type))
            .map((sub) => {
            const keys = ivipbase_core_1.PathInfo.getPathKeys(sub.dataPath);
            return {
                sub,
                keys,
            };
        })
            .sort((a, b) => {
            // Os caminhos mais profundos devem ser acionados primeiro, depois subir na árvore
            if (a.keys.length < b.keys.length) {
                return 1;
            }
            else if (a.keys.length > b.keys.length) {
                return -1;
            }
            return 0;
        })
            .forEach(({ sub }) => {
            const process = (currentPath, oldValue, newValue, variables = []) => {
                const trailPath = sub.dataPath.slice(currentPath.length).replace(/^\//, "");
                const trailKeys = ivipbase_core_1.PathInfo.getPathKeys(trailPath);
                while (trailKeys.length > 0) {
                    const subKey = trailKeys.shift();
                    if (typeof subKey === "string" && (subKey === "*" || subKey[0] === "$")) {
                        // Disparar em todas as chaves de filhos relevantes
                        const allKeys = !oldValue ? [] : Object.keys(oldValue).map((key) => (oldValue instanceof Array ? parseInt(key) : key));
                        newValue !== null &&
                            Object.keys(newValue).forEach((key) => {
                                const keyOrIndex = newValue instanceof Array ? parseInt(key) : key;
                                !allKeys.includes(keyOrIndex) && allKeys.push(key);
                            });
                        allKeys.forEach((key) => {
                            const childValues = ivipbase_core_1.Utils.getChildValues(key, oldValue, newValue);
                            const vars = variables.concat({ name: subKey, value: key });
                            if (trailKeys.length === 0) {
                                this.callSubscriberWithValues(sub, path, childValues.oldValue, childValues.newValue, vars);
                            }
                            else {
                                process(ivipbase_core_1.PathInfo.getChildPath(currentPath, subKey), childValues.oldValue, childValues.newValue, vars);
                            }
                        });
                        return; // Podemos interromper o processamento
                    }
                    else if ((typeof subKey === "string" || typeof subKey === "number") && subKey !== "") {
                        currentPath = ivipbase_core_1.PathInfo.getChildPath(currentPath, subKey);
                        const childValues = ivipbase_core_1.Utils.getChildValues(subKey, oldValue, newValue);
                        oldValue = childValues.oldValue;
                        newValue = childValues.newValue;
                    }
                }
                this.callSubscriberWithValues(sub, path, oldValue, newValue, variables);
            };
            if (sub.type.startsWith("notify_") && ivipbase_core_1.PathInfo.get(sub.eventPath).isAncestorOf(topEventPath)) {
                // Notificar evento em um caminho superior ao qual carregamos dados
                // Podemos acionar o evento de notificação no caminho assinado
                // Por exemplo:
                // path === 'users/ewout', updates === { name: 'Ewout Stortenbeker' }
                // sub.path === 'users' ou '', sub.type === 'notify_child_changed'
                // => OK para acionar se dataChanges !== 'removed' e 'added'
                const isOnParentPath = ivipbase_core_1.PathInfo.get(sub.eventPath).isParentOf(topEventPath);
                const trigger = sub.type === "notify_value" ||
                    (sub.type === "notify_child_changed" && (!isOnParentPath || !["added", "removed"].includes(dataChanges))) ||
                    (sub.type === "notify_child_removed" && dataChanges === "removed" && isOnParentPath) ||
                    (sub.type === "notify_child_added" && dataChanges === "added" && isOnParentPath);
                trigger && this.trigger(sub.type, sub.subscriptionPath, sub.dataPath, null, null, options.context);
            }
            else {
                // A assinatura está no caminho atual ou mais profundo
                process(topEventPath, oldValue, newValue);
            }
        });
        // Os únicos eventos que não processamos agora são eventos 'mutated'.
        // Eles requerem lógica diferente: os chamaremos para todas as propriedades aninhadas do caminho atualizado, que
        // realmente mudaram. Eles não se propagam como 'child_changed' faz.
        const mutationEvents = eventSubscriptions.filter((sub) => ["mutated", "mutations", "notify_mutated", "notify_mutations"].includes(sub.type));
        mutationEvents.forEach((sub) => {
            // Obter os dados de destino nos quais esta assinatura está interessada
            let currentPath = topEventPath;
            // const trailPath = sub.eventPath.slice(currentPath.length).replace(/^\//, ''); // eventPath pode conter variáveis e * ?
            const trailKeys = ivipbase_core_1.PathInfo.getPathKeys(sub.eventPath).slice(ivipbase_core_1.PathInfo.getPathKeys(currentPath).length); //PathInfo.getPathKeys(trailPath);
            const events = [];
            const processNextTrailKey = (target, currentTarget, oldValue, newValue, vars) => {
                if (target.length === 0) {
                    // Add it
                    return events.push({ target: currentTarget, oldValue, newValue, vars });
                }
                const subKey = target[0];
                const keys = new Set();
                const isWildcardKey = typeof subKey === "string" && (subKey === "*" || subKey.startsWith("$"));
                if (isWildcardKey) {
                    // Recursivo para cada chave em oldValue e newValue
                    if (oldValue !== null && typeof oldValue === "object") {
                        Object.keys(oldValue).forEach((key) => keys.add(key));
                    }
                    if (newValue !== null && typeof newValue === "object") {
                        Object.keys(newValue).forEach((key) => keys.add(key));
                    }
                }
                else {
                    keys.add(subKey); // apenas uma chave específica
                }
                for (const key of keys) {
                    const childValues = ivipbase_core_1.Utils.getChildValues(key, oldValue, newValue);
                    oldValue = childValues.oldValue;
                    newValue = childValues.newValue;
                    processNextTrailKey(target.slice(1), currentTarget.concat(key), oldValue, newValue, isWildcardKey ? vars.concat({ name: subKey, value: key }) : vars);
                }
            };
            processNextTrailKey(trailKeys, [], oldValue, newValue, []);
            for (const event of events) {
                const targetPath = ivipbase_core_1.PathInfo.get(currentPath).child(event.target).path;
                const batch = this.prepareMutationEvents(targetPath, event.oldValue, event.newValue);
                if (batch.length === 0) {
                    continue;
                }
                const isNotifyEvent = sub.type.startsWith("notify_");
                if (["mutated", "notify_mutated"].includes(sub.type)) {
                    // Enviar todas as mutações uma por uma
                    batch.forEach((mutation, index) => {
                        const context = options.context; // const context = cloneObject(options.context);
                        // context.acebase_mutated_event = { nr: index + 1, total: batch.length }; // Adicionar informações de contexto sobre o número de mutações
                        const prevVal = isNotifyEvent ? null : mutation.oldValue;
                        const newVal = isNotifyEvent ? null : mutation.newValue;
                        this.trigger(sub.type, sub.subscriptionPath, mutation.path, prevVal, newVal, context);
                    });
                }
                else if (["mutations", "notify_mutations"].includes(sub.type)) {
                    // Enviar 1 lote com todas as mutações
                    // const oldValues = isNotifyEvent ? null : batch.map(m => ({ target: PathInfo.getPathKeys(mutation.path.slice(sub.subscriptionPath.length)), val: m.oldValue })); // batch.reduce((obj, mutation) => (obj[mutation.path.slice(sub.subscriptionPath.length).replace(/^\//, '') || '.'] = mutation.oldValue, obj), {});
                    // const newValues = isNotifyEvent ? null : batch.map(m => ({ target: PathInfo.getPathKeys(mutation.path.slice(sub.subscriptionPath.length)), val: m.newValue })) //batch.reduce((obj, mutation) => (obj[mutation.path.slice(sub.subscriptionPath.length).replace(/^\//, '') || '.'] = mutation.newValue, obj), {});
                    const subscriptionPathKeys = ivipbase_core_1.PathInfo.getPathKeys(sub.subscriptionPath);
                    const values = isNotifyEvent ? null : batch.map((m) => ({ target: ivipbase_core_1.PathInfo.getPathKeys(m.path).slice(subscriptionPathKeys.length), prev: m.oldValue, val: m.newValue }));
                    const dataPath = ivipbase_core_1.PathInfo.get(ivipbase_core_1.PathInfo.getPathKeys(targetPath).slice(0, subscriptionPathKeys.length)).path;
                    this.trigger(sub.type, sub.subscriptionPath, dataPath, null, values, options.context);
                }
            }
        });
    }
}
exports.Subscriptions = Subscriptions;

},{"../utils":34,"ivipbase-core":99}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaValidationError = exports.hasDatabase = exports.getDatabasesNames = exports.getDatabase = exports.DataBase = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const app_1 = require("../app");
const StorageDBServer_1 = require("./StorageDBServer");
const StorageDBClient_1 = require("./StorageDBClient");
const Subscriptions_1 = require("./Subscriptions");
const rules_1 = require("./services/rules");
const utils_1 = require("../utils");
class DataBase extends ivipbase_core_1.DataBase {
    constructor(database, app, options) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
        super(database, options);
        this.database = database;
        this.app = app;
        this.subscriptions = new Subscriptions_1.Subscriptions();
        this.name = database;
        this.description =
            (_c = ((_a = (Array.isArray(app.settings.database) ? app.settings.database : [app.settings.database]).find(({ name }) => {
                return name === database;
            })) !== null && _a !== void 0 ? _a : {
                name: database,
                description: (_b = app.settings.description) !== null && _b !== void 0 ? _b : "iVipBase database",
            }).description) !== null && _c !== void 0 ? _c : "iVipBase database";
        this.debug = new ivipbase_core_1.DebugLogger(app.settings.logLevel, `[${database}]`);
        const dbInfo = (Array.isArray(this.app.settings.database) ? this.app.settings.database : [this.app.settings.database]).find((d) => d.name === this.name);
        const defaultRules = (_e = (_d = this.app.settings) === null || _d === void 0 ? void 0 : _d.defaultRules) !== null && _e !== void 0 ? _e : { rules: {} };
        const mainRules = (_h = (_g = (_f = this.app.settings) === null || _f === void 0 ? void 0 : _f.server) === null || _g === void 0 ? void 0 : _g.defineRules) !== null && _h !== void 0 ? _h : { rules: {} };
        const dbRules = (_j = dbInfo === null || dbInfo === void 0 ? void 0 : dbInfo.defineRules) !== null && _j !== void 0 ? _j : { rules: {} };
        this._rules = new rules_1.PathBasedRules((_m = (_l = (_k = this.app.settings) === null || _k === void 0 ? void 0 : _k.server) === null || _l === void 0 ? void 0 : _l.auth.defaultAccessRule) !== null && _m !== void 0 ? _m : "allow", {
            debug: this.debug,
            db: this,
            authEnabled: (_s = (_p = (_o = dbInfo === null || dbInfo === void 0 ? void 0 : dbInfo.authentication) === null || _o === void 0 ? void 0 : _o.enabled) !== null && _p !== void 0 ? _p : (_r = (_q = this.app.settings) === null || _q === void 0 ? void 0 : _q.server) === null || _r === void 0 ? void 0 : _r.auth.enabled) !== null && _s !== void 0 ? _s : false,
            rules: (0, utils_1.joinObjects)({ rules: {} }, defaultRules.rules, mainRules.rules, dbRules.rules),
        });
        this.storage = !app.settings.isConnectionDefined || app.isServer || !app.settings.isValidClient ? new StorageDBServer_1.StorageDBServer(this) : new StorageDBClient_1.StorageDBClient(this);
        (_t = app.ipc) === null || _t === void 0 ? void 0 : _t.addDatabase(this);
        app.storage.on("add", (e) => {
            //console.log(e);
            this.subscriptions.triggerAllEvents(e.path, null, e.value);
        });
        app.storage.on("change", (e) => {
            //console.log(e);
            this.subscriptions.triggerAllEvents(e.path, e.previous, e.value);
        });
        app.storage.on("remove", (e) => {
            this.subscriptions.triggerAllEvents(e.path, e.value, null);
        });
        app.storage.ready(() => {
            this.emit("ready");
        });
    }
    get accessToken() {
        var _a, _b;
        return (_b = (_a = this.app.auth.get(this.name)) === null || _a === void 0 ? void 0 : _a.currentUser) === null || _b === void 0 ? void 0 : _b.accessToken;
    }
    get rules() {
        return this._rules;
    }
    connect(retry = true) {
        if (this.storage instanceof StorageDBClient_1.StorageDBClient) {
            return this.storage.connect(retry);
        }
        throw new Error("Method not implemented");
    }
    disconnect() {
        if (this.storage instanceof StorageDBClient_1.StorageDBClient) {
            return this.storage.disconnect();
        }
        throw new Error("Method not implemented");
    }
    async getInfo() {
        return await this.storage.getInfo();
    }
    async getPerformance() {
        const { data } = await this.storage.getInfo();
        return data !== null && data !== void 0 ? data : [];
    }
    applyRules(rules) {
        return this._rules.applyRules(rules);
    }
    setRule(rulePaths, ruleTypes, callback) {
        return this._rules.add(rulePaths, ruleTypes, callback);
    }
}
exports.DataBase = DataBase;
function getDatabase(...args) {
    let app = args.find((a) => a instanceof app_1.IvipBaseApp), dbName;
    const appNames = (0, app_1.getAppsName)();
    if (!app) {
        const name = appNames.find((n) => args.includes(n));
        app = name ? (0, app_1.getApp)(name) : (0, app_1.getFirstApp)();
    }
    let database = args.find((d) => typeof d === "string" && appNames.includes(d) !== true);
    if (typeof database !== "string") {
        database = app.settings.dbname;
    }
    dbName = (Array.isArray(database) ? database : [database])[0];
    if (app.databases.has(dbName)) {
        return app.databases.get(dbName);
    }
    const db = new DataBase(dbName, app, args.find((s) => typeof s === "object" && !(s instanceof app_1.IvipBaseApp)));
    app.databases.set(dbName, db);
    return db;
}
exports.getDatabase = getDatabase;
function getDatabasesNames() {
    return Array.prototype.concat
        .apply([], (0, app_1.getAppsName)().map((name) => {
        const names = (0, app_1.getApp)(name).settings.dbname;
        return Array.isArray(names) ? names : [names];
    }))
        .filter((v, i, a) => a.indexOf(v) === i);
}
exports.getDatabasesNames = getDatabasesNames;
function hasDatabase(database) {
    return getDatabasesNames().includes(database);
}
exports.hasDatabase = hasDatabase;
class SchemaValidationError extends Error {
    constructor(reason) {
        super(`Schema validation failed: ${reason}`);
        this.reason = reason;
    }
}
exports.SchemaValidationError = SchemaValidationError;

},{"../app":1,"../utils":34,"./StorageDBClient":21,"./StorageDBServer":22,"./Subscriptions":23,"./services/rules":25,"ivipbase-core":99}],25:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathBasedRules = exports.AccessRuleValidationError = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const browser_1 = require("../../server/browser");
const sandbox_1 = require("./sandbox");
const utils_1 = require("../../utils");
class AccessRuleValidationError extends Error {
    constructor(result) {
        super(result.message);
        this.result = result;
    }
}
exports.AccessRuleValidationError = AccessRuleValidationError;
class PathBasedRules extends ivipbase_core_1.SimpleEventEmitter {
    stop() {
        throw new Error("not started yet");
    }
    constructor(defaultAccess, env) {
        var _a;
        super();
        this.env = env;
        this.codeRules = [];
        this.db = env.db;
        this.debug = env.debug;
        const defaultAccessRule = ((def) => {
            switch (def) {
                case browser_1.AUTH_ACCESS_DEFAULT.ALLOW_AUTHENTICATED: {
                    return "auth !== null";
                }
                case browser_1.AUTH_ACCESS_DEFAULT.ALLOW_ALL: {
                    return true;
                }
                case browser_1.AUTH_ACCESS_DEFAULT.DENY_ALL: {
                    return false;
                }
                default: {
                    env.debug.error(`Unknown defaultAccessRule "${def}"`);
                    return false;
                }
            }
        })(defaultAccess);
        const defaultRules = {
            rules: {
                ".read": defaultAccessRule,
                ".write": defaultAccessRule,
            },
        };
        this.jsonRules = defaultRules;
        this.accessRules = defaultRules;
        this.applyRules((_a = env.rules) !== null && _a !== void 0 ? _a : defaultRules, true);
        this.authEnabled = env.authEnabled;
    }
    on(event, callback) {
        return super.on(event, callback);
    }
    emit(event, data) {
        super.emit(event, data);
        return this;
    }
    applyRules(rules, isInitial = false) {
        const accessRules = (0, utils_1.joinObjects)(this.jsonRules, rules);
        this.jsonRules = (0, utils_1.joinObjects)(this.jsonRules, rules);
        // Converta regras de string em funções que podem ser executadas
        const processRules = (path, parent, variables) => {
            Object.keys(parent).forEach((key) => {
                const rule = parent[key];
                if ([".read", ".write", ".validate"].includes(key) && typeof rule === "string") {
                    let ruleCode = rule.includes("return ") ? rule : `return ${rule}`;
                    // Adicione `await`s às expressões de chamada `value` e `exists`
                    ruleCode = ruleCode.replace(/(value|exists)\(/g, (m, fn) => `await ${fn}(`);
                    // Converter para função
                    // rule = eval(
                    //     `(async (env) => {` +
                    //     `  const { now, path, ${variables.join(', ')}, operation, data, auth, value, exists } = env;` +
                    //     `  ${ruleCode};` +
                    //     `})`);
                    // rule.getText = () => {
                    //     return ruleCode;
                    // };
                    ruleCode = `(async () => {\n${ruleCode}\n})();`;
                    return (parent[key] = ruleCode);
                }
                else if (key === ".schema") {
                    // Adicionar esquema
                    return this.env.db.schema.set(path, rule).catch((err) => {
                        this.env.debug.error(`Error parsing ${path}/.schema: ${err.message}`);
                    });
                }
                else if (key.startsWith("$")) {
                    variables.push(key);
                }
                if (typeof rule === "object") {
                    processRules(`${path}/${key}`, rule, variables.slice());
                }
            });
        };
        processRules("", accessRules.rules, []);
        this.accessRules = accessRules;
        if (!isInitial) {
            this.emit("changed", this.jsonRules);
        }
    }
    async isOperationAllowed(user, path, operation, data) {
        // Process rules, find out if signed in user is allowed to read/write
        // Defaults to false unless a rule is found that tells us otherwise
        let typeOperation = "";
        if (["get", "exists", "query", "reflect", "export", "transact"].includes(operation)) {
            typeOperation += "r";
        }
        if (["update", "set", "delete", "import", "transact"].includes(operation)) {
            typeOperation += "w";
        }
        const isPreFlight = typeof data === "undefined";
        const allow = { allow: true };
        if (!this.authEnabled) {
            // Authentication is disabled, anyone can do anything. Not really a smart thing to do!
            return allow;
        }
        else if ((user === null || user === void 0 ? void 0 : user.uid) === "admin" || (user === null || user === void 0 ? void 0 : user.permission_level) >= 2) {
            // Always allow admin access
            // TODO: implement user.is_admin, so the default admin account can be disabled
            return allow;
        }
        else if (path.startsWith("__") && !((user === null || user === void 0 ? void 0 : user.permission_level) >= 1 && typeOperation === "r")) {
            // NEW: with the auth database now integrated into the main database,
            // deny access to private resources starting with '__' for non-admins
            return { allow: false, code: "private", message: `Access to private resource "${path}" not allowed` };
        }
        const getFullPath = (path, relativePath) => {
            if (relativePath.startsWith("/")) {
                // Absolute path
                return relativePath;
            }
            else if (!relativePath.startsWith(".")) {
                throw new Error("Path must be either absolute (/) or relative (./ or ../)");
            }
            let targetPathInfo = ivipbase_core_1.PathInfo.get(path);
            const trailKeys = ivipbase_core_1.PathInfo.getPathKeys(relativePath);
            trailKeys.forEach((key) => {
                if (key === ".") {
                    /* no op */
                }
                else if (key === "..") {
                    targetPathInfo = targetPathInfo.parent;
                }
                else {
                    targetPathInfo = targetPathInfo.child(key);
                }
            });
            return targetPathInfo.path;
        };
        const env = {
            now: Date.now(),
            auth: user || null,
            operation,
            vars: {},
            context: typeof (data === null || data === void 0 ? void 0 : data.context) === "object" && data.context !== null ? Object.assign({}, data.context) : {},
        };
        const pathInfo = ivipbase_core_1.PathInfo.get(path);
        const pathKeys = pathInfo.keys.slice();
        let rule = this.accessRules.rules;
        const rulePathKeys = [];
        let currentPath = "";
        let isAllowed = false;
        while (rule) {
            // Check read/write access or validate operation
            const checkRules = [];
            const applyRule = (rule) => {
                if (rule && !checkRules.includes(rule)) {
                    checkRules.push(rule);
                }
            };
            if (["get", "exists", "query", "reflect", "export", "transact"].includes(operation)) {
                // Operations that require 'read' access
                applyRule(rule[".read"]);
            }
            if (".write" in rule && ["update", "set", "delete", "import", "transact"].includes(operation)) {
                // Operations that require 'write' access
                applyRule(rule[".write"]);
            }
            if (`.${operation}` in rule && !isPreFlight) {
                // If there is a dedicated rule (eg ".update" or ".reflect") for this operation, use it.
                applyRule(rule[`.${operation}`]);
            }
            const rulePath = ivipbase_core_1.PathInfo.get(rulePathKeys).path;
            for (const rule of checkRules) {
                if (typeof rule === "boolean") {
                    if (!rule) {
                        return { allow: false, code: "rule", message: `${operation} operation denied to path "${path}" by set rule`, rule, rulePath };
                    }
                    isAllowed = true; // return allow;
                }
                if (typeof rule === "string" || typeof rule === "function") {
                    try {
                        // Execute rule function
                        const ruleEnv = Object.assign(Object.assign({}, env), { exists: async (target) => this.db.ref(getFullPath(currentPath, target)).exists(), value: async (target, include) => {
                                const snap = await this.db.ref(getFullPath(currentPath, target)).get({ include });
                                return snap.val();
                            } });
                        const result = typeof rule === "function" ? await rule(ruleEnv) : await (0, sandbox_1.executeSandboxed)(rule, ruleEnv);
                        if (!["cascade", "deny", "allow", true, false].includes(result)) {
                            this.debug.warn(`rule for path ${rulePath} possibly returns an unintentional value (${JSON.stringify(result)}) which results in outcome "${result ? "allow" : "deny"}"`);
                        }
                        isAllowed = result === "allow" || result === true;
                        if (!isAllowed && result !== "cascade") {
                            return { allow: false, code: "rule", message: `${operation} operation denied to path "${path}" by set rule`, rule, rulePath };
                        }
                    }
                    catch (err) {
                        // If rule execution throws an exception, don't allow. Can happen when rule is "auth.uid === '...'", and auth is null because the user is not signed in
                        return { allow: false, code: "exception", message: `${operation} operation denied to path "${path}" by set rule`, rule, rulePath, details: err };
                    }
                }
            }
            if (isAllowed) {
                break;
            }
            // Proceed with next key in trail
            if (pathKeys.length === 0) {
                break;
            }
            let nextKey = pathKeys.shift();
            currentPath = ivipbase_core_1.PathInfo.get(currentPath).childPath(nextKey);
            // if nextKey is '*' or '$something', rule[nextKey] will be undefined (or match a variable) so there is no
            // need to change things here for usage of wildcard paths in subscriptions
            if (typeof rule[nextKey] === "undefined") {
                // Check if current rule has a wildcard child
                const wildcardKey = Object.keys(rule).find((key) => key === "*" || key[0] === "$");
                if (wildcardKey) {
                    env[wildcardKey] = nextKey;
                    env.vars[wildcardKey] = nextKey;
                }
                nextKey = wildcardKey;
            }
            nextKey && rulePathKeys.push(nextKey);
            rule = rule[nextKey];
        }
        // Now dig deeper to check nested .validate rules
        if (isAllowed && ["set", "update"].includes(operation) && !isPreFlight) {
            // validate rules start at current path being written to
            const startRule = pathInfo.keys.reduce((rule, key) => {
                if (typeof rule !== "object" || rule === null) {
                    return null;
                }
                if (key in rule) {
                    return rule[key];
                }
                if ("*" in rule) {
                    return rule["*"];
                }
                const variableKey = Object.keys(rule).find((key) => typeof key === "string" && key.startsWith("$"));
                if (variableKey) {
                    return rule[variableKey];
                }
                return null;
            }, this.accessRules.rules);
            const getNestedRules = (target, rule) => {
                if (!rule) {
                    return [];
                }
                const nested = Object.keys(rule).reduce((arr, key) => {
                    if (key === ".validate" && ["string", "function"].includes(typeof rule[key])) {
                        arr.push({ target, validate: rule[key] });
                    }
                    if (!key.startsWith(".")) {
                        const nested = getNestedRules([...target, key], rule[key]);
                        arr.push(...nested);
                    }
                    return arr;
                }, []);
                return nested;
            };
            // Check all that apply for sent data (update requires a different strategy)
            const checkRules = getNestedRules([], startRule);
            for (const check of checkRules) {
                // Keep going as long as rules validate
                const targetData = check.target.reduce((data, key) => {
                    if (data !== null && typeof data === "object" && key in data) {
                        return data[key];
                    }
                    return null;
                }, data.value);
                if (typeof targetData === "undefined" && operation === "update" && check.target.length >= 1 && check.target[0] in data) {
                    // Ignore, data for direct child path is not being set by update operation
                    continue;
                }
                const validateData = typeof targetData === "undefined" ? null : targetData;
                if (validateData === null) {
                    // Do not validate deletes, this should be done by ".write" or ".delete" rule
                    continue;
                }
                const validatePath = ivipbase_core_1.PathInfo.get(path).child(check.target).path;
                const validateEnv = Object.assign(Object.assign({}, env), { operation: operation === "update" ? (check.target.length === 0 ? "update" : "set") : operation, data: validateData, exists: async (target) => this.db.ref(getFullPath(validatePath, target)).exists(), value: async (target, include) => {
                        const snap = await this.db.ref(getFullPath(validatePath, target)).get({ include });
                        return snap.val();
                    } });
                try {
                    const result = await (async () => {
                        let result;
                        if (typeof check.validate === "function") {
                            result = await check.validate(validateEnv);
                        }
                        else if (typeof check.validate === "string") {
                            result = await (0, sandbox_1.executeSandboxed)(check.validate, validateEnv);
                        }
                        else if (typeof check.validate === "boolean") {
                            result = check.validate ? "allow" : "deny";
                        }
                        if (result === "cascade") {
                            this.debug.warn(`Rule at path ${validatePath} returned "cascade", but ${validateEnv.operation} rules always cascade`);
                        }
                        else if (!["cascade", "deny", "allow", true, false].includes(result !== null && result !== void 0 ? result : "")) {
                            this.debug.warn(`${validateEnv.operation} rule for path ${validatePath} possibly returned an unintentional value (${JSON.stringify(result)}) which results in outcome "${result ? "allow" : "deny"}"`);
                        }
                        if (["cascade", "deny", "allow"].includes(result)) {
                            return result;
                        }
                        return result ? "allow" : "deny";
                    })();
                    if (result === "deny") {
                        return { allow: false, code: "rule", message: `${operation} operation denied to path "${path}" by set rule`, rule: check.validate, rulePath: validatePath };
                    }
                }
                catch (err) {
                    // If rule execution throws an exception, don't allow. Can happen when rule is "auth.uid === '...'", and auth is null because the user is not signed in
                    return {
                        allow: false,
                        code: "exception",
                        message: `${operation} operation denied to path "${path}" by set rule`,
                        rule: check.validate,
                        rulePath: validatePath,
                        details: err,
                    };
                }
            }
        }
        return isAllowed ? allow : { allow: false, code: "no_rule", message: `No rules set for requested path "${path}", defaulting to false` };
    }
    add(rulePaths, ruleTypes, callback) {
        const paths = Array.isArray(rulePaths) ? rulePaths : [rulePaths];
        const types = Array.isArray(ruleTypes) ? ruleTypes : [ruleTypes];
        for (const path of paths) {
            const keys = ivipbase_core_1.PathInfo.getPathKeys(path);
            let target = this.accessRules.rules;
            for (const key of keys) {
                if (!(key in target)) {
                    target[key] = {};
                }
                target = target[key];
                if (typeof target !== "object" || target === null) {
                    throw new Error(`Cannot add rule because value of key "${key}" is not an object`);
                }
            }
            for (const type of types) {
                target[`.${type}`] = callback;
                this.codeRules.push({ path, type, callback });
            }
        }
    }
}
exports.PathBasedRules = PathBasedRules;

},{"../../server/browser":31,"../../utils":34,"./sandbox":26,"ivipbase-core":99}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCodeSafe = exports.executeSandboxed = void 0;
const vm_1 = require("vm");
async function executeSandboxed(code, env) {
    // Usar eval para executar código é perigoso, então temos que ter certeza de que rodaremos em uma sandbox
    // para que nenhum objeto disponível globalmente seja acessível.
    const context = (0, vm_1.createContext)(env);
    const result = await (0, vm_1.runInContext)(code, context, { filename: "sandbox", timeout: 10000, displayErrors: true, breakOnSigint: true });
    return result;
}
exports.executeSandboxed = executeSandboxed;
function isCodeSafe(code) {
    return /eval|prototype|require|import/.test(code); // Não permitir acesso ao protótipo, exigir ou importar instruções
}
exports.isCodeSafe = isCodeSafe;

},{"vm":112}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPCPeer = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const ipc_1 = require("../ipc");
/**
 * Browser tabs IPC. Database changes and events will be synchronized automatically.
 * Locking of resources will be done by the election of a single locking master:
 * the one with the lowest id.
 */
class IPCPeer extends ipc_1.IvipBaseIPCPeer {
    constructor(name) {
        super("browser", name);
        this.name = name;
        this.masterPeerId = this.id; // We don't know who the master is yet...
        this.ipcType = "browser.bcc";
        // Setup process exit handler
        // Monitor onbeforeunload event to say goodbye when the window is closed
        addEventListener("beforeunload", () => {
            this.exit();
        });
        // Create BroadcastChannel to allow multi-tab communication
        // This allows other tabs to make changes to the database, notifying us of those changes.
        if (typeof BroadcastChannel !== "undefined") {
            this.channel = new BroadcastChannel(`ivipbase:${name}`);
        }
        else if (typeof localStorage !== "undefined") {
            // Use localStorage as polyfill for Safari & iOS WebKit
            const listeners = []; // first callback reserved for onmessage handler
            const notImplemented = () => {
                throw new Error("Not implemented");
            };
            this.channel = {
                name: `ivipbase:${name}`,
                postMessage: (message) => {
                    const messageId = ivipbase_core_1.ID.generate(), key = `ivipbase:${name}:${this.id}:${messageId}`, payload = JSON.stringify(ivipbase_core_1.Transport.serialize(message));
                    // Store message, triggers 'storage' event in other tabs
                    localStorage.setItem(key, payload);
                    // Remove after 10ms
                    setTimeout(() => localStorage.removeItem(key), 10);
                },
                set onmessage(handler) {
                    listeners[0] = handler;
                },
                set onmessageerror(handler) {
                    notImplemented();
                },
                close() {
                    notImplemented();
                },
                addEventListener(event, callback) {
                    if (event !== "message") {
                        notImplemented();
                    }
                    listeners.push(callback);
                },
                removeEventListener(event, callback) {
                    const i = listeners.indexOf(callback);
                    i >= 1 && listeners.splice(i, 1);
                },
                dispatchEvent(event) {
                    listeners.forEach((callback) => {
                        try {
                            callback && callback(event);
                        }
                        catch (err) {
                            console.error(err);
                        }
                    });
                    return true;
                },
            };
            // Listen for storage events to intercept possible messages
            addEventListener("storage", (event) => {
                var _a;
                if (!event || !event.key) {
                    return;
                }
                const [ivipbase, name, peerId, messageId] = event.key.split(":");
                if (ivipbase !== "ivipbase" || name !== this.name || peerId === this.id || event.newValue === null) {
                    return;
                }
                const message = ivipbase_core_1.Transport.deserialize(JSON.parse(event.newValue));
                (_a = this.channel) === null || _a === void 0 ? void 0 : _a.dispatchEvent({ data: message });
            });
        }
        else {
            // No localStorage either, this is probably an old browser running in a webworker
            this.debug.warn(`[BroadcastChannel] not supported`);
            this.sendMessage = () => {
                /* No OP */
            };
            return;
        }
        // Monitor incoming messages
        this.channel.addEventListener("message", async (event) => {
            const message = event.data;
            if (message.to && message.to !== this.id) {
                // Message is for somebody else. Ignore
                return;
            }
            this.debug.verbose(`[BroadcastChannel] received: `, message);
            if (message.type === "hello" && message.from < this.masterPeerId) {
                // This peer was created before other peer we thought was the master
                this.masterPeerId = message.from;
                this.debug.log(`[BroadcastChannel] Tab ${this.masterPeerId} is the master.`);
            }
            else if (message.type === "bye" && message.from === this.masterPeerId) {
                // The master tab is leaving
                this.debug.log(`[BroadcastChannel] Master tab ${this.masterPeerId} is leaving`);
                // Elect new master
                const allPeerIds = this.peers
                    .map((peer) => peer.id)
                    .concat(this.id)
                    .filter((id) => id !== this.masterPeerId); // All peers, including us, excluding the leaving master peer
                this.masterPeerId = allPeerIds.sort()[0];
            }
            return this.handleMessage(message);
        });
        // // Schedule periodic "pulse" to let others know we're still around
        // setInterval(() => {
        //     sendMessage(<IPulseMessage>{ from: tabId, type: 'pulse' });
        // }, 30000);
    }
    sendMessage(dbname, message) {
        var _a;
        message.dbname = dbname;
        this.debug.verbose(`[BroadcastChannel] sending: `, message);
        (_a = this.channel) === null || _a === void 0 ? void 0 : _a.postMessage(message);
    }
}
exports.IPCPeer = IPCPeer;

},{"../ipc":30,"ivipbase-core":99}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIPCPeer = exports.IPCPeer = void 0;
const IPCPeer_1 = require("./IPCPeer");
Object.defineProperty(exports, "IPCPeer", { enumerable: true, get: function () { return IPCPeer_1.IPCPeer; } });
const internal_1 = require("./internal");
function getIPCPeer(name = internal_1.DEFAULT_ENTRY_NAME) {
    if (internal_1._ipcs.has(name)) {
        return internal_1._ipcs.get(name);
    }
    const ipc = new IPCPeer_1.IPCPeer(name);
    internal_1._ipcs.set(name, ipc);
    return ipc;
}
exports.getIPCPeer = getIPCPeer;

},{"./IPCPeer":27,"./internal":29}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._ipcs = exports.DEFAULT_ENTRY_NAME = void 0;
var internal_1 = require("../app/internal");
Object.defineProperty(exports, "DEFAULT_ENTRY_NAME", { enumerable: true, get: function () { return internal_1.DEFAULT_ENTRY_NAME; } });
/**
 * @internal
 */
exports._ipcs = new Map();

},{"../app/internal":2}],30:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IvipBaseIPCPeer = exports.AIvipBaseIPCPeerExitingError = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const masterPeerId = "[master]";
class AIvipBaseIPCPeerExitingError extends Error {
    constructor(message) {
        super(`Exiting: ${message}`);
    }
}
exports.AIvipBaseIPCPeerExitingError = AIvipBaseIPCPeerExitingError;
class IvipBaseIPCPeer extends ivipbase_core_1.SimpleEventEmitter {
    get isMaster() {
        return this.masterPeerId === this.id;
    }
    constructor(id, name) {
        super();
        this.id = id;
        this.name = name;
        this.masterPeerId = masterPeerId;
        this.ipcType = "ipc";
        this.ipcDatabases = new Map();
        this.ourSubscriptions = {};
        this.remoteSubscriptions = {};
        this.peers = [];
        this._exiting = false;
        this._eventsEnabled = true;
        this._requests = new Map();
        this.debug = new ivipbase_core_1.DebugLogger("verbose", `[${name}]`);
    }
    addDatabase(db) {
        if (this.ipcDatabases.has(db.name)) {
            return;
        }
        const dbname = db.name;
        this.ipcDatabases.set(dbname, db);
        // Setup db event listeners
        db.subscriptions.on("subscribe", (subscription) => {
            // Subscription was added to db
            var _a, _b, _c;
            db.debug.verbose(`database subscription being added on peer ${this.id}`);
            const remoteSubscription = (_a = this.remoteSubscriptions[dbname]) === null || _a === void 0 ? void 0 : _a.find((sub) => sub.callback === subscription.callback);
            if (remoteSubscription) {
                // Send ack
                // return sendMessage({ type: 'subscribe_ack', from: tabId, to: remoteSubscription.for, data: { path: subscription.path, event: subscription.event } });
                return;
            }
            const othersAlreadyNotifying = (_b = this.ourSubscriptions[dbname]) === null || _b === void 0 ? void 0 : _b.some((sub) => sub.event === subscription.event && sub.path === subscription.path);
            // Add subscription
            (_c = this.ourSubscriptions[dbname]) === null || _c === void 0 ? void 0 : _c.push(subscription);
            if (othersAlreadyNotifying) {
                // Same subscription as other previously added. Others already know we want to be notified
                return;
            }
            // Request other tabs to keep us updated of this event
            const message = { type: "subscribe", from: this.id, data: { path: subscription.path, event: subscription.event }, dbname };
            this.sendMessage(dbname, message);
        });
        db.subscriptions.on("unsubscribe", (subscription) => {
            // Subscription was removed from db
            var _a, _b, _c, _d;
            const remoteSubscription = (_a = this.remoteSubscriptions[dbname]) === null || _a === void 0 ? void 0 : _a.find((sub) => sub.callback === subscription.callback);
            if (remoteSubscription) {
                // Remove
                (_b = this.remoteSubscriptions[dbname]) === null || _b === void 0 ? void 0 : _b.splice((_c = this.remoteSubscriptions[dbname]) === null || _c === void 0 ? void 0 : _c.indexOf(remoteSubscription), 1);
                // Send ack
                // return sendMessage({ type: 'unsubscribe_ack', from: tabId, to: remoteSubscription.for, data: { path: subscription.path, event: subscription.event } });
                return;
            }
            (_d = this.ourSubscriptions[dbname]) === null || _d === void 0 ? void 0 : _d.filter((sub) => sub.path === subscription.path && (!subscription.event || sub.event === subscription.event) && (!subscription.callback || sub.callback === subscription.callback)).forEach((sub) => {
                var _a, _b;
                // Remove from our subscriptions
                (_a = this.ourSubscriptions[dbname]) === null || _a === void 0 ? void 0 : _a.splice((_b = this.ourSubscriptions[dbname]) === null || _b === void 0 ? void 0 : _b.indexOf(sub), 1);
                // Request other tabs to stop notifying
                const message = { type: "unsubscribe", from: this.id, data: { path: sub.path, event: sub.event }, dbname };
                this.sendMessage(dbname, message);
            });
        });
        // Send hello to other peers
        const helloMsg = { type: "hello", from: this.id, data: undefined, dbname };
        this.sendMessage(dbname, helloMsg);
    }
    /**
     * Requests the peer to shut down. Resolves once its locks are cleared and 'exit' event has been emitted.
     * Has to be overridden by the IPC implementation to perform custom shutdown tasks
     * @param code optional exit code (eg one provided by SIGINT event)
     */
    async exit(code = 0) {
        if (this._exiting) {
            // Already exiting...
            return this.once("exit");
        }
        this._exiting = true;
        this.debug.warn(`Received ${this.isMaster ? "master" : "worker " + this.id} process exit request`);
        // Send "bye"
        const dbnames = Array.from(this.ipcDatabases.keys());
        for (const dbname of dbnames) {
            this.sayGoodbye(dbname, this.id);
        }
        this.debug.warn(`${this.isMaster ? "Master" : "Worker " + this.id} will now exit`);
        this.emitOnce("exit", code);
    }
    sayGoodbye(dbname, forPeerId) {
        // Send "bye" message on their behalf
        const bye = { type: "bye", from: forPeerId, data: undefined, dbname };
        this.sendMessage(dbname, bye);
    }
    addPeer(dbname, id, sendReply = true) {
        var _a;
        if (this._exiting) {
            return;
        }
        const peer = this.peers.find((w) => w.id === id);
        if (!peer) {
            this.peers.push({ id, lastSeen: Date.now() });
        }
        if (sendReply) {
            // Send hello back to sender
            const helloMessage = { type: "hello", from: this.id, to: id, data: undefined, dbname };
            this.sendMessage(dbname, helloMessage);
            // Send our active subscriptions through
            (_a = this.ourSubscriptions[dbname]) === null || _a === void 0 ? void 0 : _a.forEach((sub) => {
                // Request to keep us updated
                const message = { type: "subscribe", from: this.id, to: id, data: { path: sub.path, event: sub.event }, dbname };
                this.sendMessage(dbname, message);
            });
        }
    }
    removePeer(id, ignoreUnknown = false) {
        var _a;
        if (this._exiting) {
            return;
        }
        const peer = this.peers.find((peer) => peer.id === id);
        if (!peer) {
            if (!ignoreUnknown) {
                throw new Error(`We are supposed to know this peer!`);
            }
            return;
        }
        this.peers.splice(this.peers.indexOf(peer), 1);
        for (const [dbname, db] of this.ipcDatabases) {
            // Remove their subscriptions
            const subscriptions = (_a = this.remoteSubscriptions[dbname]) === null || _a === void 0 ? void 0 : _a.filter((sub) => sub.for === id);
            subscriptions.forEach((sub) => {
                if (Array.isArray(this.remoteSubscriptions[dbname])) {
                    this.remoteSubscriptions[dbname].splice(this.remoteSubscriptions[dbname].indexOf(sub), 1);
                }
                db === null || db === void 0 ? void 0 : db.subscriptions.remove(sub.path, sub.event, sub.callback);
            });
        }
    }
    addRemoteSubscription(dbname, peerId, details) {
        if (this._exiting) {
            return;
        }
        // this.debug.log(`remote subscription being added -> ${dbname}::${peerId}::${this.id}`);
        if (Array.isArray(this.remoteSubscriptions[dbname]) && this.remoteSubscriptions[dbname].some((sub) => sub.for === peerId && sub.event === details.event && sub.path === details.path)) {
            // We're already serving this event for the other peer. Ignore
            return;
        }
        // Add remote subscription
        const subscribeCallback = (err, path, val, previous, context) => {
            // db triggered an event, send notification to remote subscriber
            const eventMessage = {
                type: "event",
                from: this.id,
                to: peerId,
                path: details.path,
                event: details.event,
                data: {
                    path,
                    val,
                    previous,
                    context,
                },
                dbname,
            };
            this.sendMessage(dbname, eventMessage);
        };
        if (!Array.isArray(this.remoteSubscriptions[dbname])) {
            this.remoteSubscriptions[dbname] = [];
        }
        this.remoteSubscriptions[dbname].push({ for: peerId, event: details.event, path: details.path, callback: subscribeCallback });
        const db = this.ipcDatabases.get(dbname);
        db === null || db === void 0 ? void 0 : db.subscriptions.add(details.path, details.event, subscribeCallback);
    }
    cancelRemoteSubscription(dbname, peerId, details) {
        var _a;
        // Other tab requests to remove previously subscribed event
        const sub = (_a = this.remoteSubscriptions[dbname]) === null || _a === void 0 ? void 0 : _a.find((sub) => sub.for === peerId && sub.event === details.event && sub.path === details.event);
        if (!sub) {
            // We don't know this subscription so we weren't notifying in the first place. Ignore
            return;
        }
        // Stop subscription
        const db = this.ipcDatabases.get(dbname);
        db === null || db === void 0 ? void 0 : db.subscriptions.remove(details.path, details.event, sub.callback);
    }
    async handleMessage(message) {
        var _a;
        const dbname = message.dbname;
        switch (message.type) {
            case "hello":
                return this.addPeer(dbname, message.from, message.to !== this.id);
            case "bye":
                return this.removePeer(message.from, true);
            case "subscribe":
                return this.addRemoteSubscription(dbname, message.from, message.data);
            case "unsubscribe":
                return this.cancelRemoteSubscription(dbname, message.from, message.data);
            case "event": {
                if (!this._eventsEnabled) {
                    // IPC event handling is disabled for this client. Ignore message.
                    break;
                }
                const eventMessage = message;
                const context = eventMessage.data.context || {};
                context.database_ipc = { type: this.ipcType, origin: eventMessage.from }; // Add IPC details
                // Other peer raised an event we are monitoring
                const subscriptions = (_a = this.ourSubscriptions[dbname]) === null || _a === void 0 ? void 0 : _a.filter((sub) => sub.event === eventMessage.event && sub.path === eventMessage.path);
                subscriptions.forEach((sub) => {
                    sub.callback(null, eventMessage.data.path, eventMessage.data.val, eventMessage.data.previous, context);
                });
                break;
            }
            case "notification": {
                // Custom notification received - raise event
                return this.emit("notification", message);
            }
            case "request": {
                // Custom message received - raise event
                return this.emit("request", message);
            }
            case "result": {
                // Result of custom request received - raise event
                const result = message;
                const request = this._requests.get(result.id);
                if (typeof request !== "object") {
                    throw new Error(`Result of unknown request received`);
                }
                if (result.ok) {
                    request.resolve(result.data);
                }
                else {
                    request.reject(new Error(result.reason));
                }
            }
        }
    }
    async request(req) {
        // Send request, return result promise
        let resolve, reject;
        const promise = new Promise((rs, rj) => {
            resolve = (result) => {
                this._requests.delete(req.id);
                rs(result);
            };
            reject = (err) => {
                this._requests.delete(req.id);
                rj(err);
            };
        });
        this._requests.set(req.id, { resolve, reject, request: req });
        this.sendMessage(req.dbname, req);
        return promise;
    }
    /**
     * Sends a custom request to the IPC master
     * @param request
     * @returns
     */
    sendRequest(dbname, request) {
        const req = { type: "request", from: this.id, to: this.masterPeerId, id: ivipbase_core_1.ID.generate(), data: request, dbname };
        return this.request(req).catch((err) => {
            this.debug.error(err);
            throw err;
        });
    }
    replyRequest(dbname, requestMessage, result) {
        const reply = { type: "result", id: requestMessage.id, ok: true, from: this.id, to: requestMessage.from, data: result, dbname };
        this.sendMessage(dbname, reply);
    }
    /**
     * Sends a custom notification to all IPC peers
     * @param notification
     * @returns
     */
    sendNotification(dbname, notification) {
        const msg = { type: "notification", from: this.id, data: notification, dbname };
        this.sendMessage(dbname, msg);
    }
    /**
     * If ipc event handling is currently enabled
     */
    get eventsEnabled() {
        return this._eventsEnabled;
    }
    /**
     * Enables or disables ipc event handling. When disabled, incoming event messages will be ignored.
     */
    set eventsEnabled(enabled) {
        this.debug.log(`ipc events ${enabled ? "enabled" : "disabled"}`);
        this._eventsEnabled = enabled;
    }
}
exports.IvipBaseIPCPeer = IvipBaseIPCPeer;

},{"ivipbase-core":99}],31:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalServer = exports.AbstractLocalServer = exports.isPossiblyServer = exports.ServerSettings = exports.ServerAuthenticationSettings = exports.DataBaseServerTransactionSettings = exports.AUTH_ACCESS_DEFAULT = exports.ExternalServerError = exports.ServerNotReadyError = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const database_1 = require("../database");
const utils_1 = require("../utils");
class ServerNotReadyError extends Error {
    constructor() {
        super("O servidor ainda não está pronto");
    }
}
exports.ServerNotReadyError = ServerNotReadyError;
class ExternalServerError extends Error {
    constructor() {
        super("Este método não está disponível com um servidor externo");
    }
}
exports.ExternalServerError = ExternalServerError;
exports.AUTH_ACCESS_DEFAULT = {
    DENY_ALL: "deny",
    ALLOW_ALL: "allow",
    ALLOW_AUTHENTICATED: "auth",
};
class DataBaseServerTransactionSettings {
    constructor(settings) {
        /**
         * Se deve ativar o log de transações
         */
        this.log = false;
        /**
         * Idade máxima em dias para manter as transações no arquivo de log
         */
        this.maxAge = 30;
        /**
         * Se as operações de gravação do banco de dados não devem esperar até que a transação seja registrada
         */
        this.noWait = false;
        if (typeof settings !== "object") {
            return;
        }
        if (typeof settings.log === "boolean") {
            this.log = settings.log;
        }
        if (typeof settings.maxAge === "number") {
            this.maxAge = settings.maxAge;
        }
        if (typeof settings.noWait === "boolean") {
            this.noWait = settings.noWait;
        }
    }
}
exports.DataBaseServerTransactionSettings = DataBaseServerTransactionSettings;
class ServerAuthenticationSettings {
    constructor(settings = {}) {
        /**
         * Se autorização deve ser habilitada. Sem autorização, o banco de dados inteiro pode ser lido e gravado por qualquer pessoa (não recomendado 🤷🏼‍♂️)
         */
        this.enabled = true;
        /**
         * Se a criação de novos usuários é permitida para qualquer pessoa ou apenas para o administrador
         */
        this.allowUserSignup = false;
        /**
         * Quantos novos usuários podem se inscrever por hora por endereço IP. Não implementado ainda
         */
        this.newUserRateLimit = 0;
        /**
         * Quantos minutos antes dos tokens de acesso expirarem. 0 para sem expiração.
         */
        this.tokensExpire = 0;
        /**
         * Quando o servidor é executado pela primeira vez, quais padrões usar para gerar o arquivo rules.json. Opções são: 'auth' (acesso apenas autenticado ao banco de dados, padrão), 'deny' (negar acesso a qualquer pessoa, exceto o usuário administrador), 'allow' (permitir acesso a qualquer pessoa)
         */
        this.defaultAccessRule = exports.AUTH_ACCESS_DEFAULT.ALLOW_AUTHENTICATED;
        /**
         * Se deve usar um banco de dados separado para autenticação e logs. 'v2' armazenará dados em auth.db, o que AINDA NÃO FOI TESTADO!
         */
        this.separateDb = false;
        if (typeof settings !== "object") {
            settings = {};
        }
        if (typeof settings.enabled === "boolean") {
            this.enabled = settings.enabled;
        }
        if (typeof settings.allowUserSignup === "boolean") {
            this.allowUserSignup = settings.allowUserSignup;
        }
        if (typeof settings.newUserRateLimit === "number") {
            this.newUserRateLimit = settings.newUserRateLimit;
        }
        if (typeof settings.tokensExpire === "number") {
            this.tokensExpire = settings.tokensExpire;
        }
        if (typeof settings.defaultAccessRule === "string") {
            this.defaultAccessRule = settings.defaultAccessRule;
        }
        if (typeof settings.defaultAdminPassword === "string") {
            this.defaultAdminPassword = settings.defaultAdminPassword;
        }
        if (typeof settings.seperateDb === "boolean") {
            this.separateDb = settings.seperateDb;
        } // Lidar com a grafia anterior _errada_
        if (typeof settings.separateDb === "boolean") {
            this.separateDb = settings.separateDb;
        }
    }
    toJSON() {
        return {
            enabled: this.enabled,
            allowUserSignup: this.allowUserSignup,
            newUserRateLimit: this.newUserRateLimit,
            tokensExpire: this.tokensExpire,
            defaultAccessRule: this.defaultAccessRule,
            defaultAdminPassword: this.defaultAdminPassword,
            separateDb: this.separateDb,
        };
    }
}
exports.ServerAuthenticationSettings = ServerAuthenticationSettings;
class ServerSettings {
    constructor(options = {}) {
        var _a, _b, _c;
        this.logLevel = "log";
        this.host = "localhost";
        this.port = 3000;
        this.rootPath = "";
        this.maxPayloadSize = "10mb";
        this.allowOrigin = "*";
        this.trustProxy = true;
        this.serverVersion = "1.0.0";
        this.localPath = "./data";
        this.dbAuth = {};
        if (typeof options.logLevel === "string" && ["verbose", "log", "warn", "error"].includes(options.logLevel)) {
            this.logLevel = options.logLevel;
        }
        if (typeof options.host === "string") {
            this.host = options.host;
        }
        if (typeof options.port === "number") {
            this.port = options.port;
        }
        if (typeof options.maxPayloadSize === "string") {
            this.maxPayloadSize = options.maxPayloadSize;
        }
        if (typeof options.allowOrigin === "string") {
            this.allowOrigin = options.allowOrigin;
        }
        if (typeof options.trustProxy === "boolean") {
            this.trustProxy = options.trustProxy;
        }
        this.auth = new ServerAuthenticationSettings((_b = (_a = options.authentication) !== null && _a !== void 0 ? _a : options.auth) !== null && _b !== void 0 ? _b : {});
        const dbList = (Array.isArray(options.database) ? options.database : [options.database]).filter((db) => typeof db !== "undefined");
        if (typeof options.dbAuth === "object") {
            this.dbAuth = Object.fromEntries(Object.entries(options.dbAuth).map(([dbName, auth]) => {
                if (auth instanceof ServerAuthenticationSettings) {
                    return [dbName, auth];
                }
                return [dbName, new ServerAuthenticationSettings((0, utils_1.joinObjects)(this.auth.toJSON(), auth !== null && auth !== void 0 ? auth : {}))];
            }));
        }
        dbList.forEach((db) => {
            var _a;
            this.dbAuth[db.name] = new ServerAuthenticationSettings((0, utils_1.joinObjects)(this.auth.toJSON(), (_a = db.authentication) !== null && _a !== void 0 ? _a : {}));
        });
        if (typeof options.init === "function") {
            this.init = options.init;
        }
        if (typeof options.serverVersion === "string") {
            this.serverVersion = options.serverVersion;
        }
        this.transactions = new DataBaseServerTransactionSettings((_c = options.transactions) !== null && _c !== void 0 ? _c : {});
        if (typeof options.defineRules === "object") {
            this.defineRules = options.defineRules;
        }
        if (typeof options.localPath === "string") {
            this.localPath = options.localPath;
        }
    }
}
exports.ServerSettings = ServerSettings;
exports.isPossiblyServer = false;
class AbstractLocalServer extends ivipbase_core_1.SimpleEventEmitter {
    constructor(localApp, settings = {}) {
        super();
        this.localApp = localApp;
        this._ready = false;
        this.securityRef = (dbName) => {
            return this.db(dbName).ref("__auth__/security");
        };
        this.authRef = (dbName) => {
            return this.db(dbName).ref("__auth__/accounts");
        };
        this.send_email = (dbName, request) => {
            return new Promise((resolve, reject) => {
                try {
                    if (!this.hasDatabase(dbName)) {
                        throw new Error(`Database '${dbName}' not found`);
                    }
                    const send_email = this.db(dbName).app.settings.email;
                    if (!send_email || !send_email.send) {
                        throw new Error("Email not configured");
                    }
                    send_email.send(request).then(resolve);
                }
                catch (e) {
                    reject(e);
                }
            });
        };
        this.settings = new ServerSettings(settings);
        this.db = (dbName) => (0, database_1.getDatabase)(dbName, localApp);
        this.hasDatabase = (dbName) => (0, database_1.hasDatabase)(dbName);
        this.rules = (dbName) => {
            return this.db(dbName).rules;
        };
        this.debug = new ivipbase_core_1.DebugLogger(this.settings.logLevel, `[SERVER]`);
        this.log = this.debug;
        this.on("ready", () => {
            this._ready = true;
        });
    }
    /**
     * Aguarda o servidor estar pronto antes de executar o seu callback.
     * @param callback (opcional) função de retorno chamada quando o servidor estiver pronto para ser usado. Você também pode usar a promise retornada.
     * @returns retorna uma promise que resolve quando estiver pronto
     */
    async ready(callback) {
        if (!this._ready) {
            // Aguarda o evento ready
            await new Promise((resolve) => this.once("ready", resolve));
        }
        callback === null || callback === void 0 ? void 0 : callback();
    }
    get isReady() {
        return this._ready;
    }
    /**
     * Obtém a URL na qual o servidor está sendo executado
     */
    get url() {
        //return `http${this.settings.https.enabled ? 's' : ''}://${this.settings.host}:${this.settings.port}/${this.settings.rootPath}`;
        return `http://${this.settings.host}:${this.settings.port}/${this.settings.rootPath}`.replace(/\/+$/gi, "");
    }
    get dbNames() {
        return (0, database_1.getDatabasesNames)();
    }
    /**
     * Redefine a senha do usuário. Isso também pode ser feito usando o ponto de extremidade da API auth/reset_password
     * @param clientIp endereço IP do usuário
     * @param code código de redefinição que foi enviado para o endereço de e-mail do usuário
     * @param newPassword nova senha escolhida pelo usuário
     */
    resetPassword(dbName, clientIp, code, newPassword) {
        throw new ServerNotReadyError();
    }
    /**
     * Marca o endereço de e-mail da conta do usuário como validado. Isso também pode ser feito usando o ponto de extremidade da API auth/verify_email
     * @param clientIp endereço IP do usuário
     * @param code código de verificação enviado para o endereço de e-mail do usuário
     */
    verifyEmailAddress(dbName, clientIp, code) {
        throw new ServerNotReadyError();
    }
    getLogBytesUsage() {
        return Promise.resolve({});
    }
}
exports.AbstractLocalServer = AbstractLocalServer;
class LocalServer extends AbstractLocalServer {
    constructor(localApp, settings = {}) {
        super(localApp, settings);
        this.isServer = false;
        this.init();
    }
    init() {
        this.emit("ready");
    }
}
exports.LocalServer = LocalServer;

},{"../database":24,"../utils":34,"ivipbase-core":99}],32:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExtension = exports.getType = exports.define = exports.extensions = exports.types = void 0;
const standard = {
    "application/andrew-inset": ["ez"],
    "application/applixware": ["aw"],
    "application/atom+xml": ["atom"],
    "application/atomcat+xml": ["atomcat"],
    "application/atomdeleted+xml": ["atomdeleted"],
    "application/atomsvc+xml": ["atomsvc"],
    "application/atsc-dwd+xml": ["dwd"],
    "application/atsc-held+xml": ["held"],
    "application/atsc-rsat+xml": ["rsat"],
    "application/bdoc": ["bdoc"],
    "application/calendar+xml": ["xcs"],
    "application/ccxml+xml": ["ccxml"],
    "application/cdfx+xml": ["cdfx"],
    "application/cdmi-capability": ["cdmia"],
    "application/cdmi-container": ["cdmic"],
    "application/cdmi-domain": ["cdmid"],
    "application/cdmi-object": ["cdmio"],
    "application/cdmi-queue": ["cdmiq"],
    "application/cu-seeme": ["cu"],
    "application/dash+xml": ["mpd"],
    "application/davmount+xml": ["davmount"],
    "application/docbook+xml": ["dbk"],
    "application/dssc+der": ["dssc"],
    "application/dssc+xml": ["xdssc"],
    "application/ecmascript": ["es", "ecma"],
    "application/emma+xml": ["emma"],
    "application/emotionml+xml": ["emotionml"],
    "application/epub+zip": ["epub"],
    "application/exi": ["exi"],
    "application/express": ["exp"],
    "application/fdt+xml": ["fdt"],
    "application/font-tdpfr": ["pfr"],
    "application/geo+json": ["geojson"],
    "application/gml+xml": ["gml"],
    "application/gpx+xml": ["gpx"],
    "application/gxf": ["gxf"],
    "application/gzip": ["gz"],
    "application/hjson": ["hjson"],
    "application/hyperstudio": ["stk"],
    "application/inkml+xml": ["ink", "inkml"],
    "application/ipfix": ["ipfix"],
    "application/its+xml": ["its"],
    "application/java-archive": ["jar", "war", "ear"],
    "application/java-serialized-object": ["ser"],
    "application/java-vm": ["class"],
    "application/javascript": ["js", "mjs"],
    "application/json": ["json", "map"],
    "application/json5": ["json5"],
    "application/jsonml+json": ["jsonml"],
    "application/ld+json": ["jsonld"],
    "application/lgr+xml": ["lgr"],
    "application/lost+xml": ["lostxml"],
    "application/mac-binhex40": ["hqx"],
    "application/mac-compactpro": ["cpt"],
    "application/mads+xml": ["mads"],
    "application/manifest+json": ["webmanifest"],
    "application/marc": ["mrc"],
    "application/marcxml+xml": ["mrcx"],
    "application/mathematica": ["ma", "nb", "mb"],
    "application/mathml+xml": ["mathml"],
    "application/mbox": ["mbox"],
    "application/mediaservercontrol+xml": ["mscml"],
    "application/metalink+xml": ["metalink"],
    "application/metalink4+xml": ["meta4"],
    "application/mets+xml": ["mets"],
    "application/mmt-aei+xml": ["maei"],
    "application/mmt-usd+xml": ["musd"],
    "application/mods+xml": ["mods"],
    "application/mp21": ["m21", "mp21"],
    "application/mp4": ["mp4s", "m4p"],
    "application/msword": ["doc", "dot"],
    "application/mxf": ["mxf"],
    "application/n-quads": ["nq"],
    "application/n-triples": ["nt"],
    "application/node": ["cjs"],
    "application/octet-stream": ["bin", "dms", "lrf", "mar", "so", "dist", "distz", "pkg", "bpk", "dump", "elc", "deploy", "exe", "dll", "deb", "dmg", "iso", "img", "msi", "msp", "msm", "buffer"],
    "application/oda": ["oda"],
    "application/oebps-package+xml": ["opf"],
    "application/ogg": ["ogx"],
    "application/omdoc+xml": ["omdoc"],
    "application/onenote": ["onetoc", "onetoc2", "onetmp", "onepkg"],
    "application/oxps": ["oxps"],
    "application/p2p-overlay+xml": ["relo"],
    "application/patch-ops-error+xml": ["xer"],
    "application/pdf": ["pdf"],
    "application/pgp-encrypted": ["pgp"],
    "application/pgp-signature": ["asc", "sig"],
    "application/pics-rules": ["prf"],
    "application/pkcs10": ["p10"],
    "application/pkcs7-mime": ["p7m", "p7c"],
    "application/pkcs7-signature": ["p7s"],
    "application/pkcs8": ["p8"],
    "application/pkix-attr-cert": ["ac"],
    "application/pkix-cert": ["cer"],
    "application/pkix-crl": ["crl"],
    "application/pkix-pkipath": ["pkipath"],
    "application/pkixcmp": ["pki"],
    "application/pls+xml": ["pls"],
    "application/postscript": ["ai", "eps", "ps"],
    "application/provenance+xml": ["provx"],
    "application/pskc+xml": ["pskcxml"],
    "application/raml+yaml": ["raml"],
    "application/rdf+xml": ["rdf", "owl"],
    "application/reginfo+xml": ["rif"],
    "application/relax-ng-compact-syntax": ["rnc"],
    "application/resource-lists+xml": ["rl"],
    "application/resource-lists-diff+xml": ["rld"],
    "application/rls-services+xml": ["rs"],
    "application/route-apd+xml": ["rapd"],
    "application/route-s-tsid+xml": ["sls"],
    "application/route-usd+xml": ["rusd"],
    "application/rpki-ghostbusters": ["gbr"],
    "application/rpki-manifest": ["mft"],
    "application/rpki-roa": ["roa"],
    "application/rsd+xml": ["rsd"],
    "application/rss+xml": ["rss"],
    "application/rtf": ["rtf"],
    "application/sbml+xml": ["sbml"],
    "application/scvp-cv-request": ["scq"],
    "application/scvp-cv-response": ["scs"],
    "application/scvp-vp-request": ["spq"],
    "application/scvp-vp-response": ["spp"],
    "application/sdp": ["sdp"],
    "application/senml+xml": ["senmlx"],
    "application/sensml+xml": ["sensmlx"],
    "application/set-payment-initiation": ["setpay"],
    "application/set-registration-initiation": ["setreg"],
    "application/shf+xml": ["shf"],
    "application/sieve": ["siv", "sieve"],
    "application/smil+xml": ["smi", "smil"],
    "application/sparql-query": ["rq"],
    "application/sparql-results+xml": ["srx"],
    "application/srgs": ["gram"],
    "application/srgs+xml": ["grxml"],
    "application/sru+xml": ["sru"],
    "application/ssdl+xml": ["ssdl"],
    "application/ssml+xml": ["ssml"],
    "application/swid+xml": ["swidtag"],
    "application/tei+xml": ["tei", "teicorpus"],
    "application/thraud+xml": ["tfi"],
    "application/timestamped-data": ["tsd"],
    "application/toml": ["toml"],
    "application/trig": ["trig"],
    "application/ttml+xml": ["ttml"],
    "application/ubjson": ["ubj"],
    "application/urc-ressheet+xml": ["rsheet"],
    "application/urc-targetdesc+xml": ["td"],
    "application/voicexml+xml": ["vxml"],
    "application/wasm": ["wasm"],
    "application/widget": ["wgt"],
    "application/winhlp": ["hlp"],
    "application/wsdl+xml": ["wsdl"],
    "application/wspolicy+xml": ["wspolicy"],
    "application/xaml+xml": ["xaml"],
    "application/xcap-att+xml": ["xav"],
    "application/xcap-caps+xml": ["xca"],
    "application/xcap-diff+xml": ["xdf"],
    "application/xcap-el+xml": ["xel"],
    "application/xcap-ns+xml": ["xns"],
    "application/xenc+xml": ["xenc"],
    "application/xhtml+xml": ["xhtml", "xht"],
    "application/xliff+xml": ["xlf"],
    "application/xml": ["xml", "xsl", "xsd", "rng"],
    "application/xml-dtd": ["dtd"],
    "application/xop+xml": ["xop"],
    "application/xproc+xml": ["xpl"],
    "application/xslt+xml": ["*xsl", "xslt"],
    "application/xspf+xml": ["xspf"],
    "application/xv+xml": ["mxml", "xhvml", "xvml", "xvm"],
    "application/yang": ["yang"],
    "application/yin+xml": ["yin"],
    "application/zip": ["zip"],
    "audio/3gpp": ["*3gpp"],
    "audio/adpcm": ["adp"],
    "audio/amr": ["amr"],
    "audio/basic": ["au", "snd"],
    "audio/midi": ["mid", "midi", "kar", "rmi"],
    "audio/mobile-xmf": ["mxmf"],
    "audio/mp3": ["*mp3"],
    "audio/mp4": ["m4a", "mp4a"],
    "audio/mpeg": ["mpga", "mp2", "mp2a", "mp3", "m2a", "m3a"],
    "audio/ogg": ["oga", "ogg", "spx", "opus"],
    "audio/s3m": ["s3m"],
    "audio/silk": ["sil"],
    "audio/wav": ["wav"],
    "audio/wave": ["*wav"],
    "audio/webm": ["weba"],
    "audio/xm": ["xm"],
    "font/collection": ["ttc"],
    "font/otf": ["otf"],
    "font/ttf": ["ttf"],
    "font/woff": ["woff"],
    "font/woff2": ["woff2"],
    "image/aces": ["exr"],
    "image/apng": ["apng"],
    "image/avif": ["avif"],
    "image/bmp": ["bmp"],
    "image/cgm": ["cgm"],
    "image/dicom-rle": ["drle"],
    "image/emf": ["emf"],
    "image/fits": ["fits"],
    "image/g3fax": ["g3"],
    "image/gif": ["gif"],
    "image/heic": ["heic"],
    "image/heic-sequence": ["heics"],
    "image/heif": ["heif"],
    "image/heif-sequence": ["heifs"],
    "image/hej2k": ["hej2"],
    "image/hsj2": ["hsj2"],
    "image/ief": ["ief"],
    "image/jls": ["jls"],
    "image/jp2": ["jp2", "jpg2"],
    "image/jpeg": ["jpeg", "jpg", "jpe"],
    "image/jph": ["jph"],
    "image/jphc": ["jhc"],
    "image/jpm": ["jpm"],
    "image/jpx": ["jpx", "jpf"],
    "image/jxr": ["jxr"],
    "image/jxra": ["jxra"],
    "image/jxrs": ["jxrs"],
    "image/jxs": ["jxs"],
    "image/jxsc": ["jxsc"],
    "image/jxsi": ["jxsi"],
    "image/jxss": ["jxss"],
    "image/ktx": ["ktx"],
    "image/ktx2": ["ktx2"],
    "image/png": ["png"],
    "image/sgi": ["sgi"],
    "image/svg+xml": ["svg", "svgz"],
    "image/t38": ["t38"],
    "image/tiff": ["tif", "tiff"],
    "image/tiff-fx": ["tfx"],
    "image/webp": ["webp"],
    "image/wmf": ["wmf"],
    "message/disposition-notification": ["disposition-notification"],
    "message/global": ["u8msg"],
    "message/global-delivery-status": ["u8dsn"],
    "message/global-disposition-notification": ["u8mdn"],
    "message/global-headers": ["u8hdr"],
    "message/rfc822": ["eml", "mime"],
    "model/3mf": ["3mf"],
    "model/gltf+json": ["gltf"],
    "model/gltf-binary": ["glb"],
    "model/iges": ["igs", "iges"],
    "model/mesh": ["msh", "mesh", "silo"],
    "model/mtl": ["mtl"],
    "model/obj": ["obj"],
    "model/step+xml": ["stpx"],
    "model/step+zip": ["stpz"],
    "model/step-xml+zip": ["stpxz"],
    "model/stl": ["stl"],
    "model/vrml": ["wrl", "vrml"],
    "model/x3d+binary": ["*x3db", "x3dbz"],
    "model/x3d+fastinfoset": ["x3db"],
    "model/x3d+vrml": ["*x3dv", "x3dvz"],
    "model/x3d+xml": ["x3d", "x3dz"],
    "model/x3d-vrml": ["x3dv"],
    "text/cache-manifest": ["appcache", "manifest"],
    "text/calendar": ["ics", "ifb"],
    "text/coffeescript": ["coffee", "litcoffee"],
    "text/css": ["css"],
    "text/csv": ["csv"],
    "text/html": ["html", "htm", "shtml"],
    "text/jade": ["jade"],
    "text/jsx": ["jsx"],
    "text/less": ["less"],
    "text/markdown": ["markdown", "md"],
    "text/mathml": ["mml"],
    "text/mdx": ["mdx"],
    "text/n3": ["n3"],
    "text/plain": ["txt", "text", "conf", "def", "list", "log", "in", "ini"],
    "text/richtext": ["rtx"],
    "text/rtf": ["*rtf"],
    "text/sgml": ["sgml", "sgm"],
    "text/shex": ["shex"],
    "text/slim": ["slim", "slm"],
    "text/spdx": ["spdx"],
    "text/stylus": ["stylus", "styl"],
    "text/tab-separated-values": ["tsv"],
    "text/troff": ["t", "tr", "roff", "man", "me", "ms"],
    "text/turtle": ["ttl"],
    "text/uri-list": ["uri", "uris", "urls"],
    "text/vcard": ["vcard"],
    "text/vtt": ["vtt"],
    "text/xml": ["*xml"],
    "text/yaml": ["yaml", "yml"],
    "video/3gpp": ["3gp", "3gpp"],
    "video/3gpp2": ["3g2"],
    "video/h261": ["h261"],
    "video/h263": ["h263"],
    "video/h264": ["h264"],
    "video/iso.segment": ["m4s"],
    "video/jpeg": ["jpgv"],
    "video/jpm": ["*jpm", "jpgm"],
    "video/mj2": ["mj2", "mjp2"],
    "video/mp2t": ["ts"],
    "video/mp4": ["mp4", "mp4v", "mpg4"],
    "video/mpeg": ["mpeg", "mpg", "mpe", "m1v", "m2v"],
    "video/ogg": ["ogv"],
    "video/quicktime": ["qt", "mov"],
    "video/webm": ["webm"],
};
const other = {
    "application/prs.cww": ["cww"],
    "application/vnd.1000minds.decision-model+xml": ["1km"],
    "application/vnd.3gpp.pic-bw-large": ["plb"],
    "application/vnd.3gpp.pic-bw-small": ["psb"],
    "application/vnd.3gpp.pic-bw-var": ["pvb"],
    "application/vnd.3gpp2.tcap": ["tcap"],
    "application/vnd.3m.post-it-notes": ["pwn"],
    "application/vnd.accpac.simply.aso": ["aso"],
    "application/vnd.accpac.simply.imp": ["imp"],
    "application/vnd.acucobol": ["acu"],
    "application/vnd.acucorp": ["atc", "acutc"],
    "application/vnd.adobe.air-application-installer-package+zip": ["air"],
    "application/vnd.adobe.formscentral.fcdt": ["fcdt"],
    "application/vnd.adobe.fxp": ["fxp", "fxpl"],
    "application/vnd.adobe.xdp+xml": ["xdp"],
    "application/vnd.adobe.xfdf": ["xfdf"],
    "application/vnd.ahead.space": ["ahead"],
    "application/vnd.airzip.filesecure.azf": ["azf"],
    "application/vnd.airzip.filesecure.azs": ["azs"],
    "application/vnd.amazon.ebook": ["azw"],
    "application/vnd.americandynamics.acc": ["acc"],
    "application/vnd.amiga.ami": ["ami"],
    "application/vnd.android.package-archive": ["apk"],
    "application/vnd.anser-web-certificate-issue-initiation": ["cii"],
    "application/vnd.anser-web-funds-transfer-initiation": ["fti"],
    "application/vnd.antix.game-component": ["atx"],
    "application/vnd.apple.installer+xml": ["mpkg"],
    "application/vnd.apple.keynote": ["key"],
    "application/vnd.apple.mpegurl": ["m3u8"],
    "application/vnd.apple.numbers": ["numbers"],
    "application/vnd.apple.pages": ["pages"],
    "application/vnd.apple.pkpass": ["pkpass"],
    "application/vnd.aristanetworks.swi": ["swi"],
    "application/vnd.astraea-software.iota": ["iota"],
    "application/vnd.audiograph": ["aep"],
    "application/vnd.balsamiq.bmml+xml": ["bmml"],
    "application/vnd.blueice.multipass": ["mpm"],
    "application/vnd.bmi": ["bmi"],
    "application/vnd.businessobjects": ["rep"],
    "application/vnd.chemdraw+xml": ["cdxml"],
    "application/vnd.chipnuts.karaoke-mmd": ["mmd"],
    "application/vnd.cinderella": ["cdy"],
    "application/vnd.citationstyles.style+xml": ["csl"],
    "application/vnd.claymore": ["cla"],
    "application/vnd.cloanto.rp9": ["rp9"],
    "application/vnd.clonk.c4group": ["c4g", "c4d", "c4f", "c4p", "c4u"],
    "application/vnd.cluetrust.cartomobile-config": ["c11amc"],
    "application/vnd.cluetrust.cartomobile-config-pkg": ["c11amz"],
    "application/vnd.commonspace": ["csp"],
    "application/vnd.contact.cmsg": ["cdbcmsg"],
    "application/vnd.cosmocaller": ["cmc"],
    "application/vnd.crick.clicker": ["clkx"],
    "application/vnd.crick.clicker.keyboard": ["clkk"],
    "application/vnd.crick.clicker.palette": ["clkp"],
    "application/vnd.crick.clicker.template": ["clkt"],
    "application/vnd.crick.clicker.wordbank": ["clkw"],
    "application/vnd.criticaltools.wbs+xml": ["wbs"],
    "application/vnd.ctc-posml": ["pml"],
    "application/vnd.cups-ppd": ["ppd"],
    "application/vnd.curl.car": ["car"],
    "application/vnd.curl.pcurl": ["pcurl"],
    "application/vnd.dart": ["dart"],
    "application/vnd.data-vision.rdz": ["rdz"],
    "application/vnd.dbf": ["dbf"],
    "application/vnd.dece.data": ["uvf", "uvvf", "uvd", "uvvd"],
    "application/vnd.dece.ttml+xml": ["uvt", "uvvt"],
    "application/vnd.dece.unspecified": ["uvx", "uvvx"],
    "application/vnd.dece.zip": ["uvz", "uvvz"],
    "application/vnd.denovo.fcselayout-link": ["fe_launch"],
    "application/vnd.dna": ["dna"],
    "application/vnd.dolby.mlp": ["mlp"],
    "application/vnd.dpgraph": ["dpg"],
    "application/vnd.dreamfactory": ["dfac"],
    "application/vnd.ds-keypoint": ["kpxx"],
    "application/vnd.dvb.ait": ["ait"],
    "application/vnd.dvb.service": ["svc"],
    "application/vnd.dynageo": ["geo"],
    "application/vnd.ecowin.chart": ["mag"],
    "application/vnd.enliven": ["nml"],
    "application/vnd.epson.esf": ["esf"],
    "application/vnd.epson.msf": ["msf"],
    "application/vnd.epson.quickanime": ["qam"],
    "application/vnd.epson.salt": ["slt"],
    "application/vnd.epson.ssf": ["ssf"],
    "application/vnd.eszigno3+xml": ["es3", "et3"],
    "application/vnd.ezpix-album": ["ez2"],
    "application/vnd.ezpix-package": ["ez3"],
    "application/vnd.fdf": ["fdf"],
    "application/vnd.fdsn.mseed": ["mseed"],
    "application/vnd.fdsn.seed": ["seed", "dataless"],
    "application/vnd.flographit": ["gph"],
    "application/vnd.fluxtime.clip": ["ftc"],
    "application/vnd.framemaker": ["fm", "frame", "maker", "book"],
    "application/vnd.frogans.fnc": ["fnc"],
    "application/vnd.frogans.ltf": ["ltf"],
    "application/vnd.fsc.weblaunch": ["fsc"],
    "application/vnd.fujitsu.oasys": ["oas"],
    "application/vnd.fujitsu.oasys2": ["oa2"],
    "application/vnd.fujitsu.oasys3": ["oa3"],
    "application/vnd.fujitsu.oasysgp": ["fg5"],
    "application/vnd.fujitsu.oasysprs": ["bh2"],
    "application/vnd.fujixerox.ddd": ["ddd"],
    "application/vnd.fujixerox.docuworks": ["xdw"],
    "application/vnd.fujixerox.docuworks.binder": ["xbd"],
    "application/vnd.fuzzysheet": ["fzs"],
    "application/vnd.genomatix.tuxedo": ["txd"],
    "application/vnd.geogebra.file": ["ggb"],
    "application/vnd.geogebra.tool": ["ggt"],
    "application/vnd.geometry-explorer": ["gex", "gre"],
    "application/vnd.geonext": ["gxt"],
    "application/vnd.geoplan": ["g2w"],
    "application/vnd.geospace": ["g3w"],
    "application/vnd.gmx": ["gmx"],
    "application/vnd.google-apps.document": ["gdoc"],
    "application/vnd.google-apps.presentation": ["gslides"],
    "application/vnd.google-apps.spreadsheet": ["gsheet"],
    "application/vnd.google-earth.kml+xml": ["kml"],
    "application/vnd.google-earth.kmz": ["kmz"],
    "application/vnd.grafeq": ["gqf", "gqs"],
    "application/vnd.groove-account": ["gac"],
    "application/vnd.groove-help": ["ghf"],
    "application/vnd.groove-identity-message": ["gim"],
    "application/vnd.groove-injector": ["grv"],
    "application/vnd.groove-tool-message": ["gtm"],
    "application/vnd.groove-tool-template": ["tpl"],
    "application/vnd.groove-vcard": ["vcg"],
    "application/vnd.hal+xml": ["hal"],
    "application/vnd.handheld-entertainment+xml": ["zmm"],
    "application/vnd.hbci": ["hbci"],
    "application/vnd.hhe.lesson-player": ["les"],
    "application/vnd.hp-hpgl": ["hpgl"],
    "application/vnd.hp-hpid": ["hpid"],
    "application/vnd.hp-hps": ["hps"],
    "application/vnd.hp-jlyt": ["jlt"],
    "application/vnd.hp-pcl": ["pcl"],
    "application/vnd.hp-pclxl": ["pclxl"],
    "application/vnd.hydrostatix.sof-data": ["sfd-hdstx"],
    "application/vnd.ibm.minipay": ["mpy"],
    "application/vnd.ibm.modcap": ["afp", "listafp", "list3820"],
    "application/vnd.ibm.rights-management": ["irm"],
    "application/vnd.ibm.secure-container": ["sc"],
    "application/vnd.iccprofile": ["icc", "icm"],
    "application/vnd.igloader": ["igl"],
    "application/vnd.immervision-ivp": ["ivp"],
    "application/vnd.immervision-ivu": ["ivu"],
    "application/vnd.insors.igm": ["igm"],
    "application/vnd.intercon.formnet": ["xpw", "xpx"],
    "application/vnd.intergeo": ["i2g"],
    "application/vnd.intu.qbo": ["qbo"],
    "application/vnd.intu.qfx": ["qfx"],
    "application/vnd.ipunplugged.rcprofile": ["rcprofile"],
    "application/vnd.irepository.package+xml": ["irp"],
    "application/vnd.is-xpr": ["xpr"],
    "application/vnd.isac.fcs": ["fcs"],
    "application/vnd.jam": ["jam"],
    "application/vnd.jcp.javame.midlet-rms": ["rms"],
    "application/vnd.jisp": ["jisp"],
    "application/vnd.joost.joda-archive": ["joda"],
    "application/vnd.kahootz": ["ktz", "ktr"],
    "application/vnd.kde.karbon": ["karbon"],
    "application/vnd.kde.kchart": ["chrt"],
    "application/vnd.kde.kformula": ["kfo"],
    "application/vnd.kde.kivio": ["flw"],
    "application/vnd.kde.kontour": ["kon"],
    "application/vnd.kde.kpresenter": ["kpr", "kpt"],
    "application/vnd.kde.kspread": ["ksp"],
    "application/vnd.kde.kword": ["kwd", "kwt"],
    "application/vnd.kenameaapp": ["htke"],
    "application/vnd.kidspiration": ["kia"],
    "application/vnd.kinar": ["kne", "knp"],
    "application/vnd.koan": ["skp", "skd", "skt", "skm"],
    "application/vnd.kodak-descriptor": ["sse"],
    "application/vnd.las.las+xml": ["lasxml"],
    "application/vnd.llamagraphics.life-balance.desktop": ["lbd"],
    "application/vnd.llamagraphics.life-balance.exchange+xml": ["lbe"],
    "application/vnd.lotus-1-2-3": ["123"],
    "application/vnd.lotus-approach": ["apr"],
    "application/vnd.lotus-freelance": ["pre"],
    "application/vnd.lotus-notes": ["nsf"],
    "application/vnd.lotus-organizer": ["org"],
    "application/vnd.lotus-screencam": ["scm"],
    "application/vnd.lotus-wordpro": ["lwp"],
    "application/vnd.macports.portpkg": ["portpkg"],
    "application/vnd.mapbox-vector-tile": ["mvt"],
    "application/vnd.mcd": ["mcd"],
    "application/vnd.medcalcdata": ["mc1"],
    "application/vnd.mediastation.cdkey": ["cdkey"],
    "application/vnd.mfer": ["mwf"],
    "application/vnd.mfmp": ["mfm"],
    "application/vnd.micrografx.flo": ["flo"],
    "application/vnd.micrografx.igx": ["igx"],
    "application/vnd.mif": ["mif"],
    "application/vnd.mobius.daf": ["daf"],
    "application/vnd.mobius.dis": ["dis"],
    "application/vnd.mobius.mbk": ["mbk"],
    "application/vnd.mobius.mqy": ["mqy"],
    "application/vnd.mobius.msl": ["msl"],
    "application/vnd.mobius.plc": ["plc"],
    "application/vnd.mobius.txf": ["txf"],
    "application/vnd.mophun.application": ["mpn"],
    "application/vnd.mophun.certificate": ["mpc"],
    "application/vnd.mozilla.xul+xml": ["xul"],
    "application/vnd.ms-artgalry": ["cil"],
    "application/vnd.ms-cab-compressed": ["cab"],
    "application/vnd.ms-excel": ["xls", "xlm", "xla", "xlc", "xlt", "xlw"],
    "application/vnd.ms-excel.addin.macroenabled.12": ["xlam"],
    "application/vnd.ms-excel.sheet.binary.macroenabled.12": ["xlsb"],
    "application/vnd.ms-excel.sheet.macroenabled.12": ["xlsm"],
    "application/vnd.ms-excel.template.macroenabled.12": ["xltm"],
    "application/vnd.ms-fontobject": ["eot"],
    "application/vnd.ms-htmlhelp": ["chm"],
    "application/vnd.ms-ims": ["ims"],
    "application/vnd.ms-lrm": ["lrm"],
    "application/vnd.ms-officetheme": ["thmx"],
    "application/vnd.ms-outlook": ["msg"],
    "application/vnd.ms-pki.seccat": ["cat"],
    "application/vnd.ms-pki.stl": ["*stl"],
    "application/vnd.ms-powerpoint": ["ppt", "pps", "pot"],
    "application/vnd.ms-powerpoint.addin.macroenabled.12": ["ppam"],
    "application/vnd.ms-powerpoint.presentation.macroenabled.12": ["pptm"],
    "application/vnd.ms-powerpoint.slide.macroenabled.12": ["sldm"],
    "application/vnd.ms-powerpoint.slideshow.macroenabled.12": ["ppsm"],
    "application/vnd.ms-powerpoint.template.macroenabled.12": ["potm"],
    "application/vnd.ms-project": ["mpp", "mpt"],
    "application/vnd.ms-word.document.macroenabled.12": ["docm"],
    "application/vnd.ms-word.template.macroenabled.12": ["dotm"],
    "application/vnd.ms-works": ["wps", "wks", "wcm", "wdb"],
    "application/vnd.ms-wpl": ["wpl"],
    "application/vnd.ms-xpsdocument": ["xps"],
    "application/vnd.mseq": ["mseq"],
    "application/vnd.musician": ["mus"],
    "application/vnd.muvee.style": ["msty"],
    "application/vnd.mynfc": ["taglet"],
    "application/vnd.neurolanguage.nlu": ["nlu"],
    "application/vnd.nitf": ["ntf", "nitf"],
    "application/vnd.noblenet-directory": ["nnd"],
    "application/vnd.noblenet-sealer": ["nns"],
    "application/vnd.noblenet-web": ["nnw"],
    "application/vnd.nokia.n-gage.ac+xml": ["*ac"],
    "application/vnd.nokia.n-gage.data": ["ngdat"],
    "application/vnd.nokia.n-gage.symbian.install": ["n-gage"],
    "application/vnd.nokia.radio-preset": ["rpst"],
    "application/vnd.nokia.radio-presets": ["rpss"],
    "application/vnd.novadigm.edm": ["edm"],
    "application/vnd.novadigm.edx": ["edx"],
    "application/vnd.novadigm.ext": ["ext"],
    "application/vnd.oasis.opendocument.chart": ["odc"],
    "application/vnd.oasis.opendocument.chart-template": ["otc"],
    "application/vnd.oasis.opendocument.database": ["odb"],
    "application/vnd.oasis.opendocument.formula": ["odf"],
    "application/vnd.oasis.opendocument.formula-template": ["odft"],
    "application/vnd.oasis.opendocument.graphics": ["odg"],
    "application/vnd.oasis.opendocument.graphics-template": ["otg"],
    "application/vnd.oasis.opendocument.image": ["odi"],
    "application/vnd.oasis.opendocument.image-template": ["oti"],
    "application/vnd.oasis.opendocument.presentation": ["odp"],
    "application/vnd.oasis.opendocument.presentation-template": ["otp"],
    "application/vnd.oasis.opendocument.spreadsheet": ["ods"],
    "application/vnd.oasis.opendocument.spreadsheet-template": ["ots"],
    "application/vnd.oasis.opendocument.text": ["odt"],
    "application/vnd.oasis.opendocument.text-master": ["odm"],
    "application/vnd.oasis.opendocument.text-template": ["ott"],
    "application/vnd.oasis.opendocument.text-web": ["oth"],
    "application/vnd.olpc-sugar": ["xo"],
    "application/vnd.oma.dd2+xml": ["dd2"],
    "application/vnd.openblox.game+xml": ["obgx"],
    "application/vnd.openofficeorg.extension": ["oxt"],
    "application/vnd.openstreetmap.data+xml": ["osm"],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
    "application/vnd.openxmlformats-officedocument.presentationml.slide": ["sldx"],
    "application/vnd.openxmlformats-officedocument.presentationml.slideshow": ["ppsx"],
    "application/vnd.openxmlformats-officedocument.presentationml.template": ["potx"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.template": ["xltx"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.template": ["dotx"],
    "application/vnd.osgeo.mapguide.package": ["mgp"],
    "application/vnd.osgi.dp": ["dp"],
    "application/vnd.osgi.subsystem": ["esa"],
    "application/vnd.palm": ["pdb", "pqa", "oprc"],
    "application/vnd.pawaafile": ["paw"],
    "application/vnd.pg.format": ["str"],
    "application/vnd.pg.osasli": ["ei6"],
    "application/vnd.picsel": ["efif"],
    "application/vnd.pmi.widget": ["wg"],
    "application/vnd.pocketlearn": ["plf"],
    "application/vnd.powerbuilder6": ["pbd"],
    "application/vnd.previewsystems.box": ["box"],
    "application/vnd.proteus.magazine": ["mgz"],
    "application/vnd.publishare-delta-tree": ["qps"],
    "application/vnd.pvi.ptid1": ["ptid"],
    "application/vnd.quark.quarkxpress": ["qxd", "qxt", "qwd", "qwt", "qxl", "qxb"],
    "application/vnd.rar": ["rar"],
    "application/vnd.realvnc.bed": ["bed"],
    "application/vnd.recordare.musicxml": ["mxl"],
    "application/vnd.recordare.musicxml+xml": ["musicxml"],
    "application/vnd.rig.cryptonote": ["cryptonote"],
    "application/vnd.rim.cod": ["cod"],
    "application/vnd.rn-realmedia": ["rm"],
    "application/vnd.rn-realmedia-vbr": ["rmvb"],
    "application/vnd.route66.link66+xml": ["link66"],
    "application/vnd.sailingtracker.track": ["st"],
    "application/vnd.seemail": ["see"],
    "application/vnd.sema": ["sema"],
    "application/vnd.semd": ["semd"],
    "application/vnd.semf": ["semf"],
    "application/vnd.shana.informed.formdata": ["ifm"],
    "application/vnd.shana.informed.formtemplate": ["itp"],
    "application/vnd.shana.informed.interchange": ["iif"],
    "application/vnd.shana.informed.package": ["ipk"],
    "application/vnd.simtech-mindmapper": ["twd", "twds"],
    "application/vnd.smaf": ["mmf"],
    "application/vnd.smart.teacher": ["teacher"],
    "application/vnd.software602.filler.form+xml": ["fo"],
    "application/vnd.solent.sdkm+xml": ["sdkm", "sdkd"],
    "application/vnd.spotfire.dxp": ["dxp"],
    "application/vnd.spotfire.sfs": ["sfs"],
    "application/vnd.stardivision.calc": ["sdc"],
    "application/vnd.stardivision.draw": ["sda"],
    "application/vnd.stardivision.impress": ["sdd"],
    "application/vnd.stardivision.math": ["smf"],
    "application/vnd.stardivision.writer": ["sdw", "vor"],
    "application/vnd.stardivision.writer-global": ["sgl"],
    "application/vnd.stepmania.package": ["smzip"],
    "application/vnd.stepmania.stepchart": ["sm"],
    "application/vnd.sun.wadl+xml": ["wadl"],
    "application/vnd.sun.xml.calc": ["sxc"],
    "application/vnd.sun.xml.calc.template": ["stc"],
    "application/vnd.sun.xml.draw": ["sxd"],
    "application/vnd.sun.xml.draw.template": ["std"],
    "application/vnd.sun.xml.impress": ["sxi"],
    "application/vnd.sun.xml.impress.template": ["sti"],
    "application/vnd.sun.xml.math": ["sxm"],
    "application/vnd.sun.xml.writer": ["sxw"],
    "application/vnd.sun.xml.writer.global": ["sxg"],
    "application/vnd.sun.xml.writer.template": ["stw"],
    "application/vnd.sus-calendar": ["sus", "susp"],
    "application/vnd.svd": ["svd"],
    "application/vnd.symbian.install": ["sis", "sisx"],
    "application/vnd.syncml+xml": ["xsm"],
    "application/vnd.syncml.dm+wbxml": ["bdm"],
    "application/vnd.syncml.dm+xml": ["xdm"],
    "application/vnd.syncml.dmddf+xml": ["ddf"],
    "application/vnd.tao.intent-module-archive": ["tao"],
    "application/vnd.tcpdump.pcap": ["pcap", "cap", "dmp"],
    "application/vnd.tmobile-livetv": ["tmo"],
    "application/vnd.trid.tpt": ["tpt"],
    "application/vnd.triscape.mxs": ["mxs"],
    "application/vnd.trueapp": ["tra"],
    "application/vnd.ufdl": ["ufd", "ufdl"],
    "application/vnd.uiq.theme": ["utz"],
    "application/vnd.umajin": ["umj"],
    "application/vnd.unity": ["unityweb"],
    "application/vnd.uoml+xml": ["uoml"],
    "application/vnd.vcx": ["vcx"],
    "application/vnd.visio": ["vsd", "vst", "vss", "vsw"],
    "application/vnd.visionary": ["vis"],
    "application/vnd.vsf": ["vsf"],
    "application/vnd.wap.wbxml": ["wbxml"],
    "application/vnd.wap.wmlc": ["wmlc"],
    "application/vnd.wap.wmlscriptc": ["wmlsc"],
    "application/vnd.webturbo": ["wtb"],
    "application/vnd.wolfram.player": ["nbp"],
    "application/vnd.wordperfect": ["wpd"],
    "application/vnd.wqd": ["wqd"],
    "application/vnd.wt.stf": ["stf"],
    "application/vnd.xara": ["xar"],
    "application/vnd.xfdl": ["xfdl"],
    "application/vnd.yamaha.hv-dic": ["hvd"],
    "application/vnd.yamaha.hv-script": ["hvs"],
    "application/vnd.yamaha.hv-voice": ["hvp"],
    "application/vnd.yamaha.openscoreformat": ["osf"],
    "application/vnd.yamaha.openscoreformat.osfpvg+xml": ["osfpvg"],
    "application/vnd.yamaha.smaf-audio": ["saf"],
    "application/vnd.yamaha.smaf-phrase": ["spf"],
    "application/vnd.yellowriver-custom-menu": ["cmp"],
    "application/vnd.zul": ["zir", "zirz"],
    "application/vnd.zzazz.deck+xml": ["zaz"],
    "application/x-7z-compressed": ["7z"],
    "application/x-abiword": ["abw"],
    "application/x-ace-compressed": ["ace"],
    "application/x-apple-diskimage": ["*dmg"],
    "application/x-arj": ["arj"],
    "application/x-authorware-bin": ["aab", "x32", "u32", "vox"],
    "application/x-authorware-map": ["aam"],
    "application/x-authorware-seg": ["aas"],
    "application/x-bcpio": ["bcpio"],
    "application/x-bdoc": ["*bdoc"],
    "application/x-bittorrent": ["torrent"],
    "application/x-blorb": ["blb", "blorb"],
    "application/x-bzip": ["bz"],
    "application/x-bzip2": ["bz2", "boz"],
    "application/x-cbr": ["cbr", "cba", "cbt", "cbz", "cb7"],
    "application/x-cdlink": ["vcd"],
    "application/x-cfs-compressed": ["cfs"],
    "application/x-chat": ["chat"],
    "application/x-chess-pgn": ["pgn"],
    "application/x-chrome-extension": ["crx"],
    "application/x-cocoa": ["cco"],
    "application/x-conference": ["nsc"],
    "application/x-cpio": ["cpio"],
    "application/x-csh": ["csh"],
    "application/x-debian-package": ["*deb", "udeb"],
    "application/x-dgc-compressed": ["dgc"],
    "application/x-director": ["dir", "dcr", "dxr", "cst", "cct", "cxt", "w3d", "fgd", "swa"],
    "application/x-doom": ["wad"],
    "application/x-dtbncx+xml": ["ncx"],
    "application/x-dtbook+xml": ["dtb"],
    "application/x-dtbresource+xml": ["res"],
    "application/x-dvi": ["dvi"],
    "application/x-envoy": ["evy"],
    "application/x-eva": ["eva"],
    "application/x-font-bdf": ["bdf"],
    "application/x-font-ghostscript": ["gsf"],
    "application/x-font-linux-psf": ["psf"],
    "application/x-font-pcf": ["pcf"],
    "application/x-font-snf": ["snf"],
    "application/x-font-type1": ["pfa", "pfb", "pfm", "afm"],
    "application/x-freearc": ["arc"],
    "application/x-futuresplash": ["spl"],
    "application/x-gca-compressed": ["gca"],
    "application/x-glulx": ["ulx"],
    "application/x-gnumeric": ["gnumeric"],
    "application/x-gramps-xml": ["gramps"],
    "application/x-gtar": ["gtar"],
    "application/x-hdf": ["hdf"],
    "application/x-httpd-php": ["php"],
    "application/x-install-instructions": ["install"],
    "application/x-iso9660-image": ["*iso"],
    "application/x-iwork-keynote-sffkey": ["*key"],
    "application/x-iwork-numbers-sffnumbers": ["*numbers"],
    "application/x-iwork-pages-sffpages": ["*pages"],
    "application/x-java-archive-diff": ["jardiff"],
    "application/x-java-jnlp-file": ["jnlp"],
    "application/x-keepass2": ["kdbx"],
    "application/x-latex": ["latex"],
    "application/x-lua-bytecode": ["luac"],
    "application/x-lzh-compressed": ["lzh", "lha"],
    "application/x-makeself": ["run"],
    "application/x-mie": ["mie"],
    "application/x-mobipocket-ebook": ["prc", "mobi"],
    "application/x-ms-application": ["application"],
    "application/x-ms-shortcut": ["lnk"],
    "application/x-ms-wmd": ["wmd"],
    "application/x-ms-wmz": ["wmz"],
    "application/x-ms-xbap": ["xbap"],
    "application/x-msaccess": ["mdb"],
    "application/x-msbinder": ["obd"],
    "application/x-mscardfile": ["crd"],
    "application/x-msclip": ["clp"],
    "application/x-msdos-program": ["*exe"],
    "application/x-msdownload": ["*exe", "*dll", "com", "bat", "*msi"],
    "application/x-msmediaview": ["mvb", "m13", "m14"],
    "application/x-msmetafile": ["*wmf", "*wmz", "*emf", "emz"],
    "application/x-msmoney": ["mny"],
    "application/x-mspublisher": ["pub"],
    "application/x-msschedule": ["scd"],
    "application/x-msterminal": ["trm"],
    "application/x-mswrite": ["wri"],
    "application/x-netcdf": ["nc", "cdf"],
    "application/x-ns-proxy-autoconfig": ["pac"],
    "application/x-nzb": ["nzb"],
    "application/x-perl": ["pl", "pm"],
    "application/x-pilot": ["*prc", "*pdb"],
    "application/x-pkcs12": ["p12", "pfx"],
    "application/x-pkcs7-certificates": ["p7b", "spc"],
    "application/x-pkcs7-certreqresp": ["p7r"],
    "application/x-rar-compressed": ["*rar"],
    "application/x-redhat-package-manager": ["rpm"],
    "application/x-research-info-systems": ["ris"],
    "application/x-sea": ["sea"],
    "application/x-sh": ["sh"],
    "application/x-shar": ["shar"],
    "application/x-shockwave-flash": ["swf"],
    "application/x-silverlight-app": ["xap"],
    "application/x-sql": ["sql"],
    "application/x-stuffit": ["sit"],
    "application/x-stuffitx": ["sitx"],
    "application/x-subrip": ["srt"],
    "application/x-sv4cpio": ["sv4cpio"],
    "application/x-sv4crc": ["sv4crc"],
    "application/x-t3vm-image": ["t3"],
    "application/x-tads": ["gam"],
    "application/x-tar": ["tar"],
    "application/x-tcl": ["tcl", "tk"],
    "application/x-tex": ["tex"],
    "application/x-tex-tfm": ["tfm"],
    "application/x-texinfo": ["texinfo", "texi"],
    "application/x-tgif": ["*obj"],
    "application/x-ustar": ["ustar"],
    "application/x-virtualbox-hdd": ["hdd"],
    "application/x-virtualbox-ova": ["ova"],
    "application/x-virtualbox-ovf": ["ovf"],
    "application/x-virtualbox-vbox": ["vbox"],
    "application/x-virtualbox-vbox-extpack": ["vbox-extpack"],
    "application/x-virtualbox-vdi": ["vdi"],
    "application/x-virtualbox-vhd": ["vhd"],
    "application/x-virtualbox-vmdk": ["vmdk"],
    "application/x-wais-source": ["src"],
    "application/x-web-app-manifest+json": ["webapp"],
    "application/x-x509-ca-cert": ["der", "crt", "pem"],
    "application/x-xfig": ["fig"],
    "application/x-xliff+xml": ["*xlf"],
    "application/x-xpinstall": ["xpi"],
    "application/x-xz": ["xz"],
    "application/x-zmachine": ["z1", "z2", "z3", "z4", "z5", "z6", "z7", "z8"],
    "audio/vnd.dece.audio": ["uva", "uvva"],
    "audio/vnd.digital-winds": ["eol"],
    "audio/vnd.dra": ["dra"],
    "audio/vnd.dts": ["dts"],
    "audio/vnd.dts.hd": ["dtshd"],
    "audio/vnd.lucent.voice": ["lvp"],
    "audio/vnd.ms-playready.media.pya": ["pya"],
    "audio/vnd.nuera.ecelp4800": ["ecelp4800"],
    "audio/vnd.nuera.ecelp7470": ["ecelp7470"],
    "audio/vnd.nuera.ecelp9600": ["ecelp9600"],
    "audio/vnd.rip": ["rip"],
    "audio/x-aac": ["aac"],
    "audio/x-aiff": ["aif", "aiff", "aifc"],
    "audio/x-caf": ["caf"],
    "audio/x-flac": ["flac"],
    "audio/x-m4a": ["*m4a"],
    "audio/x-matroska": ["mka"],
    "audio/x-mpegurl": ["m3u"],
    "audio/x-ms-wax": ["wax"],
    "audio/x-ms-wma": ["wma"],
    "audio/x-pn-realaudio": ["ram", "ra"],
    "audio/x-pn-realaudio-plugin": ["rmp"],
    "audio/x-realaudio": ["*ra"],
    "audio/x-wav": ["*wav"],
    "chemical/x-cdx": ["cdx"],
    "chemical/x-cif": ["cif"],
    "chemical/x-cmdf": ["cmdf"],
    "chemical/x-cml": ["cml"],
    "chemical/x-csml": ["csml"],
    "chemical/x-xyz": ["xyz"],
    "image/prs.btif": ["btif"],
    "image/prs.pti": ["pti"],
    "image/vnd.adobe.photoshop": ["psd"],
    "image/vnd.airzip.accelerator.azv": ["azv"],
    "image/vnd.dece.graphic": ["uvi", "uvvi", "uvg", "uvvg"],
    "image/vnd.djvu": ["djvu", "djv"],
    "image/vnd.dvb.subtitle": ["*sub"],
    "image/vnd.dwg": ["dwg"],
    "image/vnd.dxf": ["dxf"],
    "image/vnd.fastbidsheet": ["fbs"],
    "image/vnd.fpx": ["fpx"],
    "image/vnd.fst": ["fst"],
    "image/vnd.fujixerox.edmics-mmr": ["mmr"],
    "image/vnd.fujixerox.edmics-rlc": ["rlc"],
    "image/vnd.microsoft.icon": ["ico"],
    "image/vnd.ms-dds": ["dds"],
    "image/vnd.ms-modi": ["mdi"],
    "image/vnd.ms-photo": ["wdp"],
    "image/vnd.net-fpx": ["npx"],
    "image/vnd.pco.b16": ["b16"],
    "image/vnd.tencent.tap": ["tap"],
    "image/vnd.valve.source.texture": ["vtf"],
    "image/vnd.wap.wbmp": ["wbmp"],
    "image/vnd.xiff": ["xif"],
    "image/vnd.zbrush.pcx": ["pcx"],
    "image/x-3ds": ["3ds"],
    "image/x-cmu-raster": ["ras"],
    "image/x-cmx": ["cmx"],
    "image/x-freehand": ["fh", "fhc", "fh4", "fh5", "fh7"],
    "image/x-icon": ["*ico"],
    "image/x-jng": ["jng"],
    "image/x-mrsid-image": ["sid"],
    "image/x-ms-bmp": ["*bmp"],
    "image/x-pcx": ["*pcx"],
    "image/x-pict": ["pic", "pct"],
    "image/x-portable-anymap": ["pnm"],
    "image/x-portable-bitmap": ["pbm"],
    "image/x-portable-graymap": ["pgm"],
    "image/x-portable-pixmap": ["ppm"],
    "image/x-rgb": ["rgb"],
    "image/x-tga": ["tga"],
    "image/x-xbitmap": ["xbm"],
    "image/x-xpixmap": ["xpm"],
    "image/x-xwindowdump": ["xwd"],
    "message/vnd.wfa.wsc": ["wsc"],
    "model/vnd.collada+xml": ["dae"],
    "model/vnd.dwf": ["dwf"],
    "model/vnd.gdl": ["gdl"],
    "model/vnd.gtw": ["gtw"],
    "model/vnd.mts": ["mts"],
    "model/vnd.opengex": ["ogex"],
    "model/vnd.parasolid.transmit.binary": ["x_b"],
    "model/vnd.parasolid.transmit.text": ["x_t"],
    "model/vnd.sap.vds": ["vds"],
    "model/vnd.usdz+zip": ["usdz"],
    "model/vnd.valve.source.compiled-map": ["bsp"],
    "model/vnd.vtu": ["vtu"],
    "text/prs.lines.tag": ["dsc"],
    "text/vnd.curl": ["curl"],
    "text/vnd.curl.dcurl": ["dcurl"],
    "text/vnd.curl.mcurl": ["mcurl"],
    "text/vnd.curl.scurl": ["scurl"],
    "text/vnd.dvb.subtitle": ["sub"],
    "text/vnd.fly": ["fly"],
    "text/vnd.fmi.flexstor": ["flx"],
    "text/vnd.graphviz": ["gv"],
    "text/vnd.in3d.3dml": ["3dml"],
    "text/vnd.in3d.spot": ["spot"],
    "text/vnd.sun.j2me.app-descriptor": ["jad"],
    "text/vnd.wap.wml": ["wml"],
    "text/vnd.wap.wmlscript": ["wmls"],
    "text/x-asm": ["s", "asm"],
    "text/x-c": ["c", "cc", "cxx", "cpp", "h", "hh", "dic"],
    "text/x-component": ["htc"],
    "text/x-fortran": ["f", "for", "f77", "f90"],
    "text/x-handlebars-template": ["hbs"],
    "text/x-java-source": ["java"],
    "text/x-lua": ["lua"],
    "text/x-markdown": ["mkd"],
    "text/x-nfo": ["nfo"],
    "text/x-opml": ["opml"],
    "text/x-org": ["*org"],
    "text/x-pascal": ["p", "pas"],
    "text/x-processing": ["pde"],
    "text/x-sass": ["sass"],
    "text/x-scss": ["scss"],
    "text/x-setext": ["etx"],
    "text/x-sfv": ["sfv"],
    "text/x-suse-ymp": ["ymp"],
    "text/x-uuencode": ["uu"],
    "text/x-vcalendar": ["vcs"],
    "text/x-vcard": ["vcf"],
    "video/vnd.dece.hd": ["uvh", "uvvh"],
    "video/vnd.dece.mobile": ["uvm", "uvvm"],
    "video/vnd.dece.pd": ["uvp", "uvvp"],
    "video/vnd.dece.sd": ["uvs", "uvvs"],
    "video/vnd.dece.video": ["uvv", "uvvv"],
    "video/vnd.dvb.file": ["dvb"],
    "video/vnd.fvt": ["fvt"],
    "video/vnd.mpegurl": ["mxu", "m4u"],
    "video/vnd.ms-playready.media.pyv": ["pyv"],
    "video/vnd.uvvu.mp4": ["uvu", "uvvu"],
    "video/vnd.vivo": ["viv"],
    "video/x-f4v": ["f4v"],
    "video/x-fli": ["fli"],
    "video/x-flv": ["flv"],
    "video/x-m4v": ["m4v"],
    "video/x-matroska": ["mkv", "mk3d", "mks"],
    "video/x-mng": ["mng"],
    "video/x-ms-asf": ["asf", "asx"],
    "video/x-ms-vob": ["vob"],
    "video/x-ms-wm": ["wm"],
    "video/x-ms-wmv": ["wmv"],
    "video/x-ms-wmx": ["wmx"],
    "video/x-ms-wvx": ["wvx"],
    "video/x-msvideo": ["avi"],
    "video/x-sgi-movie": ["movie"],
    "video/x-smv": ["smv"],
    "x-conference/x-cooltalk": ["ice"],
};
exports.types = new Map();
exports.extensions = new Map();
const define = (typeMap, force) => {
    for (let type in typeMap) {
        let exts = typeMap[type].map(function (t) {
            return t.toLowerCase();
        });
        type = type.toLowerCase();
        for (let i = 0; i < exts.length; i++) {
            const ext = exts[i];
            if (ext[0] === "*") {
                continue;
            }
            if (!force && exports.types.has(ext)) {
                throw new Error('Attempt to change mapping for "' +
                    ext +
                    '" extension from "' +
                    exports.types.get(ext) +
                    '" to "' +
                    type +
                    '". Pass `force=true` to allow this, otherwise remove "' +
                    ext +
                    '" from the list of extensions for "' +
                    type +
                    '".');
            }
            exports.types.set(ext, type);
        }
        if (force || !exports.extensions.has(type)) {
            const ext = exts[0];
            exports.extensions.set(type, ext[0] !== "*" ? ext : ext.substr(1));
        }
    }
};
exports.define = define;
(0, exports.define)(standard);
(0, exports.define)(other);
const getType = (path) => {
    path = String(path);
    let last = path.replace(/^.*[/\\]/, "").toLowerCase();
    let ext = last.replace(/^.*\./, "").toLowerCase();
    let hasPath = last.length < path.length;
    let hasDot = ext.length < last.length - 1;
    return ((hasDot || !hasPath) && exports.types.get(ext)) || "application/octet-binary";
};
exports.getType = getType;
const getExtension = (type) => {
    // type = /^\s*([^;\s]*)/.test(type) && RegExp.$1;
    const t = /^\s*([^;\s]*)/.test(type);
    return (t && exports.extensions.get(type.toLowerCase())) || null;
};
exports.getExtension = getExtension;

},{}],33:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decode = exports.encode = void 0;
function encode(str) {
    return btoa(unescape(encodeURIComponent(str)));
}
exports.encode = encode;
function decode(base64) {
    return decodeURIComponent(escape(atob(base64)));
}
exports.decode = decode;
exports.default = {
    encode,
    decode,
};

},{}],34:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExtension = exports.sanitizeEmailPrefix = exports.replaceUndefined = exports.joinObjects = exports.removeNulls = exports.pathValueToObject = exports.assert = exports.Mime = void 0;
const ivipbase_core_1 = require("ivipbase-core");
__exportStar(require("./base64"), exports);
exports.Mime = __importStar(require("./Mime"));
/**
 * Substituição para console.assert, lança um erro se a condição não for atendida.
 * @param condition Condição 'truthy'
 * @param error Mensagem de erro opcional
 */
function assert(condition, error) {
    if (!condition) {
        throw new Error(`Asserção falhou: ${error !== null && error !== void 0 ? error : "verifique seu código"}`);
    }
}
exports.assert = assert;
function pathValueToObject(dataPath, currentPath, value) {
    const result = value;
    const pathInfo = ivipbase_core_1.PathInfo.get(dataPath);
    const currentPathInfo = ivipbase_core_1.PathInfo.get(currentPath);
    const currentKeys = currentPathInfo.pathKeys.slice(currentPathInfo.pathKeys.findIndex((k) => !pathInfo.pathKeys.includes(k)));
    for (let k of currentKeys) {
    }
    return result;
}
exports.pathValueToObject = pathValueToObject;
function removeNulls(obj) {
    if (obj === null || !["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(obj))) {
        return obj;
    }
    const result = Array.isArray(obj) ? [] : {};
    for (let prop in obj) {
        const val = obj[prop];
        if (val === null) {
            continue;
        }
        result[prop] = val;
        if (typeof val === "object") {
            result[prop] = removeNulls(val);
        }
    }
    return result;
}
exports.removeNulls = removeNulls;
function joinObjects(obj1, ...objs) {
    const merge = (obj1, obj2) => {
        if (!obj1 || !obj2) {
            return obj2 !== null && obj2 !== void 0 ? obj2 : obj1;
        }
        if (["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(obj1)) !== true ||
            ["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(obj2)) !== true) {
            return obj2;
        }
        const result = Array.isArray(obj1) ? [] : {};
        const keys = [...Object.keys(obj1), ...Object.keys(obj2)].filter((v, i, a) => a.indexOf(v) === i);
        for (let prop of keys) {
            result[prop] = merge(obj1[prop], obj2[prop]);
        }
        return result;
    };
    return objs.reduce((acc, obj) => merge(acc, obj), obj1);
}
exports.joinObjects = joinObjects;
function replaceUndefined(obj) {
    if (!obj || obj === null || typeof obj !== "object") {
        return obj !== null && obj !== void 0 ? obj : null;
    }
    const result = Array.isArray(obj) ? [] : {};
    for (let prop in obj) {
        const val = obj[prop];
        result[prop] = val === undefined ? null : val;
        if (typeof val === "object") {
            result[prop] = replaceUndefined(val);
        }
    }
    return result;
}
exports.replaceUndefined = replaceUndefined;
function sanitizeEmailPrefix(email) {
    // Divide a string de email em duas partes: antes e depois do @
    const [prefix, domain] = email.split("@");
    // Define o regex para os caracteres permitidos
    const allowedCharacters = /^[a-zA-Z0-9_.]+$/;
    // Filtra os caracteres da parte antes do @ que correspondem ao regex
    const sanitizedPrefix = prefix
        .split("")
        .filter((char) => allowedCharacters.test(char))
        .join("");
    return sanitizedPrefix;
}
exports.sanitizeEmailPrefix = sanitizeEmailPrefix;
const getExtension = (filename) => {
    try {
        const i = filename.lastIndexOf(".");
        return i < 0 ? "" : filename.substr(i);
    }
    catch (_a) {
        return "";
    }
};
exports.getExtension = getExtension;

},{"./Mime":32,"./base64":33,"ivipbase-core":99}],35:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const localStorage = window.localStorage;
exports.default = localStorage;

},{}],36:[function(require,module,exports){

/**
 * Expose `Emitter`.
 */

exports.Emitter = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
}

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  function on() {
    this.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks['$' + event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks['$' + event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }

  // Remove event specific arrays for event types that no
  // one is subscribed for to avoid memory leak.
  if (callbacks.length === 0) {
    delete this._callbacks['$' + event];
  }

  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};

  var args = new Array(arguments.length - 1)
    , callbacks = this._callbacks['$' + event];

  for (var i = 1; i < arguments.length; i++) {
    args[i - 1] = arguments[i];
  }

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

// alias used for reserved events (protected method)
Emitter.prototype.emitReserved = Emitter.prototype.emit;

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks['$' + event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],37:[function(require,module,exports){

},{}],38:[function(require,module,exports){
/**
 * cuid.js
 * Collision-resistant UID generator for browsers and node.
 * Sequential for fast db lookups and recency sorting.
 * Safe for element IDs and server-side lookups.
 *
 * Extracted from CLCTR
 *
 * Copyright (c) Eric Elliott 2012
 * MIT License
 */

var fingerprint = require('./lib/fingerprint.js');
var pad = require('./lib/pad.js');
var getRandomValue = require('./lib/getRandomValue.js');

var c = 0,
  blockSize = 4,
  base = 36,
  discreteValues = Math.pow(base, blockSize);

function randomBlock () {
  return pad((getRandomValue() *
    discreteValues << 0)
    .toString(base), blockSize);
}

function safeCounter () {
  c = c < discreteValues ? c : 0;
  c++; // this is not subliminal
  return c - 1;
}

function cuid () {
  // Starting with a lowercase letter makes
  // it HTML element ID friendly.
  var letter = 'c', // hard-coded allows for sequential access

    // timestamp
    // warning: this exposes the exact date and time
    // that the uid was created.
    timestamp = (new Date().getTime()).toString(base),

    // Prevent same-machine collisions.
    counter = pad(safeCounter().toString(base), blockSize),

    // A few chars to generate distinct ids for different
    // clients (so different computers are far less
    // likely to generate the same id)
    print = fingerprint(),

    // Grab some more chars from Math.random()
    random = randomBlock() + randomBlock();

  return letter + timestamp + counter + print + random;
}

cuid.slug = function slug () {
  var date = new Date().getTime().toString(36),
    counter = safeCounter().toString(36).slice(-4),
    print = fingerprint().slice(0, 1) +
      fingerprint().slice(-1),
    random = randomBlock().slice(-2);

  return date.slice(-2) +
    counter + print + random;
};

cuid.isCuid = function isCuid (stringToCheck) {
  if (typeof stringToCheck !== 'string') return false;
  if (stringToCheck.startsWith('c')) return true;
  return false;
};

cuid.isSlug = function isSlug (stringToCheck) {
  if (typeof stringToCheck !== 'string') return false;
  var stringLength = stringToCheck.length;
  if (stringLength >= 7 && stringLength <= 10) return true;
  return false;
};

cuid.fingerprint = fingerprint;

module.exports = cuid;

},{"./lib/fingerprint.js":39,"./lib/getRandomValue.js":40,"./lib/pad.js":41}],39:[function(require,module,exports){
var pad = require('./pad.js');

var env = typeof window === 'object' ? window : self;
var globalCount = Object.keys(env).length;
var mimeTypesLength = navigator.mimeTypes ? navigator.mimeTypes.length : 0;
var clientId = pad((mimeTypesLength +
  navigator.userAgent.length).toString(36) +
  globalCount.toString(36), 4);

module.exports = function fingerprint () {
  return clientId;
};

},{"./pad.js":41}],40:[function(require,module,exports){

var getRandomValue;

var crypto = typeof window !== 'undefined' &&
  (window.crypto || window.msCrypto) ||
  typeof self !== 'undefined' &&
  self.crypto;

if (crypto) {
    var lim = Math.pow(2, 32) - 1;
    getRandomValue = function () {
        return Math.abs(crypto.getRandomValues(new Uint32Array(1))[0] / lim);
    };
} else {
    getRandomValue = Math.random;
}

module.exports = getRandomValue;

},{}],41:[function(require,module,exports){
module.exports = function pad (num, size) {
  var s = '000000000' + num;
  return s.substr(s.length - size);
};

},{}],42:[function(require,module,exports){
(function (process){(function (){
/* eslint-env browser */

/**
 * This is the web browser implementation of `debug()`.
 */

exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = localstorage();
exports.destroy = (() => {
	let warned = false;

	return () => {
		if (!warned) {
			warned = true;
			console.warn('Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.');
		}
	};
})();

/**
 * Colors.
 */

exports.colors = [
	'#0000CC',
	'#0000FF',
	'#0033CC',
	'#0033FF',
	'#0066CC',
	'#0066FF',
	'#0099CC',
	'#0099FF',
	'#00CC00',
	'#00CC33',
	'#00CC66',
	'#00CC99',
	'#00CCCC',
	'#00CCFF',
	'#3300CC',
	'#3300FF',
	'#3333CC',
	'#3333FF',
	'#3366CC',
	'#3366FF',
	'#3399CC',
	'#3399FF',
	'#33CC00',
	'#33CC33',
	'#33CC66',
	'#33CC99',
	'#33CCCC',
	'#33CCFF',
	'#6600CC',
	'#6600FF',
	'#6633CC',
	'#6633FF',
	'#66CC00',
	'#66CC33',
	'#9900CC',
	'#9900FF',
	'#9933CC',
	'#9933FF',
	'#99CC00',
	'#99CC33',
	'#CC0000',
	'#CC0033',
	'#CC0066',
	'#CC0099',
	'#CC00CC',
	'#CC00FF',
	'#CC3300',
	'#CC3333',
	'#CC3366',
	'#CC3399',
	'#CC33CC',
	'#CC33FF',
	'#CC6600',
	'#CC6633',
	'#CC9900',
	'#CC9933',
	'#CCCC00',
	'#CCCC33',
	'#FF0000',
	'#FF0033',
	'#FF0066',
	'#FF0099',
	'#FF00CC',
	'#FF00FF',
	'#FF3300',
	'#FF3333',
	'#FF3366',
	'#FF3399',
	'#FF33CC',
	'#FF33FF',
	'#FF6600',
	'#FF6633',
	'#FF9900',
	'#FF9933',
	'#FFCC00',
	'#FFCC33'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

// eslint-disable-next-line complexity
function useColors() {
	// NB: In an Electron preload script, document will be defined but not fully
	// initialized. Since we know we're in Chrome, we'll just detect this case
	// explicitly
	if (typeof window !== 'undefined' && window.process && (window.process.type === 'renderer' || window.process.__nwjs)) {
		return true;
	}

	// Internet Explorer and Edge do not support colors.
	if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
		return false;
	}

	// Is webkit? http://stackoverflow.com/a/16459606/376773
	// document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
	return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
		// Is firebug? http://stackoverflow.com/a/398120/376773
		(typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
		// Is firefox >= v31?
		// https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
		// Double check webkit in userAgent just in case we are in a worker
		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
	args[0] = (this.useColors ? '%c' : '') +
		this.namespace +
		(this.useColors ? ' %c' : ' ') +
		args[0] +
		(this.useColors ? '%c ' : ' ') +
		'+' + module.exports.humanize(this.diff);

	if (!this.useColors) {
		return;
	}

	const c = 'color: ' + this.color;
	args.splice(1, 0, c, 'color: inherit');

	// The final "%c" is somewhat tricky, because there could be other
	// arguments passed either before or after the %c, so we need to
	// figure out the correct index to insert the CSS into
	let index = 0;
	let lastC = 0;
	args[0].replace(/%[a-zA-Z%]/g, match => {
		if (match === '%%') {
			return;
		}
		index++;
		if (match === '%c') {
			// We only are interested in the *last* %c
			// (the user may have provided their own)
			lastC = index;
		}
	});

	args.splice(lastC, 0, c);
}

/**
 * Invokes `console.debug()` when available.
 * No-op when `console.debug` is not a "function".
 * If `console.debug` is not available, falls back
 * to `console.log`.
 *
 * @api public
 */
exports.log = console.debug || console.log || (() => {});

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */
function save(namespaces) {
	try {
		if (namespaces) {
			exports.storage.setItem('debug', namespaces);
		} else {
			exports.storage.removeItem('debug');
		}
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */
function load() {
	let r;
	try {
		r = exports.storage.getItem('debug');
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}

	// If debug isn't set in LS, and we're in Electron, try to load $DEBUG
	if (!r && typeof process !== 'undefined' && 'env' in process) {
		r = process.env.DEBUG;
	}

	return r;
}

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
	try {
		// TVMLKit (Apple TV JS Runtime) does not have a window object, just localStorage in the global context
		// The Browser also has localStorage in the global context.
		return localStorage;
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}
}

module.exports = require('./common')(exports);

const {formatters} = module.exports;

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

formatters.j = function (v) {
	try {
		return JSON.stringify(v);
	} catch (error) {
		return '[UnexpectedJSONParseError]: ' + error.message;
	}
};

}).call(this)}).call(this,require('_process'))
},{"./common":43,"_process":102}],43:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 */

function setup(env) {
	createDebug.debug = createDebug;
	createDebug.default = createDebug;
	createDebug.coerce = coerce;
	createDebug.disable = disable;
	createDebug.enable = enable;
	createDebug.enabled = enabled;
	createDebug.humanize = require('ms');
	createDebug.destroy = destroy;

	Object.keys(env).forEach(key => {
		createDebug[key] = env[key];
	});

	/**
	* The currently active debug mode names, and names to skip.
	*/

	createDebug.names = [];
	createDebug.skips = [];

	/**
	* Map of special "%n" handling functions, for the debug "format" argument.
	*
	* Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
	*/
	createDebug.formatters = {};

	/**
	* Selects a color for a debug namespace
	* @param {String} namespace The namespace string for the debug instance to be colored
	* @return {Number|String} An ANSI color code for the given namespace
	* @api private
	*/
	function selectColor(namespace) {
		let hash = 0;

		for (let i = 0; i < namespace.length; i++) {
			hash = ((hash << 5) - hash) + namespace.charCodeAt(i);
			hash |= 0; // Convert to 32bit integer
		}

		return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
	}
	createDebug.selectColor = selectColor;

	/**
	* Create a debugger with the given `namespace`.
	*
	* @param {String} namespace
	* @return {Function}
	* @api public
	*/
	function createDebug(namespace) {
		let prevTime;
		let enableOverride = null;
		let namespacesCache;
		let enabledCache;

		function debug(...args) {
			// Disabled?
			if (!debug.enabled) {
				return;
			}

			const self = debug;

			// Set `diff` timestamp
			const curr = Number(new Date());
			const ms = curr - (prevTime || curr);
			self.diff = ms;
			self.prev = prevTime;
			self.curr = curr;
			prevTime = curr;

			args[0] = createDebug.coerce(args[0]);

			if (typeof args[0] !== 'string') {
				// Anything else let's inspect with %O
				args.unshift('%O');
			}

			// Apply any `formatters` transformations
			let index = 0;
			args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
				// If we encounter an escaped % then don't increase the array index
				if (match === '%%') {
					return '%';
				}
				index++;
				const formatter = createDebug.formatters[format];
				if (typeof formatter === 'function') {
					const val = args[index];
					match = formatter.call(self, val);

					// Now we need to remove `args[index]` since it's inlined in the `format`
					args.splice(index, 1);
					index--;
				}
				return match;
			});

			// Apply env-specific formatting (colors, etc.)
			createDebug.formatArgs.call(self, args);

			const logFn = self.log || createDebug.log;
			logFn.apply(self, args);
		}

		debug.namespace = namespace;
		debug.useColors = createDebug.useColors();
		debug.color = createDebug.selectColor(namespace);
		debug.extend = extend;
		debug.destroy = createDebug.destroy; // XXX Temporary. Will be removed in the next major release.

		Object.defineProperty(debug, 'enabled', {
			enumerable: true,
			configurable: false,
			get: () => {
				if (enableOverride !== null) {
					return enableOverride;
				}
				if (namespacesCache !== createDebug.namespaces) {
					namespacesCache = createDebug.namespaces;
					enabledCache = createDebug.enabled(namespace);
				}

				return enabledCache;
			},
			set: v => {
				enableOverride = v;
			}
		});

		// Env-specific initialization logic for debug instances
		if (typeof createDebug.init === 'function') {
			createDebug.init(debug);
		}

		return debug;
	}

	function extend(namespace, delimiter) {
		const newDebug = createDebug(this.namespace + (typeof delimiter === 'undefined' ? ':' : delimiter) + namespace);
		newDebug.log = this.log;
		return newDebug;
	}

	/**
	* Enables a debug mode by namespaces. This can include modes
	* separated by a colon and wildcards.
	*
	* @param {String} namespaces
	* @api public
	*/
	function enable(namespaces) {
		createDebug.save(namespaces);
		createDebug.namespaces = namespaces;

		createDebug.names = [];
		createDebug.skips = [];

		let i;
		const split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
		const len = split.length;

		for (i = 0; i < len; i++) {
			if (!split[i]) {
				// ignore empty strings
				continue;
			}

			namespaces = split[i].replace(/\*/g, '.*?');

			if (namespaces[0] === '-') {
				createDebug.skips.push(new RegExp('^' + namespaces.slice(1) + '$'));
			} else {
				createDebug.names.push(new RegExp('^' + namespaces + '$'));
			}
		}
	}

	/**
	* Disable debug output.
	*
	* @return {String} namespaces
	* @api public
	*/
	function disable() {
		const namespaces = [
			...createDebug.names.map(toNamespace),
			...createDebug.skips.map(toNamespace).map(namespace => '-' + namespace)
		].join(',');
		createDebug.enable('');
		return namespaces;
	}

	/**
	* Returns true if the given mode name is enabled, false otherwise.
	*
	* @param {String} name
	* @return {Boolean}
	* @api public
	*/
	function enabled(name) {
		if (name[name.length - 1] === '*') {
			return true;
		}

		let i;
		let len;

		for (i = 0, len = createDebug.skips.length; i < len; i++) {
			if (createDebug.skips[i].test(name)) {
				return false;
			}
		}

		for (i = 0, len = createDebug.names.length; i < len; i++) {
			if (createDebug.names[i].test(name)) {
				return true;
			}
		}

		return false;
	}

	/**
	* Convert regexp to namespace
	*
	* @param {RegExp} regxep
	* @return {String} namespace
	* @api private
	*/
	function toNamespace(regexp) {
		return regexp.toString()
			.substring(2, regexp.toString().length - 2)
			.replace(/\.\*\?$/, '*');
	}

	/**
	* Coerce `val`.
	*
	* @param {Mixed} val
	* @return {Mixed}
	* @api private
	*/
	function coerce(val) {
		if (val instanceof Error) {
			return val.stack || val.message;
		}
		return val;
	}

	/**
	* XXX DO NOT USE. This is a temporary stub function.
	* XXX It WILL be removed in the next major release.
	*/
	function destroy() {
		console.warn('Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.');
	}

	createDebug.enable(createDebug.load());

	return createDebug;
}

module.exports = setup;

},{"ms":101}],44:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasCORS = void 0;
// imported from https://github.com/component/has-cors
let value = false;
try {
    value = typeof XMLHttpRequest !== 'undefined' &&
        'withCredentials' in new XMLHttpRequest();
}
catch (err) {
    // if XMLHttp support is disabled in IE then it will throw
    // when trying to create
}
exports.hasCORS = value;

},{}],45:[function(require,module,exports){
"use strict";
// imported from https://github.com/galkn/querystring
/**
 * Compiles a querystring
 * Returns string representation of the object
 *
 * @param {Object}
 * @api private
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.decode = exports.encode = void 0;
function encode(obj) {
    let str = '';
    for (let i in obj) {
        if (obj.hasOwnProperty(i)) {
            if (str.length)
                str += '&';
            str += encodeURIComponent(i) + '=' + encodeURIComponent(obj[i]);
        }
    }
    return str;
}
exports.encode = encode;
/**
 * Parses a simple querystring into an object
 *
 * @param {String} qs
 * @api private
 */
function decode(qs) {
    let qry = {};
    let pairs = qs.split('&');
    for (let i = 0, l = pairs.length; i < l; i++) {
        let pair = pairs[i].split('=');
        qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
    return qry;
}
exports.decode = decode;

},{}],46:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = void 0;
// imported from https://github.com/galkn/parseuri
/**
 * Parses a URI
 *
 * Note: we could also have used the built-in URL object, but it isn't supported on all platforms.
 *
 * See:
 * - https://developer.mozilla.org/en-US/docs/Web/API/URL
 * - https://caniuse.com/url
 * - https://www.rfc-editor.org/rfc/rfc3986#appendix-B
 *
 * History of the parse() method:
 * - first commit: https://github.com/socketio/socket.io-client/commit/4ee1d5d94b3906a9c052b459f1a818b15f38f91c
 * - export into its own module: https://github.com/socketio/engine.io-client/commit/de2c561e4564efeb78f1bdb1ba39ef81b2822cb3
 * - reimport: https://github.com/socketio/engine.io-client/commit/df32277c3f6d622eec5ed09f493cae3f3391d242
 *
 * @author Steven Levithan <stevenlevithan.com> (MIT license)
 * @api private
 */
const re = /^(?:(?![^:@\/?#]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@\/?#]*)(?::([^:@\/?#]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
const parts = [
    'source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'
];
function parse(str) {
    if (str.length > 2000) {
        throw "URI too long";
    }
    const src = str, b = str.indexOf('['), e = str.indexOf(']');
    if (b != -1 && e != -1) {
        str = str.substring(0, b) + str.substring(b, e).replace(/:/g, ';') + str.substring(e, str.length);
    }
    let m = re.exec(str || ''), uri = {}, i = 14;
    while (i--) {
        uri[parts[i]] = m[i] || '';
    }
    if (b != -1 && e != -1) {
        uri.source = src;
        uri.host = uri.host.substring(1, uri.host.length - 1).replace(/;/g, ':');
        uri.authority = uri.authority.replace('[', '').replace(']', '').replace(/;/g, ':');
        uri.ipv6uri = true;
    }
    uri.pathNames = pathNames(uri, uri['path']);
    uri.queryKey = queryKey(uri, uri['query']);
    return uri;
}
exports.parse = parse;
function pathNames(obj, path) {
    const regx = /\/{2,9}/g, names = path.replace(regx, "/").split("/");
    if (path.slice(0, 1) == '/' || path.length === 0) {
        names.splice(0, 1);
    }
    if (path.slice(-1) == '/') {
        names.splice(names.length - 1, 1);
    }
    return names;
}
function queryKey(uri, query) {
    const data = {};
    query.replace(/(?:^|&)([^&=]*)=?([^&]*)/g, function ($0, $1, $2) {
        if ($1) {
            data[$1] = $2;
        }
    });
    return data;
}

},{}],47:[function(require,module,exports){
// imported from https://github.com/unshiftio/yeast
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.yeast = exports.decode = exports.encode = void 0;
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'.split(''), length = 64, map = {};
let seed = 0, i = 0, prev;
/**
 * Return a string representing the specified number.
 *
 * @param {Number} num The number to convert.
 * @returns {String} The string representation of the number.
 * @api public
 */
function encode(num) {
    let encoded = '';
    do {
        encoded = alphabet[num % length] + encoded;
        num = Math.floor(num / length);
    } while (num > 0);
    return encoded;
}
exports.encode = encode;
/**
 * Return the integer value specified by the given string.
 *
 * @param {String} str The string to convert.
 * @returns {Number} The integer value represented by the string.
 * @api public
 */
function decode(str) {
    let decoded = 0;
    for (i = 0; i < str.length; i++) {
        decoded = decoded * length + map[str.charAt(i)];
    }
    return decoded;
}
exports.decode = decode;
/**
 * Yeast: A tiny growing id generator.
 *
 * @returns {String} A unique id.
 * @api public
 */
function yeast() {
    const now = encode(+new Date());
    if (now !== prev)
        return seed = 0, prev = now;
    return now + '.' + encode(seed++);
}
exports.yeast = yeast;
//
// Map each character to its index.
//
for (; i < length; i++)
    map[alphabet[i]] = i;

},{}],48:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalThisShim = void 0;
exports.globalThisShim = (() => {
    if (typeof self !== "undefined") {
        return self;
    }
    else if (typeof window !== "undefined") {
        return window;
    }
    else {
        return Function("return this")();
    }
})();

},{}],49:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextTick = exports.parse = exports.installTimerFunctions = exports.transports = exports.TransportError = exports.Transport = exports.protocol = exports.Socket = void 0;
const socket_js_1 = require("./socket.js");
Object.defineProperty(exports, "Socket", { enumerable: true, get: function () { return socket_js_1.Socket; } });
exports.protocol = socket_js_1.Socket.protocol;
var transport_js_1 = require("./transport.js");
Object.defineProperty(exports, "Transport", { enumerable: true, get: function () { return transport_js_1.Transport; } });
Object.defineProperty(exports, "TransportError", { enumerable: true, get: function () { return transport_js_1.TransportError; } });
var index_js_1 = require("./transports/index.js");
Object.defineProperty(exports, "transports", { enumerable: true, get: function () { return index_js_1.transports; } });
var util_js_1 = require("./util.js");
Object.defineProperty(exports, "installTimerFunctions", { enumerable: true, get: function () { return util_js_1.installTimerFunctions; } });
var parseuri_js_1 = require("./contrib/parseuri.js");
Object.defineProperty(exports, "parse", { enumerable: true, get: function () { return parseuri_js_1.parse; } });
var websocket_constructor_js_1 = require("./transports/websocket-constructor.js");
Object.defineProperty(exports, "nextTick", { enumerable: true, get: function () { return websocket_constructor_js_1.nextTick; } });

},{"./contrib/parseuri.js":46,"./socket.js":50,"./transport.js":51,"./transports/index.js":52,"./transports/websocket-constructor.js":54,"./util.js":58}],50:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Socket = void 0;
const index_js_1 = require("./transports/index.js");
const util_js_1 = require("./util.js");
const parseqs_js_1 = require("./contrib/parseqs.js");
const parseuri_js_1 = require("./contrib/parseuri.js");
const debug_1 = __importDefault(require("debug")); // debug()
const component_emitter_1 = require("@socket.io/component-emitter");
const engine_io_parser_1 = require("engine.io-parser");
const websocket_constructor_js_1 = require("./transports/websocket-constructor.js");
const debug = (0, debug_1.default)("engine.io-client:socket"); // debug()
class Socket extends component_emitter_1.Emitter {
    /**
     * Socket constructor.
     *
     * @param {String|Object} uri - uri or options
     * @param {Object} opts - options
     */
    constructor(uri, opts = {}) {
        super();
        this.binaryType = websocket_constructor_js_1.defaultBinaryType;
        this.writeBuffer = [];
        if (uri && "object" === typeof uri) {
            opts = uri;
            uri = null;
        }
        if (uri) {
            uri = (0, parseuri_js_1.parse)(uri);
            opts.hostname = uri.host;
            opts.secure = uri.protocol === "https" || uri.protocol === "wss";
            opts.port = uri.port;
            if (uri.query)
                opts.query = uri.query;
        }
        else if (opts.host) {
            opts.hostname = (0, parseuri_js_1.parse)(opts.host).host;
        }
        (0, util_js_1.installTimerFunctions)(this, opts);
        this.secure =
            null != opts.secure
                ? opts.secure
                : typeof location !== "undefined" && "https:" === location.protocol;
        if (opts.hostname && !opts.port) {
            // if no port is specified manually, use the protocol default
            opts.port = this.secure ? "443" : "80";
        }
        this.hostname =
            opts.hostname ||
                (typeof location !== "undefined" ? location.hostname : "localhost");
        this.port =
            opts.port ||
                (typeof location !== "undefined" && location.port
                    ? location.port
                    : this.secure
                        ? "443"
                        : "80");
        this.transports = opts.transports || [
            "polling",
            "websocket",
            "webtransport",
        ];
        this.writeBuffer = [];
        this.prevBufferLen = 0;
        this.opts = Object.assign({
            path: "/engine.io",
            agent: false,
            withCredentials: false,
            upgrade: true,
            timestampParam: "t",
            rememberUpgrade: false,
            addTrailingSlash: true,
            rejectUnauthorized: true,
            perMessageDeflate: {
                threshold: 1024,
            },
            transportOptions: {},
            closeOnBeforeunload: false,
        }, opts);
        this.opts.path =
            this.opts.path.replace(/\/$/, "") +
                (this.opts.addTrailingSlash ? "/" : "");
        if (typeof this.opts.query === "string") {
            this.opts.query = (0, parseqs_js_1.decode)(this.opts.query);
        }
        // set on handshake
        this.id = null;
        this.upgrades = null;
        this.pingInterval = null;
        this.pingTimeout = null;
        // set on heartbeat
        this.pingTimeoutTimer = null;
        if (typeof addEventListener === "function") {
            if (this.opts.closeOnBeforeunload) {
                // Firefox closes the connection when the "beforeunload" event is emitted but not Chrome. This event listener
                // ensures every browser behaves the same (no "disconnect" event at the Socket.IO level when the page is
                // closed/reloaded)
                this.beforeunloadEventListener = () => {
                    if (this.transport) {
                        // silently close the transport
                        this.transport.removeAllListeners();
                        this.transport.close();
                    }
                };
                addEventListener("beforeunload", this.beforeunloadEventListener, false);
            }
            if (this.hostname !== "localhost") {
                this.offlineEventListener = () => {
                    this.onClose("transport close", {
                        description: "network connection lost",
                    });
                };
                addEventListener("offline", this.offlineEventListener, false);
            }
        }
        this.open();
    }
    /**
     * Creates transport of the given type.
     *
     * @param {String} name - transport name
     * @return {Transport}
     * @private
     */
    createTransport(name) {
        debug('creating transport "%s"', name);
        const query = Object.assign({}, this.opts.query);
        // append engine.io protocol identifier
        query.EIO = engine_io_parser_1.protocol;
        // transport name
        query.transport = name;
        // session id if we already have one
        if (this.id)
            query.sid = this.id;
        const opts = Object.assign({}, this.opts, {
            query,
            socket: this,
            hostname: this.hostname,
            secure: this.secure,
            port: this.port,
        }, this.opts.transportOptions[name]);
        debug("options: %j", opts);
        return new index_js_1.transports[name](opts);
    }
    /**
     * Initializes transport to use and starts probe.
     *
     * @private
     */
    open() {
        let transport;
        if (this.opts.rememberUpgrade &&
            Socket.priorWebsocketSuccess &&
            this.transports.indexOf("websocket") !== -1) {
            transport = "websocket";
        }
        else if (0 === this.transports.length) {
            // Emit error on next tick so it can be listened to
            this.setTimeoutFn(() => {
                this.emitReserved("error", "No transports available");
            }, 0);
            return;
        }
        else {
            transport = this.transports[0];
        }
        this.readyState = "opening";
        // Retry with the next transport if the transport is disabled (jsonp: false)
        try {
            transport = this.createTransport(transport);
        }
        catch (e) {
            debug("error while creating transport: %s", e);
            this.transports.shift();
            this.open();
            return;
        }
        transport.open();
        this.setTransport(transport);
    }
    /**
     * Sets the current transport. Disables the existing one (if any).
     *
     * @private
     */
    setTransport(transport) {
        debug("setting transport %s", transport.name);
        if (this.transport) {
            debug("clearing existing transport %s", this.transport.name);
            this.transport.removeAllListeners();
        }
        // set up transport
        this.transport = transport;
        // set up transport listeners
        transport
            .on("drain", this.onDrain.bind(this))
            .on("packet", this.onPacket.bind(this))
            .on("error", this.onError.bind(this))
            .on("close", (reason) => this.onClose("transport close", reason));
    }
    /**
     * Probes a transport.
     *
     * @param {String} name - transport name
     * @private
     */
    probe(name) {
        debug('probing transport "%s"', name);
        let transport = this.createTransport(name);
        let failed = false;
        Socket.priorWebsocketSuccess = false;
        const onTransportOpen = () => {
            if (failed)
                return;
            debug('probe transport "%s" opened', name);
            transport.send([{ type: "ping", data: "probe" }]);
            transport.once("packet", (msg) => {
                if (failed)
                    return;
                if ("pong" === msg.type && "probe" === msg.data) {
                    debug('probe transport "%s" pong', name);
                    this.upgrading = true;
                    this.emitReserved("upgrading", transport);
                    if (!transport)
                        return;
                    Socket.priorWebsocketSuccess = "websocket" === transport.name;
                    debug('pausing current transport "%s"', this.transport.name);
                    this.transport.pause(() => {
                        if (failed)
                            return;
                        if ("closed" === this.readyState)
                            return;
                        debug("changing transport and sending upgrade packet");
                        cleanup();
                        this.setTransport(transport);
                        transport.send([{ type: "upgrade" }]);
                        this.emitReserved("upgrade", transport);
                        transport = null;
                        this.upgrading = false;
                        this.flush();
                    });
                }
                else {
                    debug('probe transport "%s" failed', name);
                    const err = new Error("probe error");
                    // @ts-ignore
                    err.transport = transport.name;
                    this.emitReserved("upgradeError", err);
                }
            });
        };
        function freezeTransport() {
            if (failed)
                return;
            // Any callback called by transport should be ignored since now
            failed = true;
            cleanup();
            transport.close();
            transport = null;
        }
        // Handle any error that happens while probing
        const onerror = (err) => {
            const error = new Error("probe error: " + err);
            // @ts-ignore
            error.transport = transport.name;
            freezeTransport();
            debug('probe transport "%s" failed because of error: %s', name, err);
            this.emitReserved("upgradeError", error);
        };
        function onTransportClose() {
            onerror("transport closed");
        }
        // When the socket is closed while we're probing
        function onclose() {
            onerror("socket closed");
        }
        // When the socket is upgraded while we're probing
        function onupgrade(to) {
            if (transport && to.name !== transport.name) {
                debug('"%s" works - aborting "%s"', to.name, transport.name);
                freezeTransport();
            }
        }
        // Remove all listeners on the transport and on self
        const cleanup = () => {
            transport.removeListener("open", onTransportOpen);
            transport.removeListener("error", onerror);
            transport.removeListener("close", onTransportClose);
            this.off("close", onclose);
            this.off("upgrading", onupgrade);
        };
        transport.once("open", onTransportOpen);
        transport.once("error", onerror);
        transport.once("close", onTransportClose);
        this.once("close", onclose);
        this.once("upgrading", onupgrade);
        if (this.upgrades.indexOf("webtransport") !== -1 &&
            name !== "webtransport") {
            // favor WebTransport
            this.setTimeoutFn(() => {
                if (!failed) {
                    transport.open();
                }
            }, 200);
        }
        else {
            transport.open();
        }
    }
    /**
     * Called when connection is deemed open.
     *
     * @private
     */
    onOpen() {
        debug("socket open");
        this.readyState = "open";
        Socket.priorWebsocketSuccess = "websocket" === this.transport.name;
        this.emitReserved("open");
        this.flush();
        // we check for `readyState` in case an `open`
        // listener already closed the socket
        if ("open" === this.readyState && this.opts.upgrade) {
            debug("starting upgrade probes");
            let i = 0;
            const l = this.upgrades.length;
            for (; i < l; i++) {
                this.probe(this.upgrades[i]);
            }
        }
    }
    /**
     * Handles a packet.
     *
     * @private
     */
    onPacket(packet) {
        if ("opening" === this.readyState ||
            "open" === this.readyState ||
            "closing" === this.readyState) {
            debug('socket receive: type "%s", data "%s"', packet.type, packet.data);
            this.emitReserved("packet", packet);
            // Socket is live - any packet counts
            this.emitReserved("heartbeat");
            this.resetPingTimeout();
            switch (packet.type) {
                case "open":
                    this.onHandshake(JSON.parse(packet.data));
                    break;
                case "ping":
                    this.sendPacket("pong");
                    this.emitReserved("ping");
                    this.emitReserved("pong");
                    break;
                case "error":
                    const err = new Error("server error");
                    // @ts-ignore
                    err.code = packet.data;
                    this.onError(err);
                    break;
                case "message":
                    this.emitReserved("data", packet.data);
                    this.emitReserved("message", packet.data);
                    break;
            }
        }
        else {
            debug('packet received with socket readyState "%s"', this.readyState);
        }
    }
    /**
     * Called upon handshake completion.
     *
     * @param {Object} data - handshake obj
     * @private
     */
    onHandshake(data) {
        this.emitReserved("handshake", data);
        this.id = data.sid;
        this.transport.query.sid = data.sid;
        this.upgrades = this.filterUpgrades(data.upgrades);
        this.pingInterval = data.pingInterval;
        this.pingTimeout = data.pingTimeout;
        this.maxPayload = data.maxPayload;
        this.onOpen();
        // In case open handler closes socket
        if ("closed" === this.readyState)
            return;
        this.resetPingTimeout();
    }
    /**
     * Sets and resets ping timeout timer based on server pings.
     *
     * @private
     */
    resetPingTimeout() {
        this.clearTimeoutFn(this.pingTimeoutTimer);
        this.pingTimeoutTimer = this.setTimeoutFn(() => {
            this.onClose("ping timeout");
        }, this.pingInterval + this.pingTimeout);
        if (this.opts.autoUnref) {
            this.pingTimeoutTimer.unref();
        }
    }
    /**
     * Called on `drain` event
     *
     * @private
     */
    onDrain() {
        this.writeBuffer.splice(0, this.prevBufferLen);
        // setting prevBufferLen = 0 is very important
        // for example, when upgrading, upgrade packet is sent over,
        // and a nonzero prevBufferLen could cause problems on `drain`
        this.prevBufferLen = 0;
        if (0 === this.writeBuffer.length) {
            this.emitReserved("drain");
        }
        else {
            this.flush();
        }
    }
    /**
     * Flush write buffers.
     *
     * @private
     */
    flush() {
        if ("closed" !== this.readyState &&
            this.transport.writable &&
            !this.upgrading &&
            this.writeBuffer.length) {
            const packets = this.getWritablePackets();
            debug("flushing %d packets in socket", packets.length);
            this.transport.send(packets);
            // keep track of current length of writeBuffer
            // splice writeBuffer and callbackBuffer on `drain`
            this.prevBufferLen = packets.length;
            this.emitReserved("flush");
        }
    }
    /**
     * Ensure the encoded size of the writeBuffer is below the maxPayload value sent by the server (only for HTTP
     * long-polling)
     *
     * @private
     */
    getWritablePackets() {
        const shouldCheckPayloadSize = this.maxPayload &&
            this.transport.name === "polling" &&
            this.writeBuffer.length > 1;
        if (!shouldCheckPayloadSize) {
            return this.writeBuffer;
        }
        let payloadSize = 1; // first packet type
        for (let i = 0; i < this.writeBuffer.length; i++) {
            const data = this.writeBuffer[i].data;
            if (data) {
                payloadSize += (0, util_js_1.byteLength)(data);
            }
            if (i > 0 && payloadSize > this.maxPayload) {
                debug("only send %d out of %d packets", i, this.writeBuffer.length);
                return this.writeBuffer.slice(0, i);
            }
            payloadSize += 2; // separator + packet type
        }
        debug("payload size is %d (max: %d)", payloadSize, this.maxPayload);
        return this.writeBuffer;
    }
    /**
     * Sends a message.
     *
     * @param {String} msg - message.
     * @param {Object} options.
     * @param {Function} callback function.
     * @return {Socket} for chaining.
     */
    write(msg, options, fn) {
        this.sendPacket("message", msg, options, fn);
        return this;
    }
    send(msg, options, fn) {
        this.sendPacket("message", msg, options, fn);
        return this;
    }
    /**
     * Sends a packet.
     *
     * @param {String} type: packet type.
     * @param {String} data.
     * @param {Object} options.
     * @param {Function} fn - callback function.
     * @private
     */
    sendPacket(type, data, options, fn) {
        if ("function" === typeof data) {
            fn = data;
            data = undefined;
        }
        if ("function" === typeof options) {
            fn = options;
            options = null;
        }
        if ("closing" === this.readyState || "closed" === this.readyState) {
            return;
        }
        options = options || {};
        options.compress = false !== options.compress;
        const packet = {
            type: type,
            data: data,
            options: options,
        };
        this.emitReserved("packetCreate", packet);
        this.writeBuffer.push(packet);
        if (fn)
            this.once("flush", fn);
        this.flush();
    }
    /**
     * Closes the connection.
     */
    close() {
        const close = () => {
            this.onClose("forced close");
            debug("socket closing - telling transport to close");
            this.transport.close();
        };
        const cleanupAndClose = () => {
            this.off("upgrade", cleanupAndClose);
            this.off("upgradeError", cleanupAndClose);
            close();
        };
        const waitForUpgrade = () => {
            // wait for upgrade to finish since we can't send packets while pausing a transport
            this.once("upgrade", cleanupAndClose);
            this.once("upgradeError", cleanupAndClose);
        };
        if ("opening" === this.readyState || "open" === this.readyState) {
            this.readyState = "closing";
            if (this.writeBuffer.length) {
                this.once("drain", () => {
                    if (this.upgrading) {
                        waitForUpgrade();
                    }
                    else {
                        close();
                    }
                });
            }
            else if (this.upgrading) {
                waitForUpgrade();
            }
            else {
                close();
            }
        }
        return this;
    }
    /**
     * Called upon transport error
     *
     * @private
     */
    onError(err) {
        debug("socket error %j", err);
        Socket.priorWebsocketSuccess = false;
        this.emitReserved("error", err);
        this.onClose("transport error", err);
    }
    /**
     * Called upon transport close.
     *
     * @private
     */
    onClose(reason, description) {
        if ("opening" === this.readyState ||
            "open" === this.readyState ||
            "closing" === this.readyState) {
            debug('socket close with reason: "%s"', reason);
            // clear timers
            this.clearTimeoutFn(this.pingTimeoutTimer);
            // stop event from firing again for transport
            this.transport.removeAllListeners("close");
            // ensure transport won't stay open
            this.transport.close();
            // ignore further transport communication
            this.transport.removeAllListeners();
            if (typeof removeEventListener === "function") {
                removeEventListener("beforeunload", this.beforeunloadEventListener, false);
                removeEventListener("offline", this.offlineEventListener, false);
            }
            // set ready state
            this.readyState = "closed";
            // clear session id
            this.id = null;
            // emit close event
            this.emitReserved("close", reason, description);
            // clean buffers after, so users can still
            // grab the buffers on `close` event
            this.writeBuffer = [];
            this.prevBufferLen = 0;
        }
    }
    /**
     * Filters upgrades, returning only those matching client transports.
     *
     * @param {Array} upgrades - server upgrades
     * @private
     */
    filterUpgrades(upgrades) {
        const filteredUpgrades = [];
        let i = 0;
        const j = upgrades.length;
        for (; i < j; i++) {
            if (~this.transports.indexOf(upgrades[i]))
                filteredUpgrades.push(upgrades[i]);
        }
        return filteredUpgrades;
    }
}
exports.Socket = Socket;
Socket.protocol = engine_io_parser_1.protocol;

},{"./contrib/parseqs.js":45,"./contrib/parseuri.js":46,"./transports/index.js":52,"./transports/websocket-constructor.js":54,"./util.js":58,"@socket.io/component-emitter":36,"debug":42,"engine.io-parser":63}],51:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transport = exports.TransportError = void 0;
const engine_io_parser_1 = require("engine.io-parser");
const component_emitter_1 = require("@socket.io/component-emitter");
const util_js_1 = require("./util.js");
const debug_1 = __importDefault(require("debug")); // debug()
const parseqs_js_1 = require("./contrib/parseqs.js");
const debug = (0, debug_1.default)("engine.io-client:transport"); // debug()
class TransportError extends Error {
    constructor(reason, description, context) {
        super(reason);
        this.description = description;
        this.context = context;
        this.type = "TransportError";
    }
}
exports.TransportError = TransportError;
class Transport extends component_emitter_1.Emitter {
    /**
     * Transport abstract constructor.
     *
     * @param {Object} opts - options
     * @protected
     */
    constructor(opts) {
        super();
        this.writable = false;
        (0, util_js_1.installTimerFunctions)(this, opts);
        this.opts = opts;
        this.query = opts.query;
        this.socket = opts.socket;
    }
    /**
     * Emits an error.
     *
     * @param {String} reason
     * @param description
     * @param context - the error context
     * @return {Transport} for chaining
     * @protected
     */
    onError(reason, description, context) {
        super.emitReserved("error", new TransportError(reason, description, context));
        return this;
    }
    /**
     * Opens the transport.
     */
    open() {
        this.readyState = "opening";
        this.doOpen();
        return this;
    }
    /**
     * Closes the transport.
     */
    close() {
        if (this.readyState === "opening" || this.readyState === "open") {
            this.doClose();
            this.onClose();
        }
        return this;
    }
    /**
     * Sends multiple packets.
     *
     * @param {Array} packets
     */
    send(packets) {
        if (this.readyState === "open") {
            this.write(packets);
        }
        else {
            // this might happen if the transport was silently closed in the beforeunload event handler
            debug("transport is not open, discarding packets");
        }
    }
    /**
     * Called upon open
     *
     * @protected
     */
    onOpen() {
        this.readyState = "open";
        this.writable = true;
        super.emitReserved("open");
    }
    /**
     * Called with data.
     *
     * @param {String} data
     * @protected
     */
    onData(data) {
        const packet = (0, engine_io_parser_1.decodePacket)(data, this.socket.binaryType);
        this.onPacket(packet);
    }
    /**
     * Called with a decoded packet.
     *
     * @protected
     */
    onPacket(packet) {
        super.emitReserved("packet", packet);
    }
    /**
     * Called upon close.
     *
     * @protected
     */
    onClose(details) {
        this.readyState = "closed";
        super.emitReserved("close", details);
    }
    /**
     * Pauses the transport, in order not to lose packets during an upgrade.
     *
     * @param onPause
     */
    pause(onPause) { }
    createUri(schema, query = {}) {
        return (schema +
            "://" +
            this._hostname() +
            this._port() +
            this.opts.path +
            this._query(query));
    }
    _hostname() {
        const hostname = this.opts.hostname;
        return hostname.indexOf(":") === -1 ? hostname : "[" + hostname + "]";
    }
    _port() {
        if (this.opts.port &&
            ((this.opts.secure && Number(this.opts.port !== 443)) ||
                (!this.opts.secure && Number(this.opts.port) !== 80))) {
            return ":" + this.opts.port;
        }
        else {
            return "";
        }
    }
    _query(query) {
        const encodedQuery = (0, parseqs_js_1.encode)(query);
        return encodedQuery.length ? "?" + encodedQuery : "";
    }
}
exports.Transport = Transport;

},{"./contrib/parseqs.js":45,"./util.js":58,"@socket.io/component-emitter":36,"debug":42,"engine.io-parser":63}],52:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transports = void 0;
const polling_js_1 = require("./polling.js");
const websocket_js_1 = require("./websocket.js");
const webtransport_js_1 = require("./webtransport.js");
exports.transports = {
    websocket: websocket_js_1.WS,
    webtransport: webtransport_js_1.WT,
    polling: polling_js_1.Polling,
};

},{"./polling.js":53,"./websocket.js":55,"./webtransport.js":56}],53:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Request = exports.Polling = void 0;
const transport_js_1 = require("../transport.js");
const debug_1 = __importDefault(require("debug")); // debug()
const yeast_js_1 = require("../contrib/yeast.js");
const engine_io_parser_1 = require("engine.io-parser");
const xmlhttprequest_js_1 = require("./xmlhttprequest.js");
const component_emitter_1 = require("@socket.io/component-emitter");
const util_js_1 = require("../util.js");
const globalThis_js_1 = require("../globalThis.js");
const debug = (0, debug_1.default)("engine.io-client:polling"); // debug()
function empty() { }
const hasXHR2 = (function () {
    const xhr = new xmlhttprequest_js_1.XHR({
        xdomain: false,
    });
    return null != xhr.responseType;
})();
class Polling extends transport_js_1.Transport {
    /**
     * XHR Polling constructor.
     *
     * @param {Object} opts
     * @package
     */
    constructor(opts) {
        super(opts);
        this.polling = false;
        if (typeof location !== "undefined") {
            const isSSL = "https:" === location.protocol;
            let port = location.port;
            // some user agents have empty `location.port`
            if (!port) {
                port = isSSL ? "443" : "80";
            }
            this.xd =
                (typeof location !== "undefined" &&
                    opts.hostname !== location.hostname) ||
                    port !== opts.port;
        }
        /**
         * XHR supports binary
         */
        const forceBase64 = opts && opts.forceBase64;
        this.supportsBinary = hasXHR2 && !forceBase64;
        if (this.opts.withCredentials) {
            this.cookieJar = (0, xmlhttprequest_js_1.createCookieJar)();
        }
    }
    get name() {
        return "polling";
    }
    /**
     * Opens the socket (triggers polling). We write a PING message to determine
     * when the transport is open.
     *
     * @protected
     */
    doOpen() {
        this.poll();
    }
    /**
     * Pauses polling.
     *
     * @param {Function} onPause - callback upon buffers are flushed and transport is paused
     * @package
     */
    pause(onPause) {
        this.readyState = "pausing";
        const pause = () => {
            debug("paused");
            this.readyState = "paused";
            onPause();
        };
        if (this.polling || !this.writable) {
            let total = 0;
            if (this.polling) {
                debug("we are currently polling - waiting to pause");
                total++;
                this.once("pollComplete", function () {
                    debug("pre-pause polling complete");
                    --total || pause();
                });
            }
            if (!this.writable) {
                debug("we are currently writing - waiting to pause");
                total++;
                this.once("drain", function () {
                    debug("pre-pause writing complete");
                    --total || pause();
                });
            }
        }
        else {
            pause();
        }
    }
    /**
     * Starts polling cycle.
     *
     * @private
     */
    poll() {
        debug("polling");
        this.polling = true;
        this.doPoll();
        this.emitReserved("poll");
    }
    /**
     * Overloads onData to detect payloads.
     *
     * @protected
     */
    onData(data) {
        debug("polling got data %s", data);
        const callback = (packet) => {
            // if its the first message we consider the transport open
            if ("opening" === this.readyState && packet.type === "open") {
                this.onOpen();
            }
            // if its a close packet, we close the ongoing requests
            if ("close" === packet.type) {
                this.onClose({ description: "transport closed by the server" });
                return false;
            }
            // otherwise bypass onData and handle the message
            this.onPacket(packet);
        };
        // decode payload
        (0, engine_io_parser_1.decodePayload)(data, this.socket.binaryType).forEach(callback);
        // if an event did not trigger closing
        if ("closed" !== this.readyState) {
            // if we got data we're not polling
            this.polling = false;
            this.emitReserved("pollComplete");
            if ("open" === this.readyState) {
                this.poll();
            }
            else {
                debug('ignoring poll - transport state "%s"', this.readyState);
            }
        }
    }
    /**
     * For polling, send a close packet.
     *
     * @protected
     */
    doClose() {
        const close = () => {
            debug("writing close packet");
            this.write([{ type: "close" }]);
        };
        if ("open" === this.readyState) {
            debug("transport open - closing");
            close();
        }
        else {
            // in case we're trying to close while
            // handshaking is in progress (GH-164)
            debug("transport not open - deferring close");
            this.once("open", close);
        }
    }
    /**
     * Writes a packets payload.
     *
     * @param {Array} packets - data packets
     * @protected
     */
    write(packets) {
        this.writable = false;
        (0, engine_io_parser_1.encodePayload)(packets, (data) => {
            this.doWrite(data, () => {
                this.writable = true;
                this.emitReserved("drain");
            });
        });
    }
    /**
     * Generates uri for connection.
     *
     * @private
     */
    uri() {
        const schema = this.opts.secure ? "https" : "http";
        const query = this.query || {};
        // cache busting is forced
        if (false !== this.opts.timestampRequests) {
            query[this.opts.timestampParam] = (0, yeast_js_1.yeast)();
        }
        if (!this.supportsBinary && !query.sid) {
            query.b64 = 1;
        }
        return this.createUri(schema, query);
    }
    /**
     * Creates a request.
     *
     * @param {String} method
     * @private
     */
    request(opts = {}) {
        Object.assign(opts, { xd: this.xd, cookieJar: this.cookieJar }, this.opts);
        return new Request(this.uri(), opts);
    }
    /**
     * Sends data.
     *
     * @param {String} data to send.
     * @param {Function} called upon flush.
     * @private
     */
    doWrite(data, fn) {
        const req = this.request({
            method: "POST",
            data: data,
        });
        req.on("success", fn);
        req.on("error", (xhrStatus, context) => {
            this.onError("xhr post error", xhrStatus, context);
        });
    }
    /**
     * Starts a poll cycle.
     *
     * @private
     */
    doPoll() {
        debug("xhr poll");
        const req = this.request();
        req.on("data", this.onData.bind(this));
        req.on("error", (xhrStatus, context) => {
            this.onError("xhr poll error", xhrStatus, context);
        });
        this.pollXhr = req;
    }
}
exports.Polling = Polling;
class Request extends component_emitter_1.Emitter {
    /**
     * Request constructor
     *
     * @param {Object} options
     * @package
     */
    constructor(uri, opts) {
        super();
        (0, util_js_1.installTimerFunctions)(this, opts);
        this.opts = opts;
        this.method = opts.method || "GET";
        this.uri = uri;
        this.data = undefined !== opts.data ? opts.data : null;
        this.create();
    }
    /**
     * Creates the XHR object and sends the request.
     *
     * @private
     */
    create() {
        var _a;
        const opts = (0, util_js_1.pick)(this.opts, "agent", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "autoUnref");
        opts.xdomain = !!this.opts.xd;
        const xhr = (this.xhr = new xmlhttprequest_js_1.XHR(opts));
        try {
            debug("xhr open %s: %s", this.method, this.uri);
            xhr.open(this.method, this.uri, true);
            try {
                if (this.opts.extraHeaders) {
                    xhr.setDisableHeaderCheck && xhr.setDisableHeaderCheck(true);
                    for (let i in this.opts.extraHeaders) {
                        if (this.opts.extraHeaders.hasOwnProperty(i)) {
                            xhr.setRequestHeader(i, this.opts.extraHeaders[i]);
                        }
                    }
                }
            }
            catch (e) { }
            if ("POST" === this.method) {
                try {
                    xhr.setRequestHeader("Content-type", "text/plain;charset=UTF-8");
                }
                catch (e) { }
            }
            try {
                xhr.setRequestHeader("Accept", "*/*");
            }
            catch (e) { }
            (_a = this.opts.cookieJar) === null || _a === void 0 ? void 0 : _a.addCookies(xhr);
            // ie6 check
            if ("withCredentials" in xhr) {
                xhr.withCredentials = this.opts.withCredentials;
            }
            if (this.opts.requestTimeout) {
                xhr.timeout = this.opts.requestTimeout;
            }
            xhr.onreadystatechange = () => {
                var _a;
                if (xhr.readyState === 3) {
                    (_a = this.opts.cookieJar) === null || _a === void 0 ? void 0 : _a.parseCookies(xhr);
                }
                if (4 !== xhr.readyState)
                    return;
                if (200 === xhr.status || 1223 === xhr.status) {
                    this.onLoad();
                }
                else {
                    // make sure the `error` event handler that's user-set
                    // does not throw in the same tick and gets caught here
                    this.setTimeoutFn(() => {
                        this.onError(typeof xhr.status === "number" ? xhr.status : 0);
                    }, 0);
                }
            };
            debug("xhr data %s", this.data);
            xhr.send(this.data);
        }
        catch (e) {
            // Need to defer since .create() is called directly from the constructor
            // and thus the 'error' event can only be only bound *after* this exception
            // occurs.  Therefore, also, we cannot throw here at all.
            this.setTimeoutFn(() => {
                this.onError(e);
            }, 0);
            return;
        }
        if (typeof document !== "undefined") {
            this.index = Request.requestsCount++;
            Request.requests[this.index] = this;
        }
    }
    /**
     * Called upon error.
     *
     * @private
     */
    onError(err) {
        this.emitReserved("error", err, this.xhr);
        this.cleanup(true);
    }
    /**
     * Cleans up house.
     *
     * @private
     */
    cleanup(fromError) {
        if ("undefined" === typeof this.xhr || null === this.xhr) {
            return;
        }
        this.xhr.onreadystatechange = empty;
        if (fromError) {
            try {
                this.xhr.abort();
            }
            catch (e) { }
        }
        if (typeof document !== "undefined") {
            delete Request.requests[this.index];
        }
        this.xhr = null;
    }
    /**
     * Called upon load.
     *
     * @private
     */
    onLoad() {
        const data = this.xhr.responseText;
        if (data !== null) {
            this.emitReserved("data", data);
            this.emitReserved("success");
            this.cleanup();
        }
    }
    /**
     * Aborts the request.
     *
     * @package
     */
    abort() {
        this.cleanup();
    }
}
exports.Request = Request;
Request.requestsCount = 0;
Request.requests = {};
/**
 * Aborts pending requests when unloading the window. This is needed to prevent
 * memory leaks (e.g. when using IE) and to ensure that no spurious error is
 * emitted.
 */
if (typeof document !== "undefined") {
    // @ts-ignore
    if (typeof attachEvent === "function") {
        // @ts-ignore
        attachEvent("onunload", unloadHandler);
    }
    else if (typeof addEventListener === "function") {
        const terminationEvent = "onpagehide" in globalThis_js_1.globalThisShim ? "pagehide" : "unload";
        addEventListener(terminationEvent, unloadHandler, false);
    }
}
function unloadHandler() {
    for (let i in Request.requests) {
        if (Request.requests.hasOwnProperty(i)) {
            Request.requests[i].abort();
        }
    }
}

},{"../contrib/yeast.js":47,"../globalThis.js":48,"../transport.js":51,"../util.js":58,"./xmlhttprequest.js":57,"@socket.io/component-emitter":36,"debug":42,"engine.io-parser":63}],54:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultBinaryType = exports.usingBrowserWebSocket = exports.WebSocket = exports.nextTick = void 0;
const globalThis_js_1 = require("../globalThis.js");
exports.nextTick = (() => {
    const isPromiseAvailable = typeof Promise === "function" && typeof Promise.resolve === "function";
    if (isPromiseAvailable) {
        return (cb) => Promise.resolve().then(cb);
    }
    else {
        return (cb, setTimeoutFn) => setTimeoutFn(cb, 0);
    }
})();
exports.WebSocket = globalThis_js_1.globalThisShim.WebSocket || globalThis_js_1.globalThisShim.MozWebSocket;
exports.usingBrowserWebSocket = true;
exports.defaultBinaryType = "arraybuffer";

},{"../globalThis.js":48}],55:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WS = void 0;
const transport_js_1 = require("../transport.js");
const yeast_js_1 = require("../contrib/yeast.js");
const util_js_1 = require("../util.js");
const websocket_constructor_js_1 = require("./websocket-constructor.js");
const debug_1 = __importDefault(require("debug")); // debug()
const engine_io_parser_1 = require("engine.io-parser");
const debug = (0, debug_1.default)("engine.io-client:websocket"); // debug()
// detect ReactNative environment
const isReactNative = typeof navigator !== "undefined" &&
    typeof navigator.product === "string" &&
    navigator.product.toLowerCase() === "reactnative";
class WS extends transport_js_1.Transport {
    /**
     * WebSocket transport constructor.
     *
     * @param {Object} opts - connection options
     * @protected
     */
    constructor(opts) {
        super(opts);
        this.supportsBinary = !opts.forceBase64;
    }
    get name() {
        return "websocket";
    }
    doOpen() {
        if (!this.check()) {
            // let probe timeout
            return;
        }
        const uri = this.uri();
        const protocols = this.opts.protocols;
        // React Native only supports the 'headers' option, and will print a warning if anything else is passed
        const opts = isReactNative
            ? {}
            : (0, util_js_1.pick)(this.opts, "agent", "perMessageDeflate", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "localAddress", "protocolVersion", "origin", "maxPayload", "family", "checkServerIdentity");
        if (this.opts.extraHeaders) {
            opts.headers = this.opts.extraHeaders;
        }
        try {
            this.ws =
                websocket_constructor_js_1.usingBrowserWebSocket && !isReactNative
                    ? protocols
                        ? new websocket_constructor_js_1.WebSocket(uri, protocols)
                        : new websocket_constructor_js_1.WebSocket(uri)
                    : new websocket_constructor_js_1.WebSocket(uri, protocols, opts);
        }
        catch (err) {
            return this.emitReserved("error", err);
        }
        this.ws.binaryType = this.socket.binaryType;
        this.addEventListeners();
    }
    /**
     * Adds event listeners to the socket
     *
     * @private
     */
    addEventListeners() {
        this.ws.onopen = () => {
            if (this.opts.autoUnref) {
                this.ws._socket.unref();
            }
            this.onOpen();
        };
        this.ws.onclose = (closeEvent) => this.onClose({
            description: "websocket connection closed",
            context: closeEvent,
        });
        this.ws.onmessage = (ev) => this.onData(ev.data);
        this.ws.onerror = (e) => this.onError("websocket error", e);
    }
    write(packets) {
        this.writable = false;
        // encodePacket efficient as it uses WS framing
        // no need for encodePayload
        for (let i = 0; i < packets.length; i++) {
            const packet = packets[i];
            const lastPacket = i === packets.length - 1;
            (0, engine_io_parser_1.encodePacket)(packet, this.supportsBinary, (data) => {
                // always create a new object (GH-437)
                const opts = {};
                if (!websocket_constructor_js_1.usingBrowserWebSocket) {
                    if (packet.options) {
                        opts.compress = packet.options.compress;
                    }
                    if (this.opts.perMessageDeflate) {
                        const len = 
                        // @ts-ignore
                        "string" === typeof data ? Buffer.byteLength(data) : data.length;
                        if (len < this.opts.perMessageDeflate.threshold) {
                            opts.compress = false;
                        }
                    }
                }
                // Sometimes the websocket has already been closed but the browser didn't
                // have a chance of informing us about it yet, in that case send will
                // throw an error
                try {
                    if (websocket_constructor_js_1.usingBrowserWebSocket) {
                        // TypeError is thrown when passing the second argument on Safari
                        this.ws.send(data);
                    }
                    else {
                        this.ws.send(data, opts);
                    }
                }
                catch (e) {
                    debug("websocket closed before onclose event");
                }
                if (lastPacket) {
                    // fake drain
                    // defer to next tick to allow Socket to clear writeBuffer
                    (0, websocket_constructor_js_1.nextTick)(() => {
                        this.writable = true;
                        this.emitReserved("drain");
                    }, this.setTimeoutFn);
                }
            });
        }
    }
    doClose() {
        if (typeof this.ws !== "undefined") {
            this.ws.close();
            this.ws = null;
        }
    }
    /**
     * Generates uri for connection.
     *
     * @private
     */
    uri() {
        const schema = this.opts.secure ? "wss" : "ws";
        const query = this.query || {};
        // append timestamp to URI
        if (this.opts.timestampRequests) {
            query[this.opts.timestampParam] = (0, yeast_js_1.yeast)();
        }
        // communicate binary support capabilities
        if (!this.supportsBinary) {
            query.b64 = 1;
        }
        return this.createUri(schema, query);
    }
    /**
     * Feature detection for WebSocket.
     *
     * @return {Boolean} whether this transport is available.
     * @private
     */
    check() {
        return !!websocket_constructor_js_1.WebSocket;
    }
}
exports.WS = WS;

}).call(this)}).call(this,require("buffer").Buffer)
},{"../contrib/yeast.js":47,"../transport.js":51,"../util.js":58,"./websocket-constructor.js":54,"buffer":37,"debug":42,"engine.io-parser":63}],56:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WT = void 0;
const transport_js_1 = require("../transport.js");
const websocket_constructor_js_1 = require("./websocket-constructor.js");
const engine_io_parser_1 = require("engine.io-parser");
const debug_1 = __importDefault(require("debug")); // debug()
const debug = (0, debug_1.default)("engine.io-client:webtransport"); // debug()
class WT extends transport_js_1.Transport {
    get name() {
        return "webtransport";
    }
    doOpen() {
        // @ts-ignore
        if (typeof WebTransport !== "function") {
            return;
        }
        // @ts-ignore
        this.transport = new WebTransport(this.createUri("https"), this.opts.transportOptions[this.name]);
        this.transport.closed
            .then(() => {
            debug("transport closed gracefully");
            this.onClose();
        })
            .catch((err) => {
            debug("transport closed due to %s", err);
            this.onError("webtransport error", err);
        });
        // note: we could have used async/await, but that would require some additional polyfills
        this.transport.ready.then(() => {
            this.transport.createBidirectionalStream().then((stream) => {
                const decoderStream = (0, engine_io_parser_1.createPacketDecoderStream)(Number.MAX_SAFE_INTEGER, this.socket.binaryType);
                const reader = stream.readable.pipeThrough(decoderStream).getReader();
                const encoderStream = (0, engine_io_parser_1.createPacketEncoderStream)();
                encoderStream.readable.pipeTo(stream.writable);
                this.writer = encoderStream.writable.getWriter();
                const read = () => {
                    reader
                        .read()
                        .then(({ done, value }) => {
                        if (done) {
                            debug("session is closed");
                            return;
                        }
                        debug("received chunk: %o", value);
                        this.onPacket(value);
                        read();
                    })
                        .catch((err) => {
                        debug("an error occurred while reading: %s", err);
                    });
                };
                read();
                const packet = { type: "open" };
                if (this.query.sid) {
                    packet.data = `{"sid":"${this.query.sid}"}`;
                }
                this.writer.write(packet).then(() => this.onOpen());
            });
        });
    }
    write(packets) {
        this.writable = false;
        for (let i = 0; i < packets.length; i++) {
            const packet = packets[i];
            const lastPacket = i === packets.length - 1;
            this.writer.write(packet).then(() => {
                if (lastPacket) {
                    (0, websocket_constructor_js_1.nextTick)(() => {
                        this.writable = true;
                        this.emitReserved("drain");
                    }, this.setTimeoutFn);
                }
            });
        }
    }
    doClose() {
        var _a;
        (_a = this.transport) === null || _a === void 0 ? void 0 : _a.close();
    }
}
exports.WT = WT;

},{"../transport.js":51,"./websocket-constructor.js":54,"debug":42,"engine.io-parser":63}],57:[function(require,module,exports){
"use strict";
// browser shim for xmlhttprequest module
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCookieJar = exports.XHR = void 0;
const has_cors_js_1 = require("../contrib/has-cors.js");
const globalThis_js_1 = require("../globalThis.js");
function XHR(opts) {
    const xdomain = opts.xdomain;
    // XMLHttpRequest can be disabled on IE
    try {
        if ("undefined" !== typeof XMLHttpRequest && (!xdomain || has_cors_js_1.hasCORS)) {
            return new XMLHttpRequest();
        }
    }
    catch (e) { }
    if (!xdomain) {
        try {
            return new globalThis_js_1.globalThisShim[["Active"].concat("Object").join("X")]("Microsoft.XMLHTTP");
        }
        catch (e) { }
    }
}
exports.XHR = XHR;
function createCookieJar() { }
exports.createCookieJar = createCookieJar;

},{"../contrib/has-cors.js":44,"../globalThis.js":48}],58:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.byteLength = exports.installTimerFunctions = exports.pick = void 0;
const globalThis_js_1 = require("./globalThis.js");
function pick(obj, ...attr) {
    return attr.reduce((acc, k) => {
        if (obj.hasOwnProperty(k)) {
            acc[k] = obj[k];
        }
        return acc;
    }, {});
}
exports.pick = pick;
// Keep a reference to the real timeout functions so they can be used when overridden
const NATIVE_SET_TIMEOUT = globalThis_js_1.globalThisShim.setTimeout;
const NATIVE_CLEAR_TIMEOUT = globalThis_js_1.globalThisShim.clearTimeout;
function installTimerFunctions(obj, opts) {
    if (opts.useNativeTimers) {
        obj.setTimeoutFn = NATIVE_SET_TIMEOUT.bind(globalThis_js_1.globalThisShim);
        obj.clearTimeoutFn = NATIVE_CLEAR_TIMEOUT.bind(globalThis_js_1.globalThisShim);
    }
    else {
        obj.setTimeoutFn = globalThis_js_1.globalThisShim.setTimeout.bind(globalThis_js_1.globalThisShim);
        obj.clearTimeoutFn = globalThis_js_1.globalThisShim.clearTimeout.bind(globalThis_js_1.globalThisShim);
    }
}
exports.installTimerFunctions = installTimerFunctions;
// base64 encoded buffers are about 33% bigger (https://en.wikipedia.org/wiki/Base64)
const BASE64_OVERHEAD = 1.33;
// we could also have used `new Blob([obj]).size`, but it isn't supported in IE9
function byteLength(obj) {
    if (typeof obj === "string") {
        return utf8Length(obj);
    }
    // arraybuffer or blob
    return Math.ceil((obj.byteLength || obj.size) * BASE64_OVERHEAD);
}
exports.byteLength = byteLength;
function utf8Length(str) {
    let c = 0, length = 0;
    for (let i = 0, l = str.length; i < l; i++) {
        c = str.charCodeAt(i);
        if (c < 0x80) {
            length += 1;
        }
        else if (c < 0x800) {
            length += 2;
        }
        else if (c < 0xd800 || c >= 0xe000) {
            length += 3;
        }
        else {
            i++;
            length += 4;
        }
    }
    return length;
}

},{"./globalThis.js":48}],59:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_PACKET = exports.PACKET_TYPES_REVERSE = exports.PACKET_TYPES = void 0;
const PACKET_TYPES = Object.create(null); // no Map = no polyfill
exports.PACKET_TYPES = PACKET_TYPES;
PACKET_TYPES["open"] = "0";
PACKET_TYPES["close"] = "1";
PACKET_TYPES["ping"] = "2";
PACKET_TYPES["pong"] = "3";
PACKET_TYPES["message"] = "4";
PACKET_TYPES["upgrade"] = "5";
PACKET_TYPES["noop"] = "6";
const PACKET_TYPES_REVERSE = Object.create(null);
exports.PACKET_TYPES_REVERSE = PACKET_TYPES_REVERSE;
Object.keys(PACKET_TYPES).forEach((key) => {
    PACKET_TYPES_REVERSE[PACKET_TYPES[key]] = key;
});
const ERROR_PACKET = { type: "error", data: "parser error" };
exports.ERROR_PACKET = ERROR_PACKET;

},{}],60:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decode = exports.encode = void 0;
// imported from https://github.com/socketio/base64-arraybuffer
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
// Use a lookup table to find the index.
const lookup = typeof Uint8Array === 'undefined' ? [] : new Uint8Array(256);
for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
}
const encode = (arraybuffer) => {
    let bytes = new Uint8Array(arraybuffer), i, len = bytes.length, base64 = '';
    for (i = 0; i < len; i += 3) {
        base64 += chars[bytes[i] >> 2];
        base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
        base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
        base64 += chars[bytes[i + 2] & 63];
    }
    if (len % 3 === 2) {
        base64 = base64.substring(0, base64.length - 1) + '=';
    }
    else if (len % 3 === 1) {
        base64 = base64.substring(0, base64.length - 2) + '==';
    }
    return base64;
};
exports.encode = encode;
const decode = (base64) => {
    let bufferLength = base64.length * 0.75, len = base64.length, i, p = 0, encoded1, encoded2, encoded3, encoded4;
    if (base64[base64.length - 1] === '=') {
        bufferLength--;
        if (base64[base64.length - 2] === '=') {
            bufferLength--;
        }
    }
    const arraybuffer = new ArrayBuffer(bufferLength), bytes = new Uint8Array(arraybuffer);
    for (i = 0; i < len; i += 4) {
        encoded1 = lookup[base64.charCodeAt(i)];
        encoded2 = lookup[base64.charCodeAt(i + 1)];
        encoded3 = lookup[base64.charCodeAt(i + 2)];
        encoded4 = lookup[base64.charCodeAt(i + 3)];
        bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
        bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
        bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
    return arraybuffer;
};
exports.decode = decode;

},{}],61:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodePacket = void 0;
const commons_js_1 = require("./commons.js");
const base64_arraybuffer_js_1 = require("./contrib/base64-arraybuffer.js");
const withNativeArrayBuffer = typeof ArrayBuffer === "function";
const decodePacket = (encodedPacket, binaryType) => {
    if (typeof encodedPacket !== "string") {
        return {
            type: "message",
            data: mapBinary(encodedPacket, binaryType),
        };
    }
    const type = encodedPacket.charAt(0);
    if (type === "b") {
        return {
            type: "message",
            data: decodeBase64Packet(encodedPacket.substring(1), binaryType),
        };
    }
    const packetType = commons_js_1.PACKET_TYPES_REVERSE[type];
    if (!packetType) {
        return commons_js_1.ERROR_PACKET;
    }
    return encodedPacket.length > 1
        ? {
            type: commons_js_1.PACKET_TYPES_REVERSE[type],
            data: encodedPacket.substring(1),
        }
        : {
            type: commons_js_1.PACKET_TYPES_REVERSE[type],
        };
};
exports.decodePacket = decodePacket;
const decodeBase64Packet = (data, binaryType) => {
    if (withNativeArrayBuffer) {
        const decoded = (0, base64_arraybuffer_js_1.decode)(data);
        return mapBinary(decoded, binaryType);
    }
    else {
        return { base64: true, data }; // fallback for old browsers
    }
};
const mapBinary = (data, binaryType) => {
    switch (binaryType) {
        case "blob":
            if (data instanceof Blob) {
                // from WebSocket + binaryType "blob"
                return data;
            }
            else {
                // from HTTP long-polling or WebTransport
                return new Blob([data]);
            }
        case "arraybuffer":
        default:
            if (data instanceof ArrayBuffer) {
                // from HTTP long-polling (base64) or WebSocket + binaryType "arraybuffer"
                return data;
            }
            else {
                // from WebTransport (Uint8Array)
                return data.buffer;
            }
    }
};

},{"./commons.js":59,"./contrib/base64-arraybuffer.js":60}],62:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodePacket = exports.encodePacketToBinary = void 0;
const commons_js_1 = require("./commons.js");
const withNativeBlob = typeof Blob === "function" ||
    (typeof Blob !== "undefined" &&
        Object.prototype.toString.call(Blob) === "[object BlobConstructor]");
const withNativeArrayBuffer = typeof ArrayBuffer === "function";
// ArrayBuffer.isView method is not defined in IE10
const isView = (obj) => {
    return typeof ArrayBuffer.isView === "function"
        ? ArrayBuffer.isView(obj)
        : obj && obj.buffer instanceof ArrayBuffer;
};
const encodePacket = ({ type, data }, supportsBinary, callback) => {
    if (withNativeBlob && data instanceof Blob) {
        if (supportsBinary) {
            return callback(data);
        }
        else {
            return encodeBlobAsBase64(data, callback);
        }
    }
    else if (withNativeArrayBuffer &&
        (data instanceof ArrayBuffer || isView(data))) {
        if (supportsBinary) {
            return callback(data);
        }
        else {
            return encodeBlobAsBase64(new Blob([data]), callback);
        }
    }
    // plain string
    return callback(commons_js_1.PACKET_TYPES[type] + (data || ""));
};
exports.encodePacket = encodePacket;
const encodeBlobAsBase64 = (data, callback) => {
    const fileReader = new FileReader();
    fileReader.onload = function () {
        const content = fileReader.result.split(",")[1];
        callback("b" + (content || ""));
    };
    return fileReader.readAsDataURL(data);
};
function toArray(data) {
    if (data instanceof Uint8Array) {
        return data;
    }
    else if (data instanceof ArrayBuffer) {
        return new Uint8Array(data);
    }
    else {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
}
let TEXT_ENCODER;
function encodePacketToBinary(packet, callback) {
    if (withNativeBlob && packet.data instanceof Blob) {
        return packet.data.arrayBuffer().then(toArray).then(callback);
    }
    else if (withNativeArrayBuffer &&
        (packet.data instanceof ArrayBuffer || isView(packet.data))) {
        return callback(toArray(packet.data));
    }
    encodePacket(packet, false, (encoded) => {
        if (!TEXT_ENCODER) {
            TEXT_ENCODER = new TextEncoder();
        }
        callback(TEXT_ENCODER.encode(encoded));
    });
}
exports.encodePacketToBinary = encodePacketToBinary;

},{"./commons.js":59}],63:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodePayload = exports.decodePacket = exports.encodePayload = exports.encodePacket = exports.protocol = exports.createPacketDecoderStream = exports.createPacketEncoderStream = void 0;
const encodePacket_js_1 = require("./encodePacket.js");
Object.defineProperty(exports, "encodePacket", { enumerable: true, get: function () { return encodePacket_js_1.encodePacket; } });
const decodePacket_js_1 = require("./decodePacket.js");
Object.defineProperty(exports, "decodePacket", { enumerable: true, get: function () { return decodePacket_js_1.decodePacket; } });
const commons_js_1 = require("./commons.js");
const SEPARATOR = String.fromCharCode(30); // see https://en.wikipedia.org/wiki/Delimiter#ASCII_delimited_text
const encodePayload = (packets, callback) => {
    // some packets may be added to the array while encoding, so the initial length must be saved
    const length = packets.length;
    const encodedPackets = new Array(length);
    let count = 0;
    packets.forEach((packet, i) => {
        // force base64 encoding for binary packets
        (0, encodePacket_js_1.encodePacket)(packet, false, (encodedPacket) => {
            encodedPackets[i] = encodedPacket;
            if (++count === length) {
                callback(encodedPackets.join(SEPARATOR));
            }
        });
    });
};
exports.encodePayload = encodePayload;
const decodePayload = (encodedPayload, binaryType) => {
    const encodedPackets = encodedPayload.split(SEPARATOR);
    const packets = [];
    for (let i = 0; i < encodedPackets.length; i++) {
        const decodedPacket = (0, decodePacket_js_1.decodePacket)(encodedPackets[i], binaryType);
        packets.push(decodedPacket);
        if (decodedPacket.type === "error") {
            break;
        }
    }
    return packets;
};
exports.decodePayload = decodePayload;
function createPacketEncoderStream() {
    // @ts-expect-error
    return new TransformStream({
        transform(packet, controller) {
            (0, encodePacket_js_1.encodePacketToBinary)(packet, (encodedPacket) => {
                const payloadLength = encodedPacket.length;
                let header;
                // inspired by the WebSocket format: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#decoding_payload_length
                if (payloadLength < 126) {
                    header = new Uint8Array(1);
                    new DataView(header.buffer).setUint8(0, payloadLength);
                }
                else if (payloadLength < 65536) {
                    header = new Uint8Array(3);
                    const view = new DataView(header.buffer);
                    view.setUint8(0, 126);
                    view.setUint16(1, payloadLength);
                }
                else {
                    header = new Uint8Array(9);
                    const view = new DataView(header.buffer);
                    view.setUint8(0, 127);
                    view.setBigUint64(1, BigInt(payloadLength));
                }
                // first bit indicates whether the payload is plain text (0) or binary (1)
                if (packet.data && typeof packet.data !== "string") {
                    header[0] |= 0x80;
                }
                controller.enqueue(header);
                controller.enqueue(encodedPacket);
            });
        },
    });
}
exports.createPacketEncoderStream = createPacketEncoderStream;
let TEXT_DECODER;
function totalLength(chunks) {
    return chunks.reduce((acc, chunk) => acc + chunk.length, 0);
}
function concatChunks(chunks, size) {
    if (chunks[0].length === size) {
        return chunks.shift();
    }
    const buffer = new Uint8Array(size);
    let j = 0;
    for (let i = 0; i < size; i++) {
        buffer[i] = chunks[0][j++];
        if (j === chunks[0].length) {
            chunks.shift();
            j = 0;
        }
    }
    if (chunks.length && j < chunks[0].length) {
        chunks[0] = chunks[0].slice(j);
    }
    return buffer;
}
function createPacketDecoderStream(maxPayload, binaryType) {
    if (!TEXT_DECODER) {
        TEXT_DECODER = new TextDecoder();
    }
    const chunks = [];
    let state = 0 /* READ_HEADER */;
    let expectedLength = -1;
    let isBinary = false;
    // @ts-expect-error
    return new TransformStream({
        transform(chunk, controller) {
            chunks.push(chunk);
            while (true) {
                if (state === 0 /* READ_HEADER */) {
                    if (totalLength(chunks) < 1) {
                        break;
                    }
                    const header = concatChunks(chunks, 1);
                    isBinary = (header[0] & 0x80) === 0x80;
                    expectedLength = header[0] & 0x7f;
                    if (expectedLength < 126) {
                        state = 3 /* READ_PAYLOAD */;
                    }
                    else if (expectedLength === 126) {
                        state = 1 /* READ_EXTENDED_LENGTH_16 */;
                    }
                    else {
                        state = 2 /* READ_EXTENDED_LENGTH_64 */;
                    }
                }
                else if (state === 1 /* READ_EXTENDED_LENGTH_16 */) {
                    if (totalLength(chunks) < 2) {
                        break;
                    }
                    const headerArray = concatChunks(chunks, 2);
                    expectedLength = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length).getUint16(0);
                    state = 3 /* READ_PAYLOAD */;
                }
                else if (state === 2 /* READ_EXTENDED_LENGTH_64 */) {
                    if (totalLength(chunks) < 8) {
                        break;
                    }
                    const headerArray = concatChunks(chunks, 8);
                    const view = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length);
                    const n = view.getUint32(0);
                    if (n > Math.pow(2, 53 - 32) - 1) {
                        // the maximum safe integer in JavaScript is 2^53 - 1
                        controller.enqueue(commons_js_1.ERROR_PACKET);
                        break;
                    }
                    expectedLength = n * Math.pow(2, 32) + view.getUint32(4);
                    state = 3 /* READ_PAYLOAD */;
                }
                else {
                    if (totalLength(chunks) < expectedLength) {
                        break;
                    }
                    const data = concatChunks(chunks, expectedLength);
                    controller.enqueue((0, decodePacket_js_1.decodePacket)(isBinary ? data : TEXT_DECODER.decode(data), binaryType));
                    state = 0 /* READ_HEADER */;
                }
                if (expectedLength === 0 || expectedLength > maxPayload) {
                    controller.enqueue(commons_js_1.ERROR_PACKET);
                    break;
                }
            }
        },
    });
}
exports.createPacketDecoderStream = createPacketDecoderStream;
exports.protocol = 4;

},{"./commons.js":59,"./decodePacket.js":61,"./encodePacket.js":62}],64:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function c(input, length, result) {
    const b = [0, 0, 0, 0, 0];
    for (let i = 0; i < length; i += 4) {
        let n = ((input[i] * 256 + input[i + 1]) * 256 + input[i + 2]) * 256 + input[i + 3];
        if (!n) {
            result.push("z");
        }
        else {
            for (let j = 0; j < 5; b[j++] = (n % 85) + 33, n = Math.floor(n / 85)) { }
            result.push(String.fromCharCode(b[4], b[3], b[2], b[1], b[0]));
        }
    }
}
function encode(arr) {
    // summary: encodes input data in ascii85 string
    // input: ArrayLike
    var _a;
    const input = arr, result = [], remainder = input.length % 4, length = input.length - remainder;
    c(input, length, result);
    if (remainder) {
        const t = new Uint8Array(4);
        t.set(input.slice(length), 0);
        c(t, 4, result);
        let x = (_a = result.pop()) !== null && _a !== void 0 ? _a : "";
        if (x == "z") {
            x = "!!!!!";
        }
        result.push(x.substr(0, remainder + 1));
    }
    let ret = result.join(""); // String
    ret = "<~" + ret + "~>";
    return ret;
}
const ascii85 = {
    encode: function (arr) {
        if (arr instanceof ArrayBuffer) {
            arr = new Uint8Array(arr, 0, arr.byteLength);
        }
        return encode(arr);
    },
    decode: function (input) {
        // summary: decodes the input string back to an ArrayBuffer
        // input: String: the input string to decode
        if (!input.startsWith("<~") || !input.endsWith("~>")) {
            throw new Error("Invalid input string");
        }
        input = input.substr(2, input.length - 4);
        const n = input.length, r = [], b = [0, 0, 0, 0, 0];
        let t, x, y, d;
        for (let i = 0; i < n; ++i) {
            if (input.charAt(i) == "z") {
                r.push(0, 0, 0, 0);
                continue;
            }
            for (let j = 0; j < 5; ++j) {
                b[j] = input.charCodeAt(i + j) - 33;
            }
            d = n - i;
            if (d < 5) {
                for (let j = d; j < 4; b[++j] = 0) { }
                b[d] = 85;
            }
            t = (((b[0] * 85 + b[1]) * 85 + b[2]) * 85 + b[3]) * 85 + b[4];
            x = t & 255;
            t >>>= 8;
            y = t & 255;
            t >>>= 8;
            r.push(t >>> 8, t & 255, y, x);
            for (let j = d; j < 5; ++j, r.pop()) { }
            i += 4;
        }
        const data = new Uint8Array(r);
        return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    },
};
exports.default = ascii85;

},{}],65:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Base64 {
    constructor(value) {
        this.value = value;
        this.keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    }
    static utf8_encode(value) {
        let e = value.replace(/rn/g, "n");
        let t = "";
        for (let n = 0; n < e.length; n++) {
            let r = e.charCodeAt(n);
            if (r < 128) {
                t += String.fromCharCode(r);
            }
            else if (r > 127 && r < 2048) {
                t += String.fromCharCode((r >> 6) | 192);
                t += String.fromCharCode((r & 63) | 128);
            }
            else {
                t += String.fromCharCode((r >> 12) | 224);
                t += String.fromCharCode(((r >> 6) & 63) | 128);
                t += String.fromCharCode((r & 63) | 128);
            }
        }
        return t;
    }
    static utf8_decode(value) {
        let t = "";
        let n = 0;
        let r = 0, c1 = 0, c2 = 0, c3 = 0;
        while (n < value.length) {
            r = value.charCodeAt(n);
            if (r < 128) {
                t += String.fromCharCode(r);
                n++;
            }
            else if (r > 191 && r < 224) {
                c2 = value.charCodeAt(n + 1);
                t += String.fromCharCode(((r & 31) << 6) | (c2 & 63));
                n += 2;
            }
            else {
                c2 = value.charCodeAt(n + 1);
                c3 = value.charCodeAt(n + 2);
                t += String.fromCharCode(((r & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                n += 3;
            }
        }
        return t;
    }
    encode() {
        let t = "";
        let n, r, i, s, o, u, a;
        let f = 0;
        let e = Base64.utf8_encode(this.value);
        while (f < e.length) {
            n = e.charCodeAt(f++);
            r = e.charCodeAt(f++);
            i = e.charCodeAt(f++);
            s = n >> 2;
            o = ((n & 3) << 4) | (r >> 4);
            u = ((r & 15) << 2) | (i >> 6);
            a = i & 63;
            if (isNaN(r)) {
                u = a = 64;
            }
            else if (isNaN(i)) {
                a = 64;
            }
            t = t + this.keyStr.charAt(s) + this.keyStr.charAt(o) + this.keyStr.charAt(u) + this.keyStr.charAt(a);
        }
        return t;
    }
    static encode(value) {
        return new Base64(value).encode();
    }
    decode() {
        let t = "";
        let n, r, i;
        let s, o, u, a;
        let f = 0;
        let e = this.value.replace(/[^A-Za-z0-9+/=]/g, "");
        while (f < e.length) {
            s = this.keyStr.indexOf(e.charAt(f++));
            o = this.keyStr.indexOf(e.charAt(f++));
            u = this.keyStr.indexOf(e.charAt(f++));
            a = this.keyStr.indexOf(e.charAt(f++));
            n = (s << 2) | (o >> 4);
            r = ((o & 15) << 4) | (u >> 2);
            i = ((u & 3) << 6) | a;
            t = t + String.fromCharCode(n);
            if (u != 64) {
                t = t + String.fromCharCode(r);
            }
            if (a != 64) {
                t = t + String.fromCharCode(i);
            }
        }
        t = Base64.utf8_decode(t);
        return t;
    }
    static decode(value) {
        return new Base64(value).decode();
    }
}
exports.default = Base64;

},{}],66:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const A = (a, b) => {
    return 1.0 - 3.0 * b + 3.0 * a;
};
const B = (a, b) => {
    return 3.0 * b - 6.0 * a;
};
const C = (a) => {
    return 3.0 * a;
};
const calcBezier = (a, b, c) => {
    return ((A(b, c) * a + B(b, c)) * a + C(b)) * a;
};
const getSlope = (a, b, c) => {
    return 3.0 * A(b, c) * a * a + 2.0 * B(b, c) * a + C(b);
};
const binarySubdivide = (a, b, c, d, e) => {
    let f, g, i = 0;
    do {
        g = b + (c - b) / 2.0;
        f = calcBezier(g, d, e) - a;
        if (f > 0.0) {
            c = g;
        }
        else {
            b = g;
        }
    } while (Math.abs(f) > 0.0000001 && ++i < 10);
    return g;
};
const newtonRaphsonIterate = (a, b, c, d) => {
    for (let i = 0; i < 4; ++i) {
        let currentSlope = getSlope(b, c, d);
        if (currentSlope === 0.0) {
            return b;
        }
        let currentX = calcBezier(b, c, d) - a;
        b -= currentX / currentSlope;
    }
    return b;
};
const getTForX = (a, props) => {
    let b = 0.0, c = 1, d = props.kSplineTableSize - 1;
    for (; c !== d && props.sampleValues[c] <= a; ++c) {
        b += props.kSampleStepSize;
    }
    --c;
    let e = (a - props.sampleValues[c]) / (props.sampleValues[c + 1] - props.sampleValues[c]), f = b + e * props.kSampleStepSize, g = getSlope(f, props.x1, props.x2);
    if (g >= 0.001) {
        return newtonRaphsonIterate(a, f, props.x1, props.x2);
    }
    else if (g === 0.0) {
        return f;
    }
    else {
        return binarySubdivide(a, b, b + props.kSampleStepSize, props.x1, props.x2);
    }
};
const elastic = (x) => {
    return x * (33 * x * x * x * x - 106 * x * x * x + 126 * x * x - 67 * x + 15);
};
const easeInElastic = (x) => {
    const c4 = (2 * Math.PI) / 3;
    return x === 0 ? 0 : x === 1 ? 1 : -Math.pow(2, 10 * x - 10) * Math.sin((x * 10 - 10.75) * c4);
};
const easeInOutElastic = (x) => {
    const c5 = (2 * Math.PI) / 4.5;
    return x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? -(Math.pow(2, 20 * x - 10) * Math.sin((20 * x - 11.125) * c5)) / 2 : (Math.pow(2, -20 * x + 10) * Math.sin((20 * x - 11.125) * c5)) / 2 + 1;
};
const easeOutElastic = (x) => {
    const c4 = (2 * Math.PI) / 3;
    return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
};
const easeOutBounce = (x) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    return x < 1 / d1 ? n1 * x * x : x < 2 / d1 ? n1 * (x -= 1.5 / d1) * x + 0.75 : x < 2.5 / d1 ? n1 * (x -= 2.25 / d1) * x + 0.9375 : n1 * (x -= 2.625 / d1) * x + 0.984375;
};
const easeInBounce = (x) => {
    return 1 - easeOutBounce(1 - x);
};
const easeInOutBounce = (x) => {
    return x < 0.5 ? (1 - easeOutBounce(1 - 2 * x)) / 2 : (1 + easeOutBounce(2 * x - 1)) / 2;
};
// Define um objeto que mapeia os nomes das animações para suas formas em camelCase
const easingList = {
    "linear": "linear",
    "elastic": "elastic",
    "ease": "ease",
    "ease-in": "easeIn",
    "ease-in-elastic": "easeInElastic",
    "ease-in-bounce": "easeInBounce",
    "ease-in-expo": "easeInExpo",
    "ease-in-sine": "easeInSine",
    "ease-in-quad": "easeInQuad",
    "ease-in-cubic": "easeInCubic",
    "ease-in-back": "easeInBack",
    "ease-in-quart": "easeInQuart",
    "ease-in-quint": "easeInQuint",
    "ease-in-circ": "easeInCirc",
    "ease-in-out": "easeInOut",
    "ease-in-out-elastic": "easeInOutElastic",
    "ease-in-out-bounce": "easeInOutBounce",
    "ease-in-out-sine": "easeInOutSine",
    "ease-in-out-quad": "easeInOutQuad",
    "ease-in-out-cubic": "easeInOutCubic",
    "ease-in-out-back": "easeInOutBack",
    "ease-in-out-quart": "easeInOutQuart",
    "ease-in-out-quint": "easeInOutQuint",
    "ease-in-out-expo": "easeInOutExpo",
    "ease-in-out-circ": "easeInOutCirc",
    "ease-out": "easeOut",
    "ease-out-elastic": "easeOutElastic",
    "ease-out-bounce": "easeOutBounce",
    "ease-out-sine": "easeOutSine",
    "ease-out-quad": "easeOutQuad",
    "ease-out-cubic": "easeOutCubic",
    "ease-out-back": "easeOutBack",
    "ease-out-quart": "easeOutQuart",
    "ease-out-quint": "easeOutQuint",
    "ease-out-expo": "easeOutExpo",
    "ease-out-circ": "easeOutCirc",
    "fast-out-slow-in": "fastOutSlowIn",
    "fast-out-linear-in": "fastOutLinearIn",
    "linear-out-slow-in": "linearOutSlowIn",
};
/**
 * Classe que implementa as funções de easing de Bezier
 */
class BezierEasing {
    /**
     * Cria uma nova instância de BezierEasing com os parâmetros de controle da curva de Bezier.
     *
     * @param {number} x1 - O valor x do primeiro ponto de controle (deve estar no intervalo [0, 1])
     * @param {number} y1 - O valor y do primeiro ponto de controle
     * @param {number} x2 - O valor x do segundo ponto de controle (deve estar no intervalo [0, 1])
     * @param {number} y2 - O valor y do segundo ponto de controle
     * @throws {Error} Se os valores x1 e x2 estiverem fora do intervalo [0, 1]
     * @constructor
     */
    constructor(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.kSplineTableSize = 11;
        this.kSampleStepSize = 1.0 / (this.kSplineTableSize - 1.0);
        this.sampleValues = typeof Float32Array === "function" ? new Float32Array(this.kSplineTableSize) : new Array(this.kSplineTableSize);
        if (!(0 <= x1 && x1 <= 1 && 0 <= x2 && x2 <= 1)) {
            throw new Error("bezier x values must be in [0, 1] range");
        }
        for (let i = 0; i < this.kSplineTableSize; ++i) {
            this.sampleValues[i] = calcBezier(i * this.kSampleStepSize, x1, x2);
        }
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    to(t) {
        if (this.x1 === this.y1 && this.x2 === this.y2) {
            return t;
        }
        const props = {
            x1: this.x1,
            y1: this.y1,
            x2: this.x2,
            y2: this.y2,
            kSplineTableSize: this.kSplineTableSize,
            kSampleStepSize: this.kSampleStepSize,
            sampleValues: this.sampleValues,
        };
        return t === 0 ? 0 : t === 1 ? 1 : calcBezier(getTForX(t, props), this.y1, this.y2);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static linear(t) {
        return t;
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static elastic(t) {
        return elastic(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static ease(t) {
        return new BezierEasing(0.25, 0.1, 0.25, 1.0).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeIn(t) {
        return new BezierEasing(0.42, 0.0, 1.0, 1.0).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInElastic(t) {
        return easeInElastic(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInBounce(t) {
        return easeInBounce(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInExpo(t) {
        return new BezierEasing(0.95, 0.05, 0.795, 0.035).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInSine(t) {
        return new BezierEasing(0.47, 0, 0.75, 0.72).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInQuad(t) {
        return new BezierEasing(0.55, 0.09, 0.68, 0.53).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInCubic(t) {
        return new BezierEasing(0.55, 0.06, 0.68, 0.19).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInBack(t) {
        return new BezierEasing(0.6, -0.28, 0.74, 0.05).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInQuart(t) {
        return new BezierEasing(0.895, 0.03, 0.685, 0.22).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInQuint(t) {
        return new BezierEasing(0.755, 0.05, 0.855, 0.06).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInCirc(t) {
        return new BezierEasing(0.6, 0.04, 0.98, 0.335).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInOut(t) {
        return new BezierEasing(0.42, 0.0, 0.58, 1.0).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInOutElastic(t) {
        return easeInOutElastic(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInOutBounce(t) {
        return easeInOutBounce(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInOutSine(t) {
        return new BezierEasing(0.45, 0.05, 0.55, 0.95).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInOutQuad(t) {
        return new BezierEasing(0.46, 0.03, 0.52, 0.96).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInOutCubic(t) {
        return new BezierEasing(0.65, 0.05, 0.36, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInOutBack(t) {
        return new BezierEasing(0.68, -0.55, 0.27, 1.55).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInOutQuart(t) {
        return new BezierEasing(0.77, 0, 0.175, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInOutQuint(t) {
        return new BezierEasing(0.86, 0, 0.07, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInOutExpo(t) {
        return new BezierEasing(1, 0, 0, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInOutCirc(t) {
        return new BezierEasing(0.785, 0.135, 0.15, 0.86).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeOut(t) {
        return new BezierEasing(0.0, 0.0, 0.58, 1.0).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeOutElastic(t) {
        return easeOutElastic(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeOutBounce(t) {
        return easeOutBounce(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeOutSine(t) {
        return new BezierEasing(0.39, 0.58, 0.57, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeOutQuad(t) {
        return new BezierEasing(0.25, 0.46, 0.45, 0.94).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeOutCubic(t) {
        return new BezierEasing(0.22, 0.61, 0.36, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeOutBack(t) {
        return new BezierEasing(0.18, 0.89, 0.32, 1.28).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeOutQuart(t) {
        return new BezierEasing(0.165, 0.84, 0.44, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeOutQuint(t) {
        return new BezierEasing(0.23, 1, 0.32, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeOutExpo(t) {
        return new BezierEasing(0.19, 1, 0.22, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeOutCirc(t) {
        return new BezierEasing(0.075, 0.82, 0.165, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static fastOutSlowIn(t) {
        return new BezierEasing(0.4, 0, 0.2, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static fastOutLinearIn(t) {
        return new BezierEasing(0.4, 0, 1, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static linearOutSlowIn(t) {
        return new BezierEasing(0, 0, 0.2, 1).to(t);
    }
    /**
     * Função personalizada para agendar uma animação
     * @param {Function} func - A função a ser executada a cada quadro de animação
     * @param {number} delay - Atraso inicial antes da animação começar
     * @param {number} duration - Duração total da animação
     * @param {BezierEasing | keyof typeof easingList} easing - Objeto BezierEasing ou nome de animação de easing
     * @returns {number} - ID do temporizador para cancelar a animação
     */
    static setInterval(func, delay = 1, duration = 1000, easing = "linear") {
        let elapsed = 0;
        let timerDelay, start = Date.now();
        const loop = async () => {
            var _a;
            if (elapsed > duration) {
                clearTimeout(timerDelay);
                return;
            }
            const t = Math.min(1, elapsed / duration);
            if (easing instanceof BezierEasing) {
                await func(easing.to(t));
            }
            else if (typeof easing === "function") {
                await func((_a = easing(t)) !== null && _a !== void 0 ? _a : 1);
            }
            else if (easing in easingList) {
                await func(BezierEasing[easingList[easing]](t));
            }
            else {
                await func(t);
            }
            elapsed = Date.now() - start;
            timerDelay = setTimeout(loop, delay - (elapsed % delay));
        };
        loop();
        return timerDelay;
    }
}
exports.default = BezierEasing;

},{}],67:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.infoColor = exports.hslDistance = exports.negative = exports.growing = exports.watershed = exports.colorScale = exports.grayScale = exports.lighten = exports.darken = exports.blend = exports.hwbToRgb = exports.cmykToRgb = exports.hsvToRgb = exports.hslToRgb = exports.rgbToHwb = exports.rgbToCmyk = exports.rgbToHsv = exports.rgbToHsl = exports.rgbToHex = exports.hexToRgb = exports.colorNames = void 0;
exports.colorNames = {
    aliceblue: "#f0f8ff",
    antiquewhite: "#faebd7",
    aqua: "#00ffff",
    aquamarine: "#7fffd4",
    azure: "#f0ffff",
    beige: "#f5f5dc",
    bisque: "#ffe4c4",
    black: "#000000",
    blanchedalmond: "#ffebcd",
    blue: "#0000ff",
    blueviolet: "#8a2be2",
    brown: "#a52a2a",
    burlywood: "#deb887",
    cadetblue: "#5f9ea0",
    chartreuse: "#7fff00",
    chocolate: "#d2691e",
    coral: "#ff7f50",
    cornflowerblue: "#6495ed",
    cornsilk: "#fff8dc",
    crimson: "#dc143c",
    cyan: "#00ffff",
    darkblue: "#00008b",
    darkcyan: "#008b8b",
    darkgoldenrod: "#b8860b",
    darkgray: "#a9a9a9",
    darkgreen: "#006400",
    darkgrey: "#a9a9a9",
    darkkhaki: "#bdb76b",
    darkmagenta: "#8b008b",
    darkolivegreen: "#556b2f",
    darkorange: "#ff8c00",
    darkorchid: "#9932cc",
    darkred: "#8b0000",
    darksalmon: "#e9967a",
    darkseagreen: "#8fbc8f",
    darkslateblue: "#483d8b",
    darkslategray: "#2f4f4f",
    darkslategrey: "#2f4f4f",
    darkturquoise: "#00ced1",
    darkviolet: "#9400d3",
    deeppink: "#ff1493",
    deepskyblue: "#00bfff",
    dimgray: "#696969",
    dimgrey: "#696969",
    dodgerblue: "#1e90ff",
    firebrick: "#b22222",
    floralwhite: "#fffaf0",
    forestgreen: "#228b22",
    fuchsia: "#ff00ff",
    gainsboro: "#dcdcdc",
    ghostwhite: "#f8f8ff",
    gold: "#ffd700",
    goldenrod: "#daa520",
    gray: "#808080",
    green: "#008000",
    greenyellow: "#adff2f",
    grey: "#808080",
    honeydew: "#f0fff0",
    hotpink: "#ff69b4",
    indianred: "#cd5c5c",
    indigo: "#4b0082",
    ivory: "#fffff0",
    khaki: "#f0e68c",
    lavender: "#e6e6fa",
    lavenderblush: "#fff0f5",
    lawngreen: "#7cfc00",
    lemonchiffon: "#fffacd",
    lightblue: "#add8e6",
    lightcoral: "#f08080",
    lightcyan: "#e0ffff",
    lightgoldenrodyellow: "#fafad2",
    lightgray: "#d3d3d3",
    lightgreen: "#90ee90",
    lightgrey: "#d3d3d3",
    lightpink: "#ffb6c1",
    lightsalmon: "#ffa07a",
    lightseagreen: "#20b2aa",
    lightskyblue: "#87cefa",
    lightslategray: "#778899",
    lightslategrey: "#778899",
    lightsteelblue: "#b0c4de",
    lightyellow: "#ffffe0",
    lime: "#00ff00",
    limegreen: "#32cd32",
    linen: "#faf0e6",
    magenta: "#ff00ff",
    maroon: "#800000",
    mediumaquamarine: "#66cdaa",
    mediumblue: "#0000cd",
    mediumorchid: "#ba55d3",
    mediumpurple: "#9370db",
    mediumseagreen: "#3cb371",
    mediumslateblue: "#7b68ee",
    mediumspringgreen: "#00fa9a",
    mediumturquoise: "#48d1cc",
    mediumvioletred: "#c71585",
    midnightblue: "#191970",
    mintcream: "#f5fffa",
    mistyrose: "#ffe4e1",
    moccasin: "#ffe4b5",
    navajowhite: "#ffdead",
    navy: "#000080",
    oldlace: "#fdf5e6",
    olive: "#808000",
    olivedrab: "#6b8e23",
    orange: "#ffa500",
    orangered: "#ff4500",
    orchid: "#da70d6",
    palegoldenrod: "#eee8aa",
    palegreen: "#98fb98",
    paleturquoise: "#afeeee",
    palevioletred: "#db7093",
    papayawhip: "#ffefd5",
    peachpuff: "#ffdab9",
    peru: "#cd853f",
    pink: "#ffc0cb",
    plum: "#dda0dd",
    powderblue: "#b0e0e6",
    purple: "#800080",
    red: "#ff0000",
    rosybrown: "#bc8f8f",
    royalblue: "#4169e1",
    saddlebrown: "#8b4513",
    salmon: "#fa8072",
    sandybrown: "#f4a460",
    seagreen: "#2e8b57",
    seashell: "#fff5ee",
    sienna: "#a0522d",
    silver: "#c0c0c0",
    skyblue: "#87ceeb",
    slateblue: "#6a5acd",
    slategray: "#708090",
    slategrey: "#708090",
    snow: "#fffafa",
    springgreen: "#00ff7f",
    steelblue: "#4682b4",
    tan: "#d2b48c",
    teal: "#008080",
    thistle: "#d8bfd8",
    tomato: "#ff6347",
    turquoise: "#40e0d0",
    violet: "#ee82ee",
    wheat: "#f5deb3",
    white: "#ffffff",
    whitesmoke: "#f5f5f5",
    yellow: "#ffff00",
    yellowgreen: "#9acd32",
};
const prependZeroIfNecessaryHelper = (a) => {
    return 1 == a.length ? "0" + a : a;
};
const hexToRgb = (a) => {
    let b = parseInt(a.substring(1, 3), 16), c = parseInt(a.substring(3, 5), 16), d = parseInt(a.substring(5, 7), 16);
    return [b, c, d];
};
exports.hexToRgb = hexToRgb;
const rgbToHex = (a, b, c) => {
    if (isNaN(a) || 0 > a || 255 < a || isNaN(b) || 0 > b || 255 < b || isNaN(c) || 0 > c || 255 < c) {
        return "#000000";
    }
    return "#" + [prependZeroIfNecessaryHelper(a.toString(16)), prependZeroIfNecessaryHelper(b.toString(16)), prependZeroIfNecessaryHelper(c.toString(16))].join("");
};
exports.rgbToHex = rgbToHex;
const rgbToHsl = (a, b, c) => {
    a /= 255;
    b /= 255;
    c /= 255;
    let d = Math.max(a, b, c), e = Math.min(a, b, c), f = 0, g = 0, h = 0.5 * (d + e);
    if (d != e) {
        if (d == a) {
            f = (60 * (b - c)) / (d - e);
        }
        else if (d == b) {
            f = (60 * (c - a)) / (d - e) + 120;
        }
        else if (d == c) {
            f = (60 * (a - b)) / (d - e) + 240;
        }
    }
    g = 0 < h && 0.5 >= h ? (d - e) / (2 * h) : (d - e) / (2 - 2 * h);
    return [Math.round(f + 360) % 360, Math.round(g * 100), Math.round(h * 100)];
};
exports.rgbToHsl = rgbToHsl;
const rgbToHsv = (a, b, c) => {
    let d = Math.max(Math.max(a, b), c), e = Math.min(Math.min(a, b), c), f;
    if (e == d) {
        e = a = 0;
    }
    else {
        f = d - e;
        e = f / d;
        a = 60 * (a == d ? (b - c) / f : b == d ? 2 + (c - a) / f : 4 + (a - b) / f);
        if (0 > a) {
            a += 360;
        }
        else if (360 < a) {
            a -= 360;
        }
    }
    return [Math.round(a), Math.round(e * 100), Math.round((d * 100) / 255)];
};
exports.rgbToHsv = rgbToHsv;
const rgbToCmyk = (a, b, c) => {
    let d, e, f, g, h, i, j;
    if (a == 0 && b == 0 && c == 0) {
        d = e = f = 0;
        g = 1;
    }
    else {
        h = 1 - a / 255;
        i = 1 - b / 255;
        j = 1 - c / 255;
        g = Math.min(h, Math.min(i, j));
        d = (h - g) / (1 - g);
        e = (i - g) / (1 - g);
        f = (j - g) / (1 - g);
    }
    return [Math.round(d * 100), Math.round(e * 100), Math.round(f * 100), Math.round(g * 100)];
};
exports.rgbToCmyk = rgbToCmyk;
const rgbToHwb = (a, b, c) => {
    let d, e, f, g, h, i, j;
    h = (0, exports.rgbToHsv)(a, b, c)[0];
    a /= 255;
    b /= 255;
    c /= 255;
    f = Math.min(a, b, c);
    g = Math.max(a, b, c);
    c = 1 - g;
    if (g === f) {
        /*h = 0;*/ i = Math.round(f * 100);
        j = Math.round(c * 100);
    }
    else {
        d = a === f ? b - c : b === f ? c - a : a - b;
        e = a === f ? 3 : b === f ? 5 : 1;
        h = Math.round((((e - d / (g - f)) / 6) * 100 * 360) / 100);
        if (0 > h) {
            h += 360;
        }
        else if (360 < h) {
            h -= 360;
        }
        i = Math.round(f * 100);
        j = Math.round(c * 100);
    }
    return [Math.round(h), Math.round(i), Math.round(j)];
};
exports.rgbToHwb = rgbToHwb;
const hueToRgb_ = (a, b, c) => {
    0 > c ? (c += 1) : 1 < c && (c -= 1);
    return 1 > 6 * c ? a + 6 * (b - a) * c : 1 > 2 * c ? b : 2 > 3 * c ? a + (b - a) * (2 / 3 - c) * 6 : a;
};
const hslToRgb = (a, b, c) => {
    let d = 0, e = 0, f = 0, g;
    a /= 360;
    if (0 == b) {
        d = e = f = 255 * c;
    }
    else {
        g = f = 0;
        g = 0.5 > c ? c * (1 + b) : c + b - b * c;
        f = 2 * c - g;
        d = 255 * hueToRgb_(f, g, a + 1 / 3);
        e = 255 * hueToRgb_(f, g, a);
        f = 255 * hueToRgb_(f, g, a - 1 / 3);
    }
    return [Math.round(d), Math.round(e), Math.round(f)];
};
exports.hslToRgb = hslToRgb;
const hsvToRgb = (a, b_, c) => {
    let r, g, b, d, e, f, h, i, k, l, m;
    if (b_ == 0) {
        r = g = b = Math.round(c * 255);
    }
    else {
        h = a * 6 == 6 ? 0 : a * 6;
        i = Math.floor(h);
        k = c * (1 - b_);
        l = c * (1 - b_ * (h - i));
        m = c * (1 - b_ * (1 - (h - i)));
        if (i == 0) {
            d = c;
            e = m;
            f = k;
        }
        else if (i == 1) {
            d = l;
            e = c;
            f = k;
        }
        else if (i == 2) {
            d = k;
            e = c;
            f = m;
        }
        else if (i == 3) {
            d = k;
            e = l;
            f = c;
        }
        else if (i == 4) {
            d = m;
            e = k;
            f = c;
        }
        else {
            d = c;
            e = k;
            f = l;
        }
        r = Math.round(d * 255);
        g = Math.round(e * 255);
        b = Math.round(f * 255);
    }
    return [r, g, b];
};
exports.hsvToRgb = hsvToRgb;
const cmykToRgb = (a, b, c, d) => {
    let e = 255 * (1 - a) * (1 - d), f = 255 * (1 - b) * (1 - d), g = 255 * (1 - c) * (1 - d);
    return [Math.round(e), Math.round(f), Math.round(g)];
};
exports.cmykToRgb = cmykToRgb;
const hwbToRgb = (a, b, c) => {
    let d, e, f, g, h, i, j;
    a = a * 6;
    g = 1 - c;
    j = a | 0;
    i = a - j;
    if (j & 1) {
        i = 1 - i;
    }
    h = b + i * (g - b);
    g = (g * 255) | 0;
    h = (h * 255) | 0;
    b = (b * 255) | 0;
    if (j == 0) {
        d = g;
        e = h;
        f = b;
    }
    else if (j == 1) {
        d = h;
        e = g;
        f = b;
    }
    else if (j == 2) {
        d = b;
        e = g;
        f = h;
    }
    else if (j == 3) {
        d = b;
        e = h;
        f = g;
    }
    else if (j == 4) {
        d = h;
        e = b;
        f = g;
    }
    else if (j == 5) {
        d = g;
        e = b;
        f = h;
    }
    else {
        d = e = f = g;
    }
    return [Math.round(d), Math.round(e), Math.round(f)];
};
exports.hwbToRgb = hwbToRgb;
const blend = (a, b, c) => {
    c = Math.min(Math.max(c, 0), 1);
    return [Math.round(c * a[0] + (1 - c) * b[0]), Math.round(c * a[1] + (1 - c) * b[1]), Math.round(c * a[2] + (1 - c) * b[2])];
};
exports.blend = blend;
const darken = (a, b) => {
    return (0, exports.blend)([0, 0, 0], a, b);
};
exports.darken = darken;
const lighten = (a, b) => {
    return (0, exports.blend)([255, 255, 255], a, b);
};
exports.lighten = lighten;
const grayScale = (a) => {
    let b = Math.round((a[0] + a[1] + a[2]) / 3);
    return [b, b, b];
};
exports.grayScale = grayScale;
const colorScale = (a, b, c) => {
    let s = (0, exports.grayScale)(a)[0];
    b = b == undefined ? [255, 255, 255] : b;
    c = c == undefined ? [0, 0, 0] : c;
    let d = (s * 100) / 255;
    return (0, exports.blend)(b, c, d);
};
exports.colorScale = colorScale;
const watershed = (a) => {
    let b = (0, exports.grayScale)(a), c = b[0], e = 255 / 2;
    if (c >= e) {
        return [255, 255, 255];
    }
    else {
        return [0, 0, 0];
    }
};
exports.watershed = watershed;
const growing = (a) => {
    let b = (0, exports.grayScale)(a), c = b[0];
    return (0, exports.hslToRgb)(Math.round((c * 360) / 255), 100 / 100, 50 / 100);
};
exports.growing = growing;
const negative = (a) => {
    return [Math.round(255 - a[0]), Math.round(255 - a[1]), Math.round(255 - a[2])];
};
exports.negative = negative;
const hslDistance = (a, b) => {
    a = [a[0], a[1] / 100, a[2] / 100];
    b = [b[0], b[1] / 100, b[2] / 100];
    let c, d;
    c = 0.5 >= a[2] ? a[1] * a[2] : a[1] * (1 - a[2]);
    d = 0.5 >= b[2] ? b[1] * b[2] : b[1] * (1 - b[2]);
    return Math.round(((a[2] - b[2]) * (a[2] - b[2]) + c * c + d * d - 2 * c * d * Math.cos(2 * (a[0] / 360 - b[0] / 360) * Math.PI)) * 100);
};
exports.hslDistance = hslDistance;
const infoColor = (color) => {
    let result = { type: undefined, string: undefined, array: undefined }, b, c, d, e;
    if ((b = /^((?:rgb|hs[lv]|cmyk|hwb)a?)\s*\(([^\)]*)\)/.exec(String(color)))) {
        c = b[1];
        d = c.replace(/a$/, "");
        e = d === "cmyk" ? 4 : 3;
        b[2] = b[2]
            .replace(/^\s+|\s+$/g, "")
            .split(/\s*,\s*/)
            .map((x, i) => {
            if (/%$/.test(x) && i === e) {
                return parseFloat(x) / 100;
            }
            else if (/%$/.test(x)) {
                return parseFloat(x);
            }
            return parseFloat(x);
        });
        result.type = d;
        result.string = color;
        result.array = b[2];
    }
    else if (/^#[A-Fa-f0-9]+$/.test(color)) {
        result.type = "hex";
        result.string = color;
        result.array = (0, exports.hexToRgb)(color);
    }
    else if (Object.keys(exports.colorNames).includes(String(color).toLowerCase())) {
        result.type = "name";
        result.string = color;
        result.array = (0, exports.hexToRgb)(exports.colorNames[color]);
    }
    return result;
};
exports.infoColor = infoColor;
class Color {
    constructor(color = "#000000") {
        this.value = "#000000";
        this.value = Array.isArray(color) ? exports.rgbToHex.apply(null, color) : color;
        this.info = (0, exports.infoColor)(this.value);
        this.type = this.info.type;
        const defaultProps = {
            rgb: [0, 0, 0],
            string: "#000000",
            hex: "#000000",
            hsl: [0, 0, 0],
            hsv: [0, 0, 0],
            cmyk: [0, 0, 0, 0],
            hwb: [0, 0, 0],
        };
        if (Array.isArray(this.info.array)) {
            switch (this.type) {
                case "name":
                    this.props = Color.colorName(this.value);
                    break;
                case "hex":
                    this.props = Color.hex(this.value);
                    break;
                case "rgb":
                    this.props = Color.rgb.apply(null, this.info.array);
                    break;
                case "hsl":
                    this.props = Color.hsl.apply(null, this.info.array);
                    break;
                case "cmyk":
                    this.props = Color.cmyk.apply(null, this.info.array);
                    break;
                case "hwb":
                    this.props = Color.hwb.apply(null, this.info.array);
                    break;
                case "hsv":
                    this.props = Color.hsv.apply(null, this.info.array);
                    break;
                default:
                    this.props = defaultProps;
            }
        }
        else {
            this.props = defaultProps;
        }
    }
    get isValidColor() {
        return Color.isColor(this.value);
    }
    get hex() {
        return this.props.hex;
    }
    get rgb() {
        return "rgb(" + this.props.rgb.join(", ") + ")";
    }
    get hsl() {
        return "hsl(" + this.props.hsl.map((v, i) => v + (i > 0 ? "%" : "")).join(", ") + ")";
    }
    get hsv() {
        return "hsv(" + this.props.hsv.map((v, i) => v + (i > 0 ? "%" : "")).join(", ") + ")";
    }
    get cmyk() {
        return "cmyk(" + this.props.cmyk.join("%, ") + ")";
    }
    get hwb() {
        return "hwb(" + this.props.hsv.map((v, i) => v + (i > 0 ? "%" : "")).join(", ") + ")";
    }
    get string() {
        return this.props.string;
    }
    get vector() {
        return (0, exports.infoColor)(this.rgb).array;
    }
    distance(a) {
        return (0, exports.hslDistance)(this.props.hsl, new Color(a).props.hsl);
    }
    blend(a, b) {
        const c = (0, exports.blend)(this.props.rgb, new Color(a).props.rgb, b);
        return new Color("rgb(" + c.join(", ") + ")");
    }
    static blend(a, b, c) {
        return new Color(a).blend(b, c);
    }
    darken(a) {
        let b = (0, exports.darken)(this.props.rgb, a);
        return new Color("rgb(" + b.join(", ") + ")");
    }
    lighten(a) {
        let b = (0, exports.lighten)(this.props.rgb, a);
        return new Color("rgb(" + b.join(", ") + ")");
    }
    grayScale() {
        let b = (0, exports.grayScale)(this.props.rgb);
        return new Color("rgb(" + b.join(", ") + ")");
    }
    colorScale(a, b) {
        const c = (0, exports.colorScale)(this.props.rgb, new Color(a == undefined ? "#ffffff" : a).props.rgb, new Color(b == undefined ? "#000000" : b).props.rgb);
        return new Color("rgb(" + c.join(", ") + ")");
    }
    watershed() {
        let b = (0, exports.watershed)(this.props.rgb);
        return new Color("rgb(" + b.join(", ") + ")");
    }
    growing() {
        let b = (0, exports.growing)(this.props.rgb);
        return new Color("rgb(" + b.join(", ") + ")");
    }
    negative() {
        let b = (0, exports.negative)(this.props.rgb);
        return new Color("rgb(" + b.join(", ") + ")");
    }
    static isColor(color) {
        var _a;
        try {
            let b = (0, exports.infoColor)(color);
            if (["hex", "name", "rgb", "hsl", "hsv", "cmyk", "hwb", "rgba", "hsla", "hsva", "cmyka", "hwba"].includes((_a = b.type) !== null && _a !== void 0 ? _a : "")) {
                return true;
            }
        }
        catch (e) {
            return false;
        }
        return false;
    }
    static colorName(color) {
        const hex = exports.colorNames[color];
        let result = Color.hex(hex);
        result.string = String(color).toLowerCase();
        return result;
    }
    static hex(hex) {
        hex = String(hex);
        hex = "#" == hex.charAt(0) ? hex : "#" + hex;
        let hexTripletRe_ = /#(.)(.)(.)/, validHexColorRe_ = /^#(?:[0-9a-f]{3}){1,2}$/i, isValid = function (a) {
            return validHexColorRe_.test(a);
        }, normalizeHex = (a) => {
            if (!isValid(a))
                a = "#000000";
            4 == a.length && (a = a.replace(hexTripletRe_, "#$1$1$2$2$3$3"));
            return a.toLowerCase();
        };
        hex = normalizeHex(hex);
        let result = Color.rgb.apply(null, (0, exports.hexToRgb)(hex));
        result.string = hex;
        result.hex = hex;
        return result;
    }
    static rgb(a, b, c) {
        a = Math.round(Number(a));
        b = Math.round(Number(b));
        c = Math.round(Number(c));
        const rgb = [a, b, c];
        return {
            rgb,
            string: "rgb(" + rgb.join(", ") + ")",
            hex: (0, exports.rgbToHex)(a, b, c),
            hsl: (0, exports.rgbToHsl)(a, b, c),
            hsv: (0, exports.rgbToHsv)(a, b, c),
            cmyk: (0, exports.rgbToCmyk)(a, b, c),
            hwb: (0, exports.rgbToHwb)(a, b, c),
        };
    }
    static hsl(a, b, c) {
        a = Math.round(Number(a));
        b = Number(b) / 100;
        c = Number(c) / 100;
        const rgb = (0, exports.hslToRgb)(a, b, c);
        let result = Color.rgb.apply(null, rgb);
        result.hsl = [Math.round(a), Math.round(b * 100), Math.round(c * 100)];
        result.string = "hsl(" + result.hsl.map((v, i) => v + (i > 0 ? "%" : "")).join(", ") + ")";
        return result;
    }
    static hsv(a, b, c) {
        a = Math.round(Number(a));
        b = Number(b) / 100;
        c = Number(c) / 100;
        const rgb = (0, exports.hsvToRgb)(a, b, c);
        let result = Color.rgb.apply(null, rgb);
        result.hsv = [Math.round(a), Math.round(b * 100), Math.round(c * 100)];
        result.string = "hsv(" + result.hsv.map((v, i) => v + (i > 0 ? "%" : "")).join(", ") + ")";
        return result;
    }
    static cmyk(a, b, c, d) {
        a = Number(a) / 100;
        b = Number(b) / 100;
        c = Number(c) / 100;
        d = Number(d) / 100;
        const rgb = (0, exports.cmykToRgb)(a, b, c, d);
        let result = Color.rgb.apply(null, rgb);
        result.cmyk = [Math.round(a * 100), Math.round(b * 100), Math.round(c * 100), Math.round(d * 100)];
        result.string = "cmyk(" + result.cmyk.join("%, ") + "%)";
        return result;
    }
    static hwb(a, b, c) {
        a = Number(a) / 360;
        b = Number(b) / 100;
        c = Number(c) / 100;
        const rgb = (0, exports.hwbToRgb)(a, b, c);
        let result = Color.rgb.apply(null, rgb);
        result.hwb = [Math.round(a * 360), Math.round(b * 100), Math.round(c * 100)];
        result.string = "hwb(" + result.hwb.map((v, i) => v + (i > 0 ? "%" : "")).join(", ") + ")";
        return result;
    }
}
exports.default = Color;

},{}],68:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validation_1 = require("./validation");
const JSONStringify = (obj) => {
    const restOfDataTypes = (value) => {
        return (0, validation_1.isNumber)(value) || (0, validation_1.isString)(value) || (0, validation_1.isBoolean)(value);
    };
    const ignoreDataTypes = (value) => {
        return (0, validation_1.isUndefined)(value) || (0, validation_1.isFunction)(value) || (0, validation_1.isSymbol)(value);
    };
    const nullDataTypes = (value) => {
        return (0, validation_1.isNotNumber)(value) || (0, validation_1.isInfinity)(value) || (0, validation_1.isNull)(value);
    };
    const arrayValuesNullTypes = (value) => {
        return (0, validation_1.isNotNumber)(value) || (0, validation_1.isInfinity)(value) || (0, validation_1.isNull)(value) || ignoreDataTypes(value);
    };
    const removeComma = (str) => {
        const tempArr = str.split("");
        tempArr.pop();
        return tempArr.join("");
    };
    if (ignoreDataTypes(obj)) {
        return "{}";
    }
    if ((0, validation_1.isDate)(obj)) {
        return `"${new Date(obj).toISOString()}"`;
    }
    if (nullDataTypes(obj)) {
        return `${null}`;
    }
    if ((0, validation_1.isSymbol)(obj)) {
        return "{}";
    }
    if (restOfDataTypes(obj)) {
        return JSON.stringify(obj);
    }
    if ((0, validation_1.isArray)(obj)) {
        let arrStr = "";
        obj.forEach((eachValue) => {
            arrStr += arrayValuesNullTypes(eachValue) ? JSONStringify(null) : JSONStringify(eachValue);
            arrStr += ",";
        });
        return `[` + removeComma(arrStr) + `]`;
    }
    if ((0, validation_1.isObject)(obj)) {
        let objStr = "";
        const objKeys = Object.keys(obj);
        objKeys.forEach((eachKey) => {
            const eachValue = obj[eachKey];
            objStr += !ignoreDataTypes(eachValue) ? `"${eachKey}":${JSONStringify(eachValue)},` : "";
        });
        return `{` + removeComma(objStr) + `}`;
    }
    return "{}";
};
exports.default = JSONStringify;

},{"./validation":76}],69:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function runCallback(callback, data) {
    try {
        callback(data);
    }
    catch (err) {
        console.error("Error in subscription callback", err);
    }
}
const _subscriptions = Symbol("subscriptions");
const _oneTimeEvents = Symbol("oneTimeEvents");
class SimpleEventEmitter {
    constructor() {
        this[_subscriptions] = [];
        this[_oneTimeEvents] = new Map();
    }
    on(event, callback) {
        if (this[_oneTimeEvents].has(event)) {
            runCallback(callback, this[_oneTimeEvents].get(event));
        }
        else {
            this[_subscriptions].push({ event, callback, once: false });
        }
        const self = this;
        return {
            stop() {
                self.off(event, callback);
            },
        };
    }
    off(event, callback) {
        this[_subscriptions] = this[_subscriptions].filter((s) => s.event !== event || (callback && s.callback !== callback));
        return this;
    }
    once(event, callback) {
        return new Promise((resolve) => {
            const ourCallback = (data) => {
                resolve(data);
                callback === null || callback === void 0 ? void 0 : callback(data);
            };
            if (this[_oneTimeEvents].has(event)) {
                runCallback(ourCallback, this[_oneTimeEvents].get(event));
            }
            else {
                this[_subscriptions].push({
                    event,
                    callback: ourCallback,
                    once: true,
                });
            }
        });
    }
    emit(event, data) {
        if (this[_oneTimeEvents].has(event)) {
            throw new Error(`Event "${event}" was supposed to be emitted only once`);
        }
        for (let i = 0; i < this[_subscriptions].length; i++) {
            const s = this[_subscriptions][i];
            if (s.event !== event) {
                continue;
            }
            runCallback(s.callback, data);
            if (s.once) {
                this[_subscriptions].splice(i, 1);
                i--;
            }
        }
        return this;
    }
    emitOnce(event, data) {
        if (this[_oneTimeEvents].has(event)) {
            throw new Error(`Event "${event}" was supposed to be emitted only once`);
        }
        this.emit(event, data);
        this[_oneTimeEvents].set(event, data); // Mark event as being emitted once for future subscribers
        this.off(event); // Remove all listeners for this event, they won't fire again
        return this;
    }
    pipe(event, eventEmitter) {
        return this.on(event, (data) => {
            eventEmitter.emit(event, data);
        });
    }
    pipeOnce(event, eventEmitter) {
        return this.once(event, (data) => {
            eventEmitter.emitOnce(event, data);
        });
    }
}
exports.default = SimpleEventEmitter;

},{}],70:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mat4 = void 0;
exports.mat4 = __importStar(require("./mat4"));

},{"./mat4":71}],71:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transpose = exports.translate = exports.str = exports.scale = exports.rotateZ = exports.rotateY = exports.rotateX = exports.rotate = exports.perspectiveFromFieldOfView = exports.perspective = exports.ortho = exports.multiply = exports.lookAt = exports.invert = exports.identity = exports.frustum = exports.fromZRotation = exports.fromYRotation = exports.fromXRotation = exports.fromTranslation = exports.fromScaling = exports.fromRotationTranslation = exports.fromRotation = exports.fromQuat = exports.determinant = exports.create = exports.copy = exports.clone = exports.adjoint = void 0;
/**
 * Calculates the adjugate of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
const adjoint = (out, a) => {
    let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    out[0] = a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22);
    out[1] = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
    out[2] = a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12);
    out[3] = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
    out[4] = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
    out[5] = a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22);
    out[6] = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
    out[7] = a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12);
    out[8] = a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21);
    out[9] = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
    out[10] = a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11);
    out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
    out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
    out[13] = a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21);
    out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
    out[15] = a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11);
    return out;
};
exports.adjoint = adjoint;
/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {mat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */
const clone = (a) => {
    let out = new Float32Array(16);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};
exports.clone = clone;
/**
 * Copy the values from one mat4 to another
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
const copy = (out, a) => {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};
exports.copy = copy;
/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */
const create = () => {
    let out = new Float32Array(16);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
exports.create = create;
/**
 * Calculates the determinant of a mat4
 *
 * @param {mat4} a the source matrix
 * @returns {Number} determinant of a
 */
const determinant = (a) => {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15], b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    // Calculate the determinant
    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
};
exports.determinant = determinant;
/**
 * Creates a matrix from a quaternion rotation.
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @returns {mat4} out
 */
const fromQuat = (out, q) => {
    const x = q[0], y = q[1], z = q[2], w = q[3], x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, yx = y * x2, yy = y * y2, zx = z * x2, zy = z * y2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
    out[0] = 1 - yy - zz;
    out[1] = yx + wz;
    out[2] = zx - wy;
    out[3] = 0;
    out[4] = yx - wz;
    out[5] = 1 - xx - zz;
    out[6] = zy + wx;
    out[7] = 0;
    out[8] = zx + wy;
    out[9] = zy - wx;
    out[10] = 1 - xx - yy;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
exports.fromQuat = fromQuat;
/**
 * Creates a matrix from a given angle around a given axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.rotate(dest, dest, rad, axis)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @param {vec3} axis the axis to rotate around
 * @returns {mat4} out
 */
const fromRotation = (out, rad, axis) => {
    let s, c, t;
    let x = axis[0];
    let y = axis[1];
    let z = axis[2];
    let len = Math.sqrt(x * x + y * y + z * z);
    if (Math.abs(len) < 0.000001) {
        return null;
    }
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;
    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;
    // Perform rotation-specific matrix multiplication
    out[0] = x * x * t + c;
    out[1] = y * x * t + z * s;
    out[2] = z * x * t - y * s;
    out[3] = 0;
    out[4] = x * y * t - z * s;
    out[5] = y * y * t + c;
    out[6] = z * y * t + x * s;
    out[7] = 0;
    out[8] = x * z * t + y * s;
    out[9] = y * z * t - x * s;
    out[10] = z * z * t + c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
exports.fromRotation = fromRotation;
/**
 * Creates a matrix from a quaternion rotation and vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     let quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {vec3} v Translation vector
 * @returns {mat4} out
 */
const fromRotationTranslation = (out, q, v) => {
    // Quaternion math
    let x = q[0], y = q[1], z = q[2], w = q[3], x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
};
exports.fromRotationTranslation = fromRotationTranslation;
/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.scale(dest, dest, vec)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {vec3} v Scaling vector
 * @returns {mat4} out
 */
const fromScaling = (out, v) => {
    out[0] = v[0];
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = v[1];
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = v[2];
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
exports.fromScaling = fromScaling;
/**
 * Creates a matrix from a vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.translate(dest, dest, vec)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {vec3} v Translation vector
 * @returns {mat4} out
 */
const fromTranslation = (out, v) => {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
};
exports.fromTranslation = fromTranslation;
/**
 * Creates a matrix from the given angle around the X axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.rotateX(dest, dest, rad)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
const fromXRotation = (out, rad) => {
    const s = Math.sin(rad), c = Math.cos(rad);
    // Perform axis-specific matrix multiplication
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = c;
    out[6] = s;
    out[7] = 0;
    out[8] = 0;
    out[9] = -s;
    out[10] = c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
exports.fromXRotation = fromXRotation;
/**
 * Creates a matrix from the given angle around the Y axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.rotateY(dest, dest, rad)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
const fromYRotation = (out, rad) => {
    const s = Math.sin(rad), c = Math.cos(rad);
    // Perform axis-specific matrix multiplication
    out[0] = c;
    out[1] = 0;
    out[2] = -s;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = s;
    out[9] = 0;
    out[10] = c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
exports.fromYRotation = fromYRotation;
/**
 * Creates a matrix from the given angle around the Z axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.rotateZ(dest, dest, rad)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
const fromZRotation = (out, rad) => {
    let s = Math.sin(rad), c = Math.cos(rad);
    // Perform axis-specific matrix multiplication
    out[0] = c;
    out[1] = s;
    out[2] = 0;
    out[3] = 0;
    out[4] = -s;
    out[5] = c;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
exports.fromZRotation = fromZRotation;
/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Number} left Left bound of the frustum
 * @param {Number} right Right bound of the frustum
 * @param {Number} bottom Bottom bound of the frustum
 * @param {Number} top Top bound of the frustum
 * @param {Number} near Near bound of the frustum
 * @param {Number} far Far bound of the frustum
 * @returns {mat4} out
 */
const frustum = (out, left, right, bottom, top, near, far) => {
    let rl = 1 / (right - left), tb = 1 / (top - bottom), nf = 1 / (near - far);
    out[0] = near * 2 * rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = near * 2 * tb;
    out[6] = 0;
    out[7] = 0;
    out[8] = (right + left) * rl;
    out[9] = (top + bottom) * tb;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = far * near * 2 * nf;
    out[15] = 0;
    return out;
};
exports.frustum = frustum;
/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */
const identity = (out) => {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
exports.identity = identity;
/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
const invert = (out, a) => {
    let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15], b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32, 
    // Calculate the determinant
    det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) {
        return null;
    }
    det = 1.0 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
};
exports.invert = invert;
/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {vec3} eye Position of the viewer
 * @param {vec3} center Point the viewer is looking at
 * @param {vec3} up vec3 pointing up
 * @returns {mat4} out
 */
const lookAt = (out, eye, center, up) => {
    let x0, x1, x2, y0, y1, y2, z0, z1, z2, len, eyex = eye[0], eyey = eye[1], eyez = eye[2], upx = up[0], upy = up[1], upz = up[2], centerx = center[0], centery = center[1], centerz = center[2];
    if (Math.abs(eyex - centerx) < 0.000001 && Math.abs(eyey - centery) < 0.000001 && Math.abs(eyez - centerz) < 0.000001) {
        return (0, exports.identity)(out);
    }
    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;
    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;
    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
        x0 = 0;
        x1 = 0;
        x2 = 0;
    }
    else {
        len = 1 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
    }
    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;
    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
        y0 = 0;
        y1 = 0;
        y2 = 0;
    }
    else {
        len = 1 / len;
        y0 *= len;
        y1 *= len;
        y2 *= len;
    }
    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;
    return out;
};
exports.lookAt = lookAt;
/**
 * Multiplies two mat4's
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @returns {mat4} out
 */
const multiply = (out, a, b) => {
    let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    // Cache only the current line of the second matrix
    let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[4];
    b1 = b[5];
    b2 = b[6];
    b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[8];
    b1 = b[9];
    b2 = b[10];
    b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[12];
    b1 = b[13];
    b2 = b[14];
    b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return out;
};
exports.multiply = multiply;
/**
 * Generates a orthogonal projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
const ortho = (out, left, right, bottom, top, near, far) => {
    let lr = 1 / (left - right), bt = 1 / (bottom - top), nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
};
exports.ortho = ortho;
/**
 * Generates a perspective projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
const perspective = (out, fovy, aspect, near, far) => {
    let f = 1.0 / Math.tan(fovy / 2), nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = 2 * far * near * nf;
    out[15] = 0;
    return out;
};
exports.perspective = perspective;
/**
 * Generates a perspective projection matrix with the given field of view.
 * This is primarily useful for generating projection matrices to be used
 * with the still experiemental WebVR API.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {object} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
const perspectiveFromFieldOfView = (out, fov, near, far) => {
    let upTan = Math.tan((fov.upDegrees * Math.PI) / 180.0), downTan = Math.tan((fov.downDegrees * Math.PI) / 180.0), leftTan = Math.tan((fov.leftDegrees * Math.PI) / 180.0), rightTan = Math.tan((fov.rightDegrees * Math.PI) / 180.0), xScale = 2.0 / (leftTan + rightTan), yScale = 2.0 / (upTan + downTan);
    out[0] = xScale;
    out[1] = 0.0;
    out[2] = 0.0;
    out[3] = 0.0;
    out[4] = 0.0;
    out[5] = yScale;
    out[6] = 0.0;
    out[7] = 0.0;
    out[8] = -((leftTan - rightTan) * xScale * 0.5);
    out[9] = (upTan - downTan) * yScale * 0.5;
    out[10] = far / (near - far);
    out[11] = -1.0;
    out[12] = 0.0;
    out[13] = 0.0;
    out[14] = (far * near) / (near - far);
    out[15] = 0.0;
    return out;
};
exports.perspectiveFromFieldOfView = perspectiveFromFieldOfView;
/**
 * Rotates a mat4 by the given angle
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {vec3} axis the axis to rotate around
 * @returns {mat4} out
 */
const rotate = (out, a, rad, axis) => {
    let x = axis[0], y = axis[1], z = axis[2], len = Math.sqrt(x * x + y * y + z * z), s, c, t, a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, b00, b01, b02, b10, b11, b12, b20, b21, b22;
    if (Math.abs(len) < 0.000001) {
        return null;
    }
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;
    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    // Construct the elements of the rotation matrix
    b00 = x * x * t + c;
    b01 = y * x * t + z * s;
    b02 = z * x * t - y * s;
    b10 = x * y * t - z * s;
    b11 = y * y * t + c;
    b12 = z * y * t + x * s;
    b20 = x * z * t + y * s;
    b21 = y * z * t - x * s;
    b22 = z * z * t + c;
    // Perform rotation-specific matrix multiplication
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;
    if (a !== out) {
        // If the source and destination differ, copy the unchanged last row
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }
    return out;
};
exports.rotate = rotate;
/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
const rotateX = (out, a, rad) => {
    let s = Math.sin(rad), c = Math.cos(rad), a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    if (a !== out) {
        // If the source and destination differ, copy the unchanged rows
        out[0] = a[0];
        out[1] = a[1];
        out[2] = a[2];
        out[3] = a[3];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }
    // Perform axis-specific matrix multiplication
    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    return out;
};
exports.rotateX = rotateX;
/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
const rotateY = (out, a, rad) => {
    let s = Math.sin(rad), c = Math.cos(rad), a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    if (a !== out) {
        // If the source and destination differ, copy the unchanged rows
        out[4] = a[4];
        out[5] = a[5];
        out[6] = a[6];
        out[7] = a[7];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }
    // Perform axis-specific matrix multiplication
    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    return out;
};
exports.rotateY = rotateY;
/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
const rotateZ = (out, a, rad) => {
    let s = Math.sin(rad), c = Math.cos(rad), a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    if (a !== out) {
        // If the source and destination differ, copy the unchanged last row
        out[8] = a[8];
        out[9] = a[9];
        out[10] = a[10];
        out[11] = a[11];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }
    // Perform axis-specific matrix multiplication
    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    return out;
};
exports.rotateZ = rotateZ;
/**
 * Scales the mat4 by the dimensions in the given vec3
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to scale
 * @param {vec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/
const scale = (out, a, v) => {
    let x = v[0], y = v[1], z = v[2];
    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};
exports.scale = scale;
/**
 * Returns a string representation of a mat4
 *
 * @param {mat4} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
const str = (a) => {
    return ("mat4(" +
        a[0] +
        ", " +
        a[1] +
        ", " +
        a[2] +
        ", " +
        a[3] +
        ", " +
        a[4] +
        ", " +
        a[5] +
        ", " +
        a[6] +
        ", " +
        a[7] +
        ", " +
        a[8] +
        ", " +
        a[9] +
        ", " +
        a[10] +
        ", " +
        a[11] +
        ", " +
        a[12] +
        ", " +
        a[13] +
        ", " +
        a[14] +
        ", " +
        a[15] +
        ")");
};
exports.str = str;
/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to translate
 * @param {vec3} v vector to translate by
 * @returns {mat4} out
 */
const translate = (out, a, v) => {
    let x = v[0], y = v[1], z = v[2], a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23;
    if (a === out) {
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    }
    else {
        a00 = a[0];
        a01 = a[1];
        a02 = a[2];
        a03 = a[3];
        a10 = a[4];
        a11 = a[5];
        a12 = a[6];
        a13 = a[7];
        a20 = a[8];
        a21 = a[9];
        a22 = a[10];
        a23 = a[11];
        out[0] = a00;
        out[1] = a01;
        out[2] = a02;
        out[3] = a03;
        out[4] = a10;
        out[5] = a11;
        out[6] = a12;
        out[7] = a13;
        out[8] = a20;
        out[9] = a21;
        out[10] = a22;
        out[11] = a23;
        out[12] = a00 * x + a10 * y + a20 * z + a[12];
        out[13] = a01 * x + a11 * y + a21 * z + a[13];
        out[14] = a02 * x + a12 * y + a22 * z + a[14];
        out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }
    return out;
};
exports.translate = translate;
/**
 * Transpose the values of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
const transpose = (out, a) => {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        let a01 = a[1], a02 = a[2], a03 = a[3], a12 = a[6], a13 = a[7], a23 = a[11];
        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a01;
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a02;
        out[9] = a12;
        out[11] = a[14];
        out[12] = a03;
        out[13] = a13;
        out[14] = a23;
    }
    else {
        out[0] = a[0];
        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a[1];
        out[5] = a[5];
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a[2];
        out[9] = a[6];
        out[10] = a[10];
        out[11] = a[14];
        out[12] = a[3];
        out[13] = a[7];
        out[14] = a[11];
        out[15] = a[15];
    }
    return out;
};
exports.transpose = transpose;

},{}],72:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleEventEmitter = exports.Ascii85 = exports.ColorUtils = exports.Color = exports.BezierEasing = exports.Base64 = exports.gl = exports.mergeClasses = exports.JSONStringify = void 0;
var JSONStringify_1 = require("./JSONStringify");
Object.defineProperty(exports, "JSONStringify", { enumerable: true, get: function () { return __importDefault(JSONStringify_1).default; } });
var mergeClasses_1 = require("./mergeClasses");
Object.defineProperty(exports, "mergeClasses", { enumerable: true, get: function () { return __importDefault(mergeClasses_1).default; } });
__exportStar(require("./mimeTypeFromBuffer"), exports);
__exportStar(require("./utils"), exports);
__exportStar(require("./validation"), exports);
exports.gl = __importStar(require("./gl"));
var Base64_1 = require("./Base64");
Object.defineProperty(exports, "Base64", { enumerable: true, get: function () { return __importDefault(Base64_1).default; } });
var BezierEasing_1 = require("./BezierEasing");
Object.defineProperty(exports, "BezierEasing", { enumerable: true, get: function () { return __importDefault(BezierEasing_1).default; } });
var Color_1 = require("./Color");
Object.defineProperty(exports, "Color", { enumerable: true, get: function () { return __importDefault(Color_1).default; } });
exports.ColorUtils = __importStar(require("./Color"));
var Ascii85_1 = require("./Ascii85");
Object.defineProperty(exports, "Ascii85", { enumerable: true, get: function () { return __importDefault(Ascii85_1).default; } });
var SimpleEventEmitter_1 = require("./SimpleEventEmitter");
Object.defineProperty(exports, "SimpleEventEmitter", { enumerable: true, get: function () { return __importDefault(SimpleEventEmitter_1).default; } });

},{"./Ascii85":64,"./Base64":65,"./BezierEasing":66,"./Color":67,"./JSONStringify":68,"./SimpleEventEmitter":69,"./gl":70,"./mergeClasses":73,"./mimeTypeFromBuffer":74,"./utils":75,"./validation":76}],73:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const findProtoNames = (i) => {
    let names = [];
    let c = i.constructor;
    do {
        const n = Object.getOwnPropertyNames(c.prototype);
        names = names.concat(n.filter((s) => s !== "constructor"));
        c = Object.getPrototypeOf(c);
    } while (c.prototype);
    return names;
};
const wrapProto = (i) => {
    const names = findProtoNames(i);
    const o = {};
    for (const name of names) {
        if (typeof i[name] !== "function") {
            continue;
        }
        o[name] = function (...args) {
            return i[name].apply(i, args);
        };
    }
    return o;
};
const assignProperties = (a, b) => {
    for (const propName of Object.keys(b)) {
        if (a.hasOwnProperty(propName)) {
            continue;
        }
        Object.defineProperty(a, propName, {
            get: function () {
                return b[propName];
            },
            set: function (value) {
                b[propName] = value;
            },
        });
    }
    return a;
};
const mergeClasses = (a, b) => {
    if (b.constructor.name === "Object") {
        return Object.assign(a, b);
    }
    else {
        const wrapper = wrapProto(b);
        a = assignProperties(a, b);
        return assignProperties(a, wrapper);
    }
};
exports.default = mergeClasses;

},{}],74:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mimeTypeFromBuffer = void 0;
const mimeTypes = {
    "ffd8ffe000104a464946": "image/jpeg",
    "89504e470d0a1a0a0000": "image/png",
    "47494638396126026f01": "image/gif",
    "52494646574f455053": "image/webp",
    "464c4946": "image/flif",
    "424d": "image/bmp",
    "49492a00": "image/tiff",
    "4d4d002a": "image/tiff",
    "49492a00100000004352": "image/tiff",
    "4d4d002a000000005200": "image/tiff",
    "654c696673": "image/x-xcf",
    "4954534608000000600000": "image/x-canon-cr2",
    "495453461a00000003000000": "image/x-canon-cr3",
    "414f4c4949": "image/vnd.ms-photo",
    "38425053": "image/vnd.adobe.photoshop",
    "3c3f78646f636d656e74": "application/x-indesign",
    "504b0304": "application/epub+zip",
    //   '504b0304': 'application/x-xpinstall',  // XPI (Firefox Add-on)
    //   '504b0304': 'application/zip',       // ZIP
    "526172211a0700cf9073": "application/x-rar-compressed",
    "504b0708": "application/x-rar-compressed",
    "504b0304140006000800": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "d0cf11e0a1b11ae10000": "application/msword",
    "25504446": "application/pdf",
    "1f8b08": "application/gzip",
    "1f9d90": "application/x-tar",
    "425a68": "application/x-bzip2",
    "377abcaf271c": "application/x-7z-compressed",
    "425a68393141524320202020202000": "application/x-7z-compressed",
    "4d534346": "application/x-apple-diskimage",
    "61726301": "application/x-apache-arrow",
    "66747970": "video/mp4",
    "4d546864": "audio/midi",
    "1a45dfa3": "video/x-matroska",
    "1a45dfa3010000000000": "video/x-matroska",
    //   '1a45dfa3010000000000': 'video/webm', // WebM
    "00000014667479706d703432": "video/webm",
    "77415645": "video/quicktime",
    //   '52494646': 'video/vnd.avi',         // AVI
    //   '52494646': 'video/x-msvideo',       // AVI
    //   '52494646': 'video/x-msvideo',       // AVI
    //   '52494646': 'video/msvideo',         // AVI
    //   '52494646': 'video/x-avi',           // AVI
    "52494646": "video/mp4",
    "524946464f4500013000": "video/mpeg",
    //   '52494646': 'video/3gpp',            // 3GP
    "fffb": "audio/mpeg",
    "fff3": "audio/mp3",
    "666675": "audio/opus",
    "4f676753": "video/ogg",
    //   '4f676753': 'audio/ogg',             // OGG (Ogg Audio)
    //   '4f676753': 'application/ogg',       // OGG (Ogg Container)
    "664c6143": "audio/x-flac",
    "41564520": "audio/ape",
    "7776706b": "audio/wavpack",
    "464f524d00": "audio/amr",
    "7f454c46": "application/x-elf",
    //   '4d5a': 'application/x-msdownload',  // EXE (Windows Executable)
    "436f6e74656e742d74797065": "application/x-shockwave-flash",
    "7b5c727466": "application/rtf",
    "0061736d": "application/wasm",
    "774f4646": "audio/x-wav",
    "d46d9d6c": "audio/x-musepack",
    "0d0a0d0a": "text/calendar",
    "42494638": "video/x-flv",
    //   '252150532d41646f6265': 'application/postscript', // PostScript
    "252150532d41646f6265": "application/eps",
    "fd377a585a00": "application/x-xz",
    "53514c69746520666f726d6174203300": "application/x-sqlite3",
    "4e45531a": "application/x-nintendo-nes-rom",
    //   '504b0304140006000800': 'application/x-google-chrome-extension', // CRX (Chrome Extension)
    //   '4d534346': 'application/vnd.ms-cab-compressed', // CAB (Microsoft Cabinet File)
    "21": "text/plain",
    "314159265359": "text/plain",
    "7801730d626260": "text/plain",
    "7865726d": "text/plain",
    "63757368000000020000": "text/plain",
    "49545346": "application/x-deb",
    //   '1f8b08': 'application/x-compress',  // COMPRESS (Compress)
    "504b030414": "application/x-compress",
    //   '504b0708': 'application/x-lzip',    // LZ (Lzip)
    //   '504b0304': 'application/x-cfb',     // CFB (Compound File Binary)
    //   '504b0304': 'application/x-mie',     // MIE (MIE)
    //   '1a45dfa3': 'application/mxf',       // MXF (Material Exchange Format)
    "0000001a667479703367706832": "video/mp2t",
    "424c5030": "application/x-blender",
    "4250473031": "image/bpg",
    "4a2d2d20": "image/j2c",
    "0000000cjp2": "image/jp2",
    "0d0a870a": "image/jpx",
    "6a5020200d0a870a": "image/jpx",
    "000000186a703268": "image/jpx",
    "6d6a703268": "image/jpm",
    "4d4a32": "image/mj2",
    //   '464f524d00': 'audio/aiff',          // AIFF (Audio Interchange File Format)
    "464f524d20": "audio/aiff",
    "3c3f786d6c": "application/xml",
    //   '3c3f786d6c': 'text/xml',            // XML (alternative)
    "7573746172": "application/tar+gzip",
    "465753": "application/x-mobipocket-ebook",
    "667479706d6f6f6d": "application/vnd.tcpdump.pcap",
    "444d5321": "audio/x-dsf",
    "4c495445": "application/x.ms.shortcut",
    "53746f7261676554696d6573": "application/x.apple.alias",
    "46575320": "application/x-mobipocket-ebook",
    "6f6c796d7075733f6772652d": "audio/opus",
    //   '47494638': 'image/apng',            // APNG
    "4f52494643": "image/x-olympus-orf",
    "49534328": "image/x-sony-arw",
    "49534344": "image/x-adobe-dng",
    "49545046": "image/x-panasonic-rw2",
    "465547464946": "image/x-fujifilm-raf",
    //   '1a45dfa3010000000000': 'video/x-m4v', // M4V
    "667479702": "video/3gpp2",
    //   '504b030414': 'application/x-esri-shape', // SHP (Esri Shapefile)
    "fff30000": "audio/aac",
    "466f726d6174203300": "audio/x-it",
    //   '4d546864': 'audio/x-m4a',           // M4A
    //   '504b0304140006000800': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX (PowerPoint)
    "44534420": "application/x-esri-shape",
    "494433": "audio/aac",
    //   '504b0304140006000800': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX (Excel)
    //   '504b0304140006000800': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX (Word)
    "5a4f4f20": "application/x-xz",
    "fdfd580000": "application/x-sqlite3",
    "50616e20636f6f6b696e": "image/x-icon",
    "47494638": "image/gif",
    "4649463837610111": "image/vnd.adobe.photoshop",
    "0000010000": "application/x-elf",
    "4d5a": "application/x-msdownload",
    //   '464f524d00': 'audio/x-dsf',         // DSD (Direct Stream Digital)
    //   '4c495445': 'application/x.ms.shortcut', // LNK (Windows Shortcut)
    "437265617469766520436f6d6d656e74": "application/vnd.ms-htmlhelp",
    //   '4d534346': 'application/vnd.ms-cab-compressed', // CAB (Microsoft Cabinet File)
    "415647": "model/stl",
    "6d737132": "model/3mf",
    "000001c0": "image/jxl",
    "b501": "application/zstd",
    "4a4c53": "image/jls",
    //   'd0cf11e0a1b11ae10000': 'application/x-ole-storage', // OLE (Object Linking and Embedding)
    "e3828596": "audio/x-rmf",
    "2345584548494c5": "application/vnd.ms-outlook",
    "0c6d6b6e6f74656e73": "audio/x-mid",
    //   '4d534346': 'application/java-vm',   // JAR (Java Archive)
    "1a0b617272616e673135": "application/x-arj",
    //   '1f9d90': 'application/x-iso9660-image', // ISO (International Organization for Standardization)
    "6173642020202020202020202020202020202020202020202020202020202020202020202020202020202020202020202020": "application/x-squashfs",
    "3026b2758e66cf11a6d900aa0062ce6c": "application/x-msdownload",
    "536c595845": "application/vnd.iccprofile", // ICC (International Color Consortium)
};
const mimeTypeFromBuffer = (buffer) => {
    const header = buffer.toString("hex", 0, 16);
    for (const magicNumber in mimeTypes) {
        if (header.startsWith(magicNumber)) {
            return mimeTypes[magicNumber];
        }
    }
    return "application/octet-stream";
};
exports.mimeTypeFromBuffer = mimeTypeFromBuffer;

},{}],75:[function(require,module,exports){
(function (process,global,Buffer){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.objectToUrlParams = exports.getAllUrlParams = exports.bytesToNumber = exports.numberToBytes = exports.decodeString = exports.encodeString = exports.defer = exports.getGlobalObject = exports.deepEqual = exports.safeGet = exports.contains = exports.uuidv4 = exports.asyncForEach = void 0;
const validation_1 = require("./validation");
const asyncForEach = (array, callback) => {
    return new Promise(async (resolve, reject) => {
        try {
            for (let i = 0; i < array.length; i++) {
                await callback(array[i], i, array);
            }
            resolve();
        }
        catch (e) {
            reject(e);
        }
    });
};
exports.asyncForEach = asyncForEach;
function uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
exports.uuidv4 = uuidv4;
function contains(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}
exports.contains = contains;
function safeGet(obj, key) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
        return obj[key];
    }
    else {
        return undefined;
    }
}
exports.safeGet = safeGet;
/**
 * Deep equal two objects. Support Arrays and Objects.
 */
function deepEqual(a, b) {
    if (a === b) {
        return true;
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    for (const k of aKeys) {
        if (!bKeys.includes(k)) {
            return false;
        }
        const aProp = a[k];
        const bProp = b[k];
        if ((0, validation_1.isObject)(aProp) && (0, validation_1.isObject)(bProp)) {
            if (!deepEqual(aProp, bProp)) {
                return false;
            }
        }
        else if (aProp !== bProp) {
            return false;
        }
    }
    for (const k of bKeys) {
        if (!aKeys.includes(k)) {
            return false;
        }
    }
    return true;
}
exports.deepEqual = deepEqual;
function getGlobalObject() {
    if (typeof globalThis !== "undefined") {
        return globalThis;
    }
    if (typeof self !== "undefined") {
        return self;
    }
    if (typeof window !== "undefined") {
        return window;
    }
    if (typeof global !== "undefined") {
        return global;
    }
    throw new Error("Unable to locate global object.");
}
exports.getGlobalObject = getGlobalObject;
function defer(fn) {
    process.nextTick(fn);
}
exports.defer = defer;
/**
 * Converts a string to a utf-8 encoded Uint8Array
 */
function encodeString(str) {
    if (typeof TextEncoder !== "undefined") {
        // Modern browsers, Node.js v11.0.0+ (or v8.3.0+ with util.TextEncoder)
        const encoder = new TextEncoder();
        return encoder.encode(str);
    }
    else if (typeof Buffer === "function") {
        // Node.js
        const buf = Buffer.from(str, "utf-8");
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    else {
        // Older browsers. Manually encode
        const arr = [];
        for (let i = 0; i < str.length; i++) {
            let code = str.charCodeAt(i);
            if (code > 128) {
                // Attempt simple UTF-8 conversion. See https://en.wikipedia.org/wiki/UTF-8
                if ((code & 0xd800) === 0xd800) {
                    // code starts with 1101 10...: this is a 2-part utf-16 char code
                    const nextCode = str.charCodeAt(i + 1);
                    if ((nextCode & 0xdc00) !== 0xdc00) {
                        // next code must start with 1101 11...
                        throw new Error("follow-up utf-16 character does not start with 0xDC00");
                    }
                    i++;
                    const p1 = code & 0x3ff; // Only use last 10 bits
                    const p2 = nextCode & 0x3ff;
                    // Create code point from these 2: (see https://en.wikipedia.org/wiki/UTF-16)
                    code = 0x10000 | (p1 << 10) | p2;
                }
                if (code < 2048) {
                    // Use 2 bytes for 11 bit value, first byte starts with 110xxxxx (0xc0), 2nd byte with 10xxxxxx (0x80)
                    const b1 = 0xc0 | ((code >> 6) & 0x1f); // 0xc0 = 11000000, 0x1f = 11111
                    const b2 = 0x80 | (code & 0x3f); // 0x80 = 10000000, 0x3f = 111111
                    arr.push(b1, b2);
                }
                else if (code < 65536) {
                    // Use 3 bytes for 16-bit value, bits per byte: 4, 6, 6
                    const b1 = 0xe0 | ((code >> 12) & 0xf); // 0xe0 = 11100000, 0xf = 1111
                    const b2 = 0x80 | ((code >> 6) & 0x3f); // 0x80 = 10000000, 0x3f = 111111
                    const b3 = 0x80 | (code & 0x3f);
                    arr.push(b1, b2, b3);
                }
                else if (code < 2097152) {
                    // Use 4 bytes for 21-bit value, bits per byte: 3, 6, 6, 6
                    const b1 = 0xf0 | ((code >> 18) & 0x7); // 0xf0 = 11110000, 0x7 = 111
                    const b2 = 0x80 | ((code >> 12) & 0x3f); // 0x80 = 10000000, 0x3f = 111111
                    const b3 = 0x80 | ((code >> 6) & 0x3f); // 0x80 = 10000000, 0x3f = 111111
                    const b4 = 0x80 | (code & 0x3f);
                    arr.push(b1, b2, b3, b4);
                }
                else {
                    throw new Error(`Cannot convert character ${str.charAt(i)} (code ${code}) to utf-8`);
                }
            }
            else {
                arr.push(code < 128 ? code : 63); // 63 = ?
            }
        }
        return new Uint8Array(arr);
    }
}
exports.encodeString = encodeString;
/**
 * Converts a utf-8 encoded buffer to string
 */
function decodeString(buffer) {
    // ArrayBuffer|
    if (typeof TextDecoder !== "undefined") {
        // Modern browsers, Node.js v11.0.0+ (or v8.3.0+ with util.TextDecoder)
        const decoder = new TextDecoder();
        if (buffer instanceof Uint8Array) {
            return decoder.decode(buffer);
        }
        const buf = Uint8Array.from(buffer);
        return decoder.decode(buf);
    }
    else if (typeof Buffer === "function") {
        // Node.js (v10 and below)
        if (buffer instanceof Array) {
            buffer = Uint8Array.from(buffer); // convert to typed array
        }
        if (!(buffer instanceof Buffer) && "buffer" in buffer && buffer.buffer instanceof ArrayBuffer) {
            const typedArray = buffer;
            buffer = Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength); // Convert typed array to node.js Buffer
        }
        if (!(buffer instanceof Buffer)) {
            throw new Error("Unsupported buffer argument");
        }
        return buffer.toString("utf-8");
    }
    else {
        // Older browsers. Manually decode!
        if (!(buffer instanceof Uint8Array) && "buffer" in buffer && buffer["buffer"] instanceof ArrayBuffer) {
            // Convert TypedArray to Uint8Array
            const typedArray = buffer;
            buffer = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
        }
        if (buffer instanceof Buffer || buffer instanceof Array || buffer instanceof Uint8Array) {
            let str = "";
            for (let i = 0; i < buffer.length; i++) {
                let code = buffer[i];
                if (code > 128) {
                    // Decode Unicode character
                    if ((code & 0xf0) === 0xf0) {
                        // 4 byte char
                        const b1 = code, b2 = buffer[i + 1], b3 = buffer[i + 2], b4 = buffer[i + 3];
                        code = ((b1 & 0x7) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f);
                        i += 3;
                    }
                    else if ((code & 0xe0) === 0xe0) {
                        // 3 byte char
                        const b1 = code, b2 = buffer[i + 1], b3 = buffer[i + 2];
                        code = ((b1 & 0xf) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
                        i += 2;
                    }
                    else if ((code & 0xc0) === 0xc0) {
                        // 2 byte char
                        const b1 = code, b2 = buffer[i + 1];
                        code = ((b1 & 0x1f) << 6) | (b2 & 0x3f);
                        i++;
                    }
                    else {
                        throw new Error("invalid utf-8 data");
                    }
                }
                if (code >= 65536) {
                    // Split into 2-part utf-16 char codes
                    code ^= 0x10000;
                    const p1 = 0xd800 | (code >> 10);
                    const p2 = 0xdc00 | (code & 0x3ff);
                    str += String.fromCharCode(p1);
                    str += String.fromCharCode(p2);
                }
                else {
                    str += String.fromCharCode(code);
                }
            }
            return str;
        }
        else {
            throw new Error("Unsupported buffer argument");
        }
    }
}
exports.decodeString = decodeString;
function numberToBytes(number) {
    const bytes = new Uint8Array(8);
    const view = new DataView(bytes.buffer);
    view.setFloat64(0, number);
    return new Array(...bytes);
}
exports.numberToBytes = numberToBytes;
function bytesToNumber(bytes) {
    const length = Array.isArray(bytes) ? bytes.length : bytes.byteLength;
    if (length !== 8) {
        throw new TypeError("must be 8 bytes");
    }
    const bin = new Uint8Array(bytes);
    const view = new DataView(bin.buffer);
    const nr = view.getFloat64(0);
    return nr;
}
exports.bytesToNumber = bytesToNumber;
function getAllUrlParams(url) {
    let queryString = url ? url.split("?")[1] : typeof window !== "undefined" && window.location && window.location.search ? window.location.search.slice(1) : "";
    let obj = {};
    if (queryString) {
        queryString = queryString.split("#")[0];
        let arr = queryString.split("&");
        for (let i = 0; i < arr.length; i++) {
            let a = arr[i].split("=");
            let paramName = a[0];
            let paramValue = typeof a[1] === "undefined" ? true : a[1];
            paramName = paramName.toLowerCase();
            if (typeof paramValue === "string") {
                paramValue = decodeURIComponent(paramValue).toLowerCase();
            }
            if (/\[(\d+)?\]$/.test(paramName)) {
                let key = paramName.replace(/\[(\d+)?\]/, "");
                if (!obj[key])
                    obj[key] = [];
                if (/\[\d+\]$/.test(paramName)) {
                    let index = parseInt(/\[(\d+)\]/.exec(paramName)[1]);
                    obj[key][index] = paramValue;
                }
                else {
                    obj[key].push(paramValue);
                }
            }
            else {
                if (!obj[paramName]) {
                    obj[paramName] = paramValue;
                }
                else if (obj[paramName] && typeof obj[paramName] === "string") {
                    obj[paramName] = [obj[paramName]];
                    obj[paramName].push(paramValue);
                }
                else {
                    obj[paramName].push(paramValue);
                }
            }
        }
    }
    return obj;
}
exports.getAllUrlParams = getAllUrlParams;
function objectToUrlParams(obj) {
    return Object.keys(obj)
        .map((key) => {
        const value = obj[key];
        if (Array.isArray(value)) {
            return value.map((val) => `${encodeURIComponent(key)}[]=${encodeURIComponent(val)}`).join("&");
        }
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
        .join("&");
}
exports.objectToUrlParams = objectToUrlParams;

}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"./validation":76,"_process":102,"buffer":37}],76:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEmpty = exports.isUrlValid = exports.isPhoneValid = exports.isPasswordValid = exports.isEmailValid = exports.isBuffer = exports.isSymbol = exports.isFunction = exports.isUndefined = exports.isDate = exports.isInfinity = exports.isNotNumber = exports.isNull = exports.isFloat = exports.isInt = exports.isNumberValid = exports.isNumber = exports.isBoolean = exports.isString = exports.isJson = exports.isObject = exports.isTypedArray = exports.isArray = void 0;
const isArray = (value) => {
    return Array.isArray(value) && typeof value === "object";
};
exports.isArray = isArray;
const isTypedArray = (value) => typeof value === "object" && ["ArrayBuffer", "Buffer", "Uint8Array", "Uint16Array", "Uint32Array", "Int8Array", "Int16Array", "Int32Array"].includes(value.constructor.name);
exports.isTypedArray = isTypedArray;
const isObject = (value) => {
    return typeof value === "object" && value !== null && !Array.isArray(value);
};
exports.isObject = isObject;
const isJson = (value) => {
    try {
        const result = JSON.parse(typeof value === "string" ? value : JSON.stringify(value));
        return (0, exports.isObject)(result);
    }
    catch (_a) {
        return false;
    }
};
exports.isJson = isJson;
const isString = (value) => {
    return typeof value === "string";
};
exports.isString = isString;
const isBoolean = (value) => {
    return typeof value === "boolean";
};
exports.isBoolean = isBoolean;
const isNumber = (value) => {
    return typeof value === "number" && Number(value) === value;
};
exports.isNumber = isNumber;
const isNumberValid = (value) => {
    if (typeof value === "number")
        return true;
    if (typeof value !== "string")
        return false;
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num) && /^(\-)?\d+(\.\d+)?$/.test(value);
};
exports.isNumberValid = isNumberValid;
const isInt = (value) => {
    return (0, exports.isNumber)(value) && value % 1 === 0;
};
exports.isInt = isInt;
const isFloat = (value) => {
    return (0, exports.isNumber)(value) && value % 1 !== 0;
};
exports.isFloat = isFloat;
const isNull = (value) => {
    return value === null && typeof value === "object";
};
exports.isNull = isNull;
const isNotNumber = (value) => {
    return typeof value === "number" && isNaN(value);
};
exports.isNotNumber = isNotNumber;
const isInfinity = (value) => {
    return typeof value === "number" && !isFinite(value);
};
exports.isInfinity = isInfinity;
const isDate = (value) => {
    return (value instanceof Date ||
        (typeof value === "object" && value !== null && typeof value.getMonth === "function") ||
        (typeof value === "string" && /^\d+$/.test(value) !== true && !isNaN(Date.parse(value))));
};
exports.isDate = isDate;
const isUndefined = (value) => {
    return value === undefined && typeof value === "undefined";
};
exports.isUndefined = isUndefined;
const isFunction = (value) => {
    return typeof value === "function";
};
exports.isFunction = isFunction;
const isSymbol = (value) => {
    return typeof value === "symbol";
};
exports.isSymbol = isSymbol;
const isBuffer = (obj) => {
    return obj != null && obj.constructor != null && typeof obj.constructor.isBuffer === "function" && obj.constructor.isBuffer(obj);
};
exports.isBuffer = isBuffer;
const isEmailValid = (email) => {
    if (typeof email !== "string") {
        return false;
    }
    const regex = /^\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b$/gi;
    return regex.test(email);
};
exports.isEmailValid = isEmailValid;
const isPasswordValid = (password) => {
    if (typeof password !== "string") {
        return false;
    }
    var regex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/gm;
    return regex.test(password);
};
exports.isPasswordValid = isPasswordValid;
const isPhoneValid = (phone) => {
    if (typeof phone !== "string") {
        return false;
    }
    var regex = new RegExp("^((1[1-9])|([2-9][0-9]))((3[0-9]{3}[0-9]{4})|(9?[0-9]{3}[0-9]{5}))$");
    return regex.test(String(phone).replace(/\D/gi, ""));
};
exports.isPhoneValid = isPhoneValid;
const isUrlValid = (url) => {
    if (typeof url !== "string") {
        return false;
    }
    var regex = /^[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/gi;
    regex =
        /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i;
    return regex.test(url);
};
exports.isUrlValid = isUrlValid;
function isEmpty(obj) {
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            return false;
        }
    }
    return true;
}
exports.isEmpty = isEmpty;

},{}],77:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SimpleEventEmitter_1 = __importDefault(require("../Lib/SimpleEventEmitter"));
class NotImplementedError extends Error {
    constructor(name) {
        super(`${name} is not implemented`);
    }
}
class Api extends SimpleEventEmitter_1.default {
    constructor() {
        super();
    }
    /**
     * Provides statistics
     * @param options
     */
    stats(options) {
        throw new NotImplementedError("stats");
    }
    /**
     * @param path
     * @param event event to subscribe to ("value", "child_added" etc)
     * @param callback callback function
     */
    subscribe(path, event, callback, settings) {
        throw new NotImplementedError("subscribe");
    }
    unsubscribe(path, event, callback) {
        throw new NotImplementedError("unsubscribe");
    }
    update(path, updates, options) {
        throw new NotImplementedError("update");
    }
    set(path, value, options) {
        throw new NotImplementedError("set");
    }
    get(path, options) {
        throw new NotImplementedError("get");
    }
    transaction(path, callback, options) {
        throw new NotImplementedError("transaction");
    }
    exists(path) {
        throw new NotImplementedError("exists");
    }
    query(path, query, options) {
        throw new NotImplementedError("query");
    }
    reflect(path, type, args) {
        throw new NotImplementedError("reflect");
    }
    export(path, write, options) {
        throw new NotImplementedError("export");
    }
    import(path, read, options) {
        throw new NotImplementedError("import");
    }
    setSchema(path, schema, warnOnly) {
        throw new NotImplementedError("setSchema");
    }
    getSchema(path) {
        throw new NotImplementedError("getSchema");
    }
    getSchemas() {
        throw new NotImplementedError("getSchemas");
    }
    validateSchema(path, value, isUpdate) {
        throw new NotImplementedError("validateSchema");
    }
    getMutations(filter) {
        throw new NotImplementedError("getMutations");
    }
    getChanges(filter) {
        throw new NotImplementedError("getChanges");
    }
}
exports.default = Api;

},{"../Lib/SimpleEventEmitter":91}],78:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataBase = exports.DataBaseSettings = void 0;
const SimpleEventEmitter_1 = __importDefault(require("../Lib/SimpleEventEmitter"));
const reference_1 = require("./reference");
const DebugLogger_1 = __importDefault(require("../Lib/DebugLogger"));
const TypeMappings_1 = __importDefault(require("../Lib/TypeMappings"));
class DataBaseSettings {
    constructor(options) {
        /**
         * What level to use for console logging.
         * @default 'log'
         */
        this.logLevel = "log";
        /**
         * Whether to use colors in the console logs output
         * @default true
         */
        this.logColors = true;
        /**
         * @internal (for internal use)
         */
        this.info = "realtime database";
        if (typeof options !== "object") {
            options = {};
        }
        if (typeof options.logLevel === "string") {
            this.logLevel = options.logLevel;
        }
        if (typeof options.logColors === "boolean") {
            this.logColors = options.logColors;
        }
        if (typeof options.info === "string") {
            this.info = options.info;
        }
    }
}
exports.DataBaseSettings = DataBaseSettings;
class DataBase extends SimpleEventEmitter_1.default {
    constructor(dbname, options = {}) {
        super();
        this._ready = false;
        options = new DataBaseSettings(options);
        this.name = dbname;
        // Setup console logging
        this.debug = new DebugLogger_1.default(options.logLevel, `[${dbname}]`);
        // Setup type mapping functionality
        this.types = new TypeMappings_1.default(this);
        this.once("ready", () => {
            // console.log(`database "${dbname}" (${this.constructor.name}) is ready to use`);
            this._ready = true;
        });
    }
    /**
     * Waits for the database to be ready before running your callback.
     * @param callback (optional) callback function that is called when the database is ready to be used. You can also use the returned promise.
     * @returns returns a promise that resolves when ready
     */
    async ready(callback) {
        if (!this._ready) {
            // Wait for ready event
            await new Promise((resolve) => this.on("ready", resolve));
        }
        callback === null || callback === void 0 ? void 0 : callback();
    }
    get isReady() {
        return this._ready;
    }
    /**
     * Creates a reference to a node
     * @param path
     * @returns reference to the requested node
     */
    ref(path) {
        return new reference_1.DataReference(this, path);
    }
    /**
     * Get a reference to the root database node
     * @returns reference to root node
     */
    get root() {
        return this.ref("");
    }
    /**
     * Creates a query on the requested node
     * @param path
     * @returns query for the requested node
     */
    query(path) {
        const ref = new reference_1.DataReference(this, path);
        return new reference_1.DataReferenceQuery(ref);
    }
    get schema() {
        return {
            get: (path) => {
                return this.storage.getSchema(path);
            },
            set: (path, schema, warnOnly = false) => {
                return this.storage.setSchema(path, schema, warnOnly);
            },
            all: () => {
                return this.storage.getSchemas();
            },
            check: (path, value, isUpdate) => {
                return this.storage.validateSchema(path, value, isUpdate);
            },
        };
    }
}
exports.DataBase = DataBase;
exports.default = DataBase;

},{"../Lib/DebugLogger":83,"../Lib/SimpleEventEmitter":91,"../Lib/TypeMappings":95,"./reference":79}],79:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataReferenceQuery = exports.DataReferencesArray = exports.DataSnapshotsArray = exports.QueryDataRetrievalOptions = exports.DataReference = exports.DataRetrievalOptions = void 0;
const Subscription_1 = require("../Lib/Subscription");
const snapshot_1 = require("./snapshot");
const PathInfo_1 = __importDefault(require("../Lib/PathInfo"));
const ID_1 = __importDefault(require("../Lib/ID"));
const OptionalObservable_1 = require("../Lib/OptionalObservable");
class DataRetrievalOptions {
    /**
     * Opções para recuperação de dados, permite o carregamento seletivo de propriedades de objetos.
     */
    constructor(options) {
        if (!options) {
            options = {};
        }
        if (typeof options.include !== "undefined" && !(options.include instanceof Array)) {
            throw new TypeError("options.include must be an array");
        }
        if (typeof options.exclude !== "undefined" && !(options.exclude instanceof Array)) {
            throw new TypeError("options.exclude must be an array");
        }
        if (typeof options.child_objects !== "undefined" && typeof options.child_objects !== "boolean") {
            throw new TypeError("options.child_objects must be a boolean");
        }
        if (typeof options.cache_mode === "string" && !["allow", "bypass", "force"].includes(options.cache_mode)) {
            throw new TypeError("invalid value for options.cache_mode");
        }
        this.include = options.include || undefined;
        this.exclude = options.exclude || undefined;
        this.child_objects = typeof options.child_objects === "boolean" ? options.child_objects : undefined;
        this.cache_mode = typeof options.cache_mode === "string" ? options.cache_mode : typeof options.allow_cache === "boolean" ? (options.allow_cache ? "allow" : "bypass") : "allow";
        this.cache_cursor = typeof options.cache_cursor === "string" ? options.cache_cursor : undefined;
    }
}
exports.DataRetrievalOptions = DataRetrievalOptions;
const _private = Symbol("private");
class DataReference {
    /**
     * Cria uma referência para um nó
     */
    constructor(db, path, vars) {
        this.db = db;
        if (!path) {
            path = "";
        }
        path = path.replace(/^\/|\/$/g, ""); // Trim slashes
        const pathInfo = PathInfo_1.default.get(path);
        const key = pathInfo.key;
        const callbacks = [];
        this[_private] = {
            get path() {
                return path;
            },
            get key() {
                return key;
            },
            get callbacks() {
                return callbacks;
            },
            vars: vars || {},
            context: {},
            pushed: false,
            cursor: null,
        };
    }
    context(context, merge = false) {
        const currentContext = this[_private].context;
        if (typeof context === "object") {
            const newContext = context ? (merge ? currentContext || {} : context) : {};
            if (context) {
                // Mesclar novo com o contexto atual
                Object.keys(context).forEach((key) => {
                    newContext[key] = context[key];
                });
            }
            this[_private].context = newContext;
            return this;
        }
        else if (typeof context === "undefined") {
            console.warn("Use snap.context() instead of snap.ref.context() to get updating context in event callbacks");
            return currentContext;
        }
        else {
            throw new Error("Invalid context argument");
        }
    }
    /**
     * Contém o último cursor recebido para este caminho referenciado (se o banco de dados conectado tiver o log de transações ativado).
     * Se você deseja ser notificado se esse valor mudar, adicione um manipulador com `ref.onCursor(callback)`.
     */
    get cursor() {
        return this[_private].cursor;
    }
    set cursor(value) {
        var _a;
        this[_private].cursor = value;
        (_a = this.onCursor) === null || _a === void 0 ? void 0 : _a.call(this, value);
    }
    get isWildcardPath() {
        return this.path.indexOf("*") >= 0 || this.path.indexOf("$") >= 0;
    }
    /**
     * O caminho com o qual esta instância foi criada
     */
    get path() {
        return this[_private].path;
    }
    /**
     * A chave ou índice deste nó
     */
    get key() {
        const key = this[_private].key;
        return typeof key === "number" ? `[${key}]` : key;
    }
    /**
     * Se a "chave" for um número, é um índice!
     */
    get index() {
        const key = this[_private].key;
        if (typeof key !== "number") {
            throw new Error(`"${key}" is not a number`);
        }
        return key;
    }
    /**
     * Retorna uma nova referência para o pai deste nó
     */
    get parent() {
        const currentPath = PathInfo_1.default.fillVariables2(this.path, this.vars);
        const info = PathInfo_1.default.get(currentPath);
        if (info.parentPath === null) {
            return null;
        }
        return new DataReference(this.db, info.parentPath).context(this[_private].context);
    }
    /**
     * Contém valores das variáveis/curingas usadas em um caminho de assinatura se esta referência foi
     * criada por um evento ("value", "child_added", etc.), ou em um caminho de mapeamento de tipo ao serializar / instanciar objetos tipados.
     */
    get vars() {
        return this[_private].vars;
    }
    /**
     * Retorna uma nova referência para um nó filho
     * @param childPath Chave de filho, índice ou caminho
     * @returns Referência para o filho
     */
    child(childPath) {
        childPath = typeof childPath === "number" ? childPath : childPath.replace(/^\/|\/$/g, "");
        const currentPath = PathInfo_1.default.fillVariables2(this.path, this.vars);
        const targetPath = PathInfo_1.default.getChildPath(currentPath, childPath);
        return new DataReference(this.db, targetPath).context(this[_private].context); //  `${this.path}/${childPath}`
    }
    /**
     * Define ou sobrescreve o valor armazenado.
     * @param value Valor a ser armazenado no banco de dados.
     * @param onComplete Callback de conclusão opcional a ser usado em vez de retornar uma promise.
     * @returns Promise que é resolvida com esta referência quando concluída.
     */
    async set(value, onComplete) {
        try {
            if (this.isWildcardPath) {
                throw new Error(`Cannot set the value of wildcard path "/${this.path}"`);
            }
            if (this.parent === null) {
                throw new Error("Cannot set the root object. Use update, or set individual child properties");
            }
            if (typeof value === "undefined") {
                throw new TypeError(`Cannot store undefined value in "/${this.path}"`);
            }
            if (!this.db.isReady) {
                await this.db.ready();
            }
            value = this.db.types.serialize(this.path, value);
            const { cursor } = await this.db.storage.set(this.path, value, { context: this[_private].context });
            this.cursor = cursor;
            if (typeof onComplete === "function") {
                try {
                    onComplete(null, this);
                }
                catch (err) {
                    console.error("Error in onComplete callback:", err);
                }
            }
        }
        catch (err) {
            if (typeof onComplete === "function") {
                try {
                    onComplete(err, this);
                }
                catch (err) {
                    console.error("Error in onComplete callback:", err);
                }
            }
            else {
                // throw again
                throw err;
            }
        }
        return this;
    }
    /**
     * Atualiza as propriedades do nó referenciado.
     * @param updates Contendo as propriedades a serem atualizadas.
     * @param onComplete Callback de conclusão opcional a ser usado em vez de retornar uma promise.
     * @return Retorna uma promise que é resolvida com esta referência quando concluída.
     */
    async update(updates, onComplete) {
        try {
            if (this.isWildcardPath) {
                throw new Error(`Cannot update the value of wildcard path "/${this.path}"`);
            }
            if (!this.db.isReady) {
                await this.db.ready();
            }
            if (typeof updates !== "object" || updates instanceof Array || updates instanceof ArrayBuffer || updates instanceof Date) {
                await this.set(updates);
            }
            else if (Object.keys(updates).length === 0) {
                console.warn(`update called on path "/${this.path}", but there is nothing to update`);
            }
            else {
                updates = this.db.types.serialize(this.path, updates);
                const { cursor } = await this.db.storage.update(this.path, updates, { context: this[_private].context });
                this.cursor = cursor;
            }
            if (typeof onComplete === "function") {
                try {
                    onComplete(null, this);
                }
                catch (err) {
                    console.error("Error in onComplete callback:", err);
                }
            }
        }
        catch (err) {
            if (typeof onComplete === "function") {
                try {
                    onComplete(err, this);
                }
                catch (err) {
                    console.error("Error in onComplete callback:", err);
                }
            }
            else {
                // throw again
                throw err;
            }
        }
        return this;
    }
    /**
     * Define o valor de um nó usando uma transação: executa sua função de retorno de chamada com o valor atual, utiliza seu valor de retorno como o novo valor a ser armazenado.
     * A transação é cancelada se sua função de retorno de chamada retornar undefined ou lançar um erro. Se sua função de retorno de chamada retornar null, o nó de destino será removido.
     * @param callback - Função de retorno de chamada que realiza a transação no valor atual do nó. Deve retornar o novo valor a ser armazenado (ou uma promise com o novo valor), undefined para cancelar a transação ou null para remover o nó.
     * @returns Retorna uma promise que é resolvida com a DataReference assim que a transação for processada.
     */
    async transaction(callback) {
        if (this.isWildcardPath) {
            throw new Error(`Cannot start a transaction on wildcard path "/${this.path}"`);
        }
        if (!this.db.isReady) {
            await this.db.ready();
        }
        let throwError;
        const cb = (currentValue) => {
            currentValue = this.db.types.deserialize(this.path, currentValue);
            const snap = new snapshot_1.DataSnapshot(this, currentValue);
            let newValue;
            try {
                newValue = callback(snap);
            }
            catch (err) {
                // O código de retorno de chamada lançou um erro
                throwError = err; // Lembre-se do erro
                return; // cancela a transação retornando undefined
            }
            if (newValue instanceof Promise) {
                return newValue
                    .then((val) => {
                    return this.db.types.serialize(this.path, val);
                })
                    .catch((err) => {
                    throwError = err; // Lembre-se do erro
                    return; // cancela a transação retornando undefined
                });
            }
            else {
                return this.db.types.serialize(this.path, newValue);
            }
        };
        const { cursor } = await this.db.storage.transaction(this.path, cb, { context: this[_private].context });
        this.cursor = cursor;
        if (throwError) {
            // Relançar erro do código de retorno de chamada
            throw throwError;
        }
        return this;
    }
    on(event, callback, cancelCallback) {
        if (this.path === "" && ["value", "child_changed"].includes(event)) {
            // Removidos os eventos 'notify_value' e 'notify_child_changed' da lista, pois eles não exigem mais carregamento adicional de dados.
            console.warn("WARNING: Listening for value and child_changed events on the root node is a bad practice. These events require loading of all data (value event), or potentially lots of data (child_changed event) each time they are fired");
        }
        let eventPublisher;
        const eventStream = new Subscription_1.EventStream((publisher) => {
            eventPublisher = publisher;
        });
        // Mapear NOSSO retorno de chamada para o retorno de chamada original, para que o .off possa remover o(s) retorno(s) de chamada certo(s)
        const cb = {
            event,
            stream: eventStream,
            userCallback: typeof callback === "function" ? callback : undefined,
            ourCallback: (err, path, newValue, oldValue, eventContext) => {
                if (err) {
                    // TODO: Investigar se isso realmente acontece?
                    this.db.debug.error(`Error getting data for event ${event} on path "${path}"`, err);
                    return;
                }
                const ref = this.db.ref(path);
                ref[_private].vars = PathInfo_1.default.extractVariables(this.path, path);
                let callbackObject;
                if (event.startsWith("notify_")) {
                    // No evento de dados, retorno de chamada com referência
                    callbackObject = ref.context(eventContext || {});
                }
                else {
                    const values = {
                        previous: this.db.types.deserialize(path, oldValue),
                        current: this.db.types.deserialize(path, newValue),
                    };
                    if (event === "child_removed") {
                        callbackObject = new snapshot_1.DataSnapshot(ref, values.previous, true, values.previous, eventContext);
                    }
                    else if (event === "mutations") {
                        callbackObject = new snapshot_1.MutationsDataSnapshot(ref, values.current, eventContext);
                    }
                    else {
                        const isRemoved = event === "mutated" && values.current === null;
                        callbackObject = new snapshot_1.DataSnapshot(ref, values.current, isRemoved, values.previous, eventContext);
                    }
                }
                eventPublisher.publish(callbackObject);
                if (eventContext === null || eventContext === void 0 ? void 0 : eventContext.database_cursor) {
                    this.cursor = eventContext.database_cursor;
                }
            },
        };
        this[_private].callbacks.push(cb);
        const subscribe = () => {
            // (NOVO) Adicionar retorno de chamada ao fluxo de eventos
            // ref.on('value', callback) agora é exatamente o mesmo que ref.on('value').subscribe(callback)
            if (typeof callback === "function") {
                eventStream.subscribe(callback, (activated, cancelReason) => {
                    if (!activated) {
                        cancelCallback && cancelCallback(cancelReason);
                    }
                });
            }
            if (event === "value") {
                if (this.isWildcardPath) {
                    const err = `Cannot get value of wildcard path "/${this.path}".`;
                    eventPublisher.cancel(err);
                    throw new Error(err);
                }
                let cache;
                const observeSubscribe = this.observe().subscribe((value) => {
                    const ref = this.db.ref(this.path);
                    cache = !cache ? value : cache;
                    const values = {
                        previous: this.db.types.deserialize(this.path, cache),
                        current: this.db.types.deserialize(this.path, value),
                    };
                    const isRemoved = values.current === null;
                    const snap = new snapshot_1.DataSnapshot(ref, values.current, isRemoved, values.previous, {});
                    eventPublisher.publish(snap);
                });
                eventPublisher.start(() => {
                    return observeSubscribe.unsubscribe();
                });
                return;
            }
            const advancedOptions = typeof callback === "object" ? callback : { newOnly: !callback }; // newOnly: se o retorno de chamada não for 'truthy', poderia alterar isso para (typeof callback !== 'function' && callback !== true), mas isso quebraria o código do cliente que usa um argumento truthy.
            if (typeof advancedOptions.newOnly !== "boolean") {
                advancedOptions.newOnly = false;
            }
            if (this.isWildcardPath) {
                advancedOptions.newOnly = true;
            }
            const cancelSubscription = (err) => {
                // Acesso negado?
                // Cancelar a assinatura
                const callbacks = this[_private].callbacks;
                callbacks.splice(callbacks.indexOf(cb), 1);
                this.db.storage.unsubscribe(this.path, event, cb.ourCallback);
                // Chamar cancelCallbacks
                this.db.debug.error(`Subscription "${event}" on path "/${this.path}" canceled because of an error: ${err.message}`);
                eventPublisher.cancel(err.message);
            };
            const authorized = this.db.storage.subscribe(this.path, event, cb.ourCallback, {
                newOnly: advancedOptions.newOnly,
                cancelCallback: cancelSubscription,
                syncFallback: advancedOptions.syncFallback,
            });
            const allSubscriptionsStoppedCallback = () => {
                const callbacks = this[_private].callbacks;
                callbacks.splice(callbacks.indexOf(cb), 1);
                return this.db.storage.unsubscribe(this.path, event, cb.ourCallback);
            };
            if (authorized instanceof Promise) {
                // A API da Web agora retorna uma promise que é resolvida se a solicitação for permitida
                // e é rejeitada quando o acesso é negado pelas regras de segurança definidas.
                authorized
                    .then(() => {
                    // Acesso concedido
                    eventPublisher.start(allSubscriptionsStoppedCallback);
                })
                    .catch(cancelSubscription);
            }
            else {
                // API local, sempre autorizada
                eventPublisher.start(allSubscriptionsStoppedCallback);
            }
            if (!advancedOptions.newOnly) {
                // Se o parâmetro de retorno de chamada for fornecido (seja uma função de retorno de chamada, true ou qualquer valor truthy),
                // ele disparará eventos para os valores atuais agora.
                // Caso contrário, espera-se que o método .subscribe seja usado, que então
                // só será chamado para eventos futuros.
                // if (event === "value") {
                // 	this.get((snap) => {
                // 		eventPublisher.publish(snap);
                // 	});
                // } else
                if (event === "child_added") {
                    this.get((snap) => {
                        const val = snap.val();
                        if (val === null || typeof val !== "object") {
                            return;
                        }
                        Object.keys(val).forEach((key) => {
                            const childSnap = new snapshot_1.DataSnapshot(this.child(key), val[key]);
                            eventPublisher.publish(childSnap);
                        });
                    });
                }
                else if (event === "notify_child_added") {
                    // Use a API de reflexão para obter os filhos atuais.
                    // NOTA: Isso não funciona com o IvipBase <= v0.9.7, apenas quando conectado como administrador.
                    const step = 100, limit = step;
                    let skip = 0;
                    const more = async () => {
                        const children = await this.db.storage.reflect(this.path, "children", { limit, skip });
                        if (children && "more" in children) {
                            children.list.forEach((child) => {
                                const childRef = this.child(child.key);
                                eventPublisher.publish(childRef);
                                // typeof callback === 'function' && callback(childRef);
                            });
                            if (children.more) {
                                skip += step;
                                more();
                            }
                        }
                    };
                    more();
                }
            }
        };
        if (this.db.isReady) {
            subscribe();
        }
        else {
            this.db.ready(subscribe);
        }
        return eventStream;
    }
    off(event, callback) {
        const subscriptions = this[_private].callbacks;
        const stopSubs = subscriptions.filter((sub) => (!event || sub.event === event) && (!callback || sub.userCallback === callback));
        if (stopSubs.length === 0) {
            this.db.debug.warn(`Can't find event subscriptions to stop (path: "${this.path}", event: ${event || "(any)"}, callback: ${callback})`);
        }
        stopSubs.forEach((sub) => {
            sub.stream.stop();
        });
        return this;
    }
    get(optionsOrCallback, callback) {
        if (!this.db.isReady) {
            const promise = this.db.ready().then(() => this.get(optionsOrCallback, callback));
            return typeof optionsOrCallback !== "function" && typeof callback !== "function" ? promise : undefined; // retorna apenas uma promise se nenhum retorno de chamada for utilizado
        }
        callback = typeof optionsOrCallback === "function" ? optionsOrCallback : typeof callback === "function" ? callback : undefined;
        if (this.isWildcardPath) {
            const error = new Error(`Cannot get value of wildcard path "/${this.path}". Use .query() instead`);
            if (typeof callback === "function") {
                throw error;
            }
            return Promise.reject(error);
        }
        const options = new DataRetrievalOptions(typeof optionsOrCallback === "object" ? optionsOrCallback : { cache_mode: "allow" });
        const promise = this.db.storage.get(this.path, options).then((result) => {
            var _a;
            const isNewApiResult = "context" in result && "value" in result;
            if (!isNewApiResult) {
                // A versão do pacote acebase-core foi atualizada, mas os pacotes acebase ou acebase-client não foram? Aviso, mas não lance um erro.
                console.warn("IvipBase api.get method returned an old response value. Update your acebase or acebase-client package");
                result = { value: result, context: {} };
            }
            const value = this.db.types.deserialize(this.path, result.value);
            const snapshot = new snapshot_1.DataSnapshot(this, value, undefined, undefined, result.context);
            if ((_a = result.context) === null || _a === void 0 ? void 0 : _a.database_cursor) {
                this.cursor = result.context.database_cursor;
            }
            return snapshot;
        });
        if (callback) {
            promise.then(callback).catch((err) => {
                console.error("Uncaught error:", err);
            });
            return;
        }
        else {
            return promise;
        }
    }
    /**
     * Aguarda a ocorrência de um evento
     * @param event Nome do evento, por exemplo, "value", "child_added", "child_changed", "child_removed"
     * @param options Opções de recuperação de dados, para incluir ou excluir chaves específicas de filhos
     * @returns Retorna uma promise que é resolvida com uma snapshot dos dados
     */
    once(event, options) {
        if (event === "value" && !this.isWildcardPath) {
            // Shortcut, do not start listening for future events
            return this.get(options);
        }
        return new Promise((resolve) => {
            const callback = (snap) => {
                this.off(event, callback); // unsubscribe directly
                resolve(snap);
            };
            this.on(event, callback);
        });
    }
    /**
     * @param value Valor opcional para armazenar no banco de dados imediatamente
     * @param onComplete Função de retorno de chamada opcional para ser executada uma vez que o valor foi armazenado
     * @returns Retorna uma promise que é resolvida com a referência após o valor passado ter sido armazenado
     */
    push(value, onComplete) {
        if (this.isWildcardPath) {
            const error = new Error(`Cannot push to wildcard path "/${this.path}"`);
            if (typeof value === "undefined" || typeof onComplete === "function") {
                throw error;
            }
            return Promise.reject(error);
        }
        const id = ID_1.default.generate();
        const ref = this.child(id);
        ref[_private].pushed = true;
        if (typeof value !== "undefined") {
            return ref.set(value, onComplete).then(() => ref);
        }
        else {
            return ref;
        }
    }
    /**
     * Remove este nó e todos os filhos
     */
    async remove() {
        if (this.isWildcardPath) {
            throw new Error(`Cannot remove wildcard path "/${this.path}". Use query().remove instead`);
        }
        if (this.parent === null) {
            throw new Error("Cannot remove the root node");
        }
        return this.set(null);
    }
    /**
     * Verifica rapidamente se esta referência possui um valor no banco de dados, sem retornar seus dados
     * @returns Retorna uma promise que é resolvida com um valor booleano
     */
    async exists() {
        if (this.isWildcardPath) {
            throw new Error(`Cannot check wildcard path "/${this.path}" existence`);
        }
        if (!this.db.isReady) {
            await this.db.ready();
        }
        return this.db.storage.exists(this.path);
    }
    /**
     * Cria um objeto de consulta para o nó atual
     */
    query() {
        return new DataReferenceQuery(this);
    }
    /**
     * Obtém o número de filhos que este nó possui, utiliza reflexão
     */
    async count() {
        const info = await this.reflect("info", { child_count: true });
        return info.children.count;
    }
    async reflect(type, args) {
        if (this.isWildcardPath) {
            throw new Error(`Cannot reflect on wildcard path "/${this.path}"`);
        }
        if (!this.db.isReady) {
            await this.db.ready();
        }
        return this.db.storage.reflect(this.path, type, args);
    }
    async export(write, options = { format: "json", type_safe: true }) {
        if (this.isWildcardPath) {
            throw new Error(`Cannot export wildcard path "/${this.path}"`);
        }
        if (!this.db.isReady) {
            await this.db.ready();
        }
        const writeFn = typeof write === "function" ? write : write.write.bind(write);
        return this.db.storage.export(this.path, writeFn, options);
    }
    /**
     * Importa o valor deste nó e todos os filhos
     * @param read Função que lê dados do seu fluxo
     * @param options Atualmente, o único formato suportado é json
     * @returns Retorna uma promise que é resolvida assim que todos os dados forem importados
     */
    async import(read, options = { format: "json", suppress_events: false }) {
        if (this.isWildcardPath) {
            throw new Error(`Cannot import to wildcard path "/${this.path}"`);
        }
        if (!this.db.isReady) {
            await this.db.ready();
        }
        return this.db.storage.import(this.path, read, options);
    }
    /**
     * @param options Opções opcionais iniciais de recuperação de dados.
     * Não recomendado para uso ainda - os includes/excludes fornecidos não são aplicados às mutações recebidas,
     * ou ações de sincronização ao usar um IvipBase com banco de dados de cache.
     */
    observe(options) {
        // options não deve ser usado ainda - não podemos prevenir/filtrar eventos de mutação em caminhos excluídos no momento
        if (options) {
            throw new Error("observe does not support data retrieval options yet");
        }
        if (this.isWildcardPath) {
            throw new Error(`Cannot observe wildcard path "/${this.path}"`);
        }
        const Observable = (0, OptionalObservable_1.getObservable)();
        return new Observable((observer) => {
            let cache, resolved = false;
            let promise = Promise.all([this.get(options)]).then(([snap]) => {
                resolved = true;
                cache = snap.val();
                observer.next(cache);
            });
            const updateCache = (snap) => {
                if (!resolved) {
                    promise = promise.then(() => updateCache(snap));
                    return;
                }
                const mutatedPath = snap.ref.path;
                if (mutatedPath === this.path) {
                    cache = snap.val();
                    return observer.next(cache);
                }
                const trailKeys = PathInfo_1.default.getPathKeys(mutatedPath).slice(PathInfo_1.default.getPathKeys(this.path).length);
                let target = cache;
                while (trailKeys.length > 1) {
                    const key = trailKeys.shift();
                    if (typeof key === "string" || typeof key === "number") {
                        if (!(key in target)) {
                            // Ocorre se os dados carregados inicialmente não incluíram / excluíram esses dados,
                            // ou se perdemos um evento
                            target[key] = typeof trailKeys[0] === "number" ? [] : {};
                        }
                        target = target[key];
                    }
                }
                const prop = trailKeys.shift();
                const newValue = snap.val();
                if (typeof prop === "string" || typeof prop === "number") {
                    if (newValue === null) {
                        // Remova isso
                        target instanceof Array && typeof prop === "number" ? target.splice(prop, 1) : delete target[prop];
                    }
                    else {
                        // Defina ou atualize isso
                        target[prop] = newValue;
                    }
                }
                observer.next(cache);
            };
            this.on("mutated", updateCache); // TODO: Refatorar para o evento 'mutations' em vez disso
            // Retornar a função de cancelamento da inscrição
            return () => {
                this.off("mutated", updateCache);
            };
        });
    }
    async forEach(callbackOrOptions, callback) {
        let options;
        if (typeof callbackOrOptions === "function") {
            callback = callbackOrOptions;
        }
        else {
            options = callbackOrOptions;
        }
        if (typeof callback !== "function") {
            throw new TypeError("No callback function given");
        }
        // Obtenha todos os filhos por meio de reflexão. Isso pode ser ajustado ainda mais usando paginação
        const { children } = await this.reflect("children", { limit: 0, skip: 0 }); // Obtém TODAS as chaves dos filhos
        const summary = {
            canceled: false,
            total: children && "list" in children ? children === null || children === void 0 ? void 0 : children.list.length : 0,
            processed: 0,
        };
        // Iterar por todos os filhos até que a função de retorno de chamada retorne false
        if (children && "list" in children) {
            for (let i = 0; i < children.list.length; i++) {
                const key = children.list[i].key;
                // Obter dados do filho
                const snapshot = await this.child(key).get(options);
                summary.processed++;
                if (!snapshot || !snapshot.exists()) {
                    // Foi removido nesse meio tempo, pule
                    continue;
                }
                // Executar a função de retorno de chamada
                const result = await callback(snapshot);
                if (result === false) {
                    summary.canceled = true;
                    break; // Parar o loop
                }
            }
        }
        return summary;
    }
    async getMutations(cursorOrDate) {
        const cursor = typeof cursorOrDate === "string" ? cursorOrDate : undefined;
        const timestamp = cursorOrDate === null || typeof cursorOrDate === "undefined" ? 0 : cursorOrDate instanceof Date ? cursorOrDate.getTime() : Date.now();
        return this.db.storage.getMutations({ path: this.path, cursor, timestamp });
    }
    async getChanges(cursorOrDate) {
        const cursor = typeof cursorOrDate === "string" ? cursorOrDate : undefined;
        const timestamp = cursorOrDate === null || typeof cursorOrDate === "undefined" ? 0 : cursorOrDate instanceof Date ? cursorOrDate.getTime() : Date.now();
        return this.db.storage.getChanges({ path: this.path, cursor, timestamp });
    }
}
exports.DataReference = DataReference;
class QueryDataRetrievalOptions extends DataRetrievalOptions {
    /**
     * @param options Opções para recuperação de dados, permite o carregamento seletivo de propriedades de objeto
     */
    constructor(options) {
        super(options);
        if (!["undefined", "boolean"].includes(typeof options.snapshots)) {
            throw new TypeError("options.snapshots must be a boolean");
        }
        this.snapshots = typeof options.snapshots === "boolean" ? options.snapshots : true;
    }
}
exports.QueryDataRetrievalOptions = QueryDataRetrievalOptions;
class DataSnapshotsArray extends Array {
    static from(snaps) {
        const arr = new DataSnapshotsArray(snaps.length);
        snaps.forEach((snap, i) => (arr[i] = snap));
        return arr;
    }
    getValues() {
        return this.map((snap) => snap.val());
    }
}
exports.DataSnapshotsArray = DataSnapshotsArray;
class DataReferencesArray extends Array {
    static from(refs) {
        const arr = new DataReferencesArray(refs.length);
        refs.forEach((ref, i) => (arr[i] = ref));
        return arr;
    }
    getPaths() {
        return this.map((ref) => ref.path);
    }
}
exports.DataReferencesArray = DataReferencesArray;
class DataReferenceQuery {
    /**
     * Cria uma consulta em uma referência
     */
    constructor(ref) {
        this.ref = ref;
        this[_private] = {
            filters: [],
            skip: 0,
            take: 0,
            order: [],
            events: {},
        };
    }
    /**
     * Aplica um filtro aos filhos da referência sendo consultada.
     * Se houver um índice na chave da propriedade que está sendo consultada, ele será usado
     * para acelerar a consulta.
     * @param key Propriedade para testar o valor
     * @param op Operador a ser usado
     * @param compare Valor a ser comparado
     */
    filter(key, op, compare) {
        if ((op === "in" || op === "!in") && (!(compare instanceof Array) || compare.length === 0)) {
            throw new Error(`${op} filter for ${key} must supply an Array compare argument containing at least 1 value`);
        }
        if ((op === "between" || op === "!between") && (!(compare instanceof Array) || compare.length !== 2)) {
            throw new Error(`${op} filter for ${key} must supply an Array compare argument containing 2 values`);
        }
        if ((op === "matches" || op === "!matches") && !(compare instanceof RegExp)) {
            throw new Error(`${op} filter for ${key} must supply a RegExp compare argument`);
        }
        // DISABLED 2019/10/23 because it is not fully implemented only works locally
        // if (op === "custom" && typeof compare !== "function") {
        //     throw `${op} filter for ${key} must supply a Function compare argument`;
        // }
        // DISABLED 2022/08/15, implemented by query.ts in acebase
        // if ((op === 'contains' || op === '!contains') && ((typeof compare === 'object' && !(compare instanceof Array) && !(compare instanceof Date)) || (compare instanceof Array && compare.length === 0))) {
        //     throw new Error(`${op} filter for ${key} must supply a simple value or (non-zero length) array compare argument`);
        // }
        this[_private].filters.push({ key, op, compare });
        return this;
    }
    /**
     * @deprecated use `.filter` instead
     */
    where(key, op, compare) {
        return this.filter(key, op, compare);
    }
    /**
     * Limits the number of query results
     */
    take(n) {
        this[_private].take = n;
        return this;
    }
    /**
     * Skips the first n query results
     */
    skip(n) {
        this[_private].skip = n;
        return this;
    }
    sort(key, ascending = true) {
        if (!["string", "number"].includes(typeof key)) {
            throw "key must be a string or number";
        }
        this[_private].order.push({ key, ascending });
        return this;
    }
    /**
     * @deprecated use `.sort` instead
     */
    order(key, ascending = true) {
        return this.sort(key, ascending);
    }
    get(optionsOrCallback, callback) {
        if (!this.ref.db.isReady) {
            const promise = this.ref.db.ready().then(() => this.get(optionsOrCallback, callback));
            return typeof optionsOrCallback !== "function" && typeof callback !== "function" ? promise : undefined; // only return promise if no callback is used
        }
        callback = typeof optionsOrCallback === "function" ? optionsOrCallback : typeof callback === "function" ? callback : undefined;
        const options = new QueryDataRetrievalOptions(typeof optionsOrCallback === "object" ? optionsOrCallback : { snapshots: true, cache_mode: "allow" });
        options.allow_cache = options.cache_mode !== "bypass"; // Backward compatibility when using older acebase-client
        options.eventHandler = (ev) => {
            // TODO: implement context for query events
            if (!this[_private].events[ev.name]) {
                return false;
            }
            const listeners = this[_private].events[ev.name];
            if (typeof listeners !== "object" || listeners.length === 0) {
                return false;
            }
            if (["add", "change", "remove"].includes(ev.name)) {
                const eventData = {
                    name: ev.name,
                    ref: new DataReference(this.ref.db, ev.path),
                };
                if (eventData.ref && options.snapshots && ev.name !== "remove") {
                    const val = db.types.deserialize(ev.path, ev.value);
                    eventData.snapshot = new snapshot_1.DataSnapshot(eventData.ref, val, false);
                }
                ev = eventData;
            }
            listeners.forEach((callback) => {
                var _a, _b;
                try {
                    callback(ev);
                }
                catch (err) {
                    this.ref.db.debug.error(`Error executing "${ev.name}" event handler of realtime query on path "${this.ref.path}": ${(_b = (_a = err === null || err === void 0 ? void 0 : err.stack) !== null && _a !== void 0 ? _a : err === null || err === void 0 ? void 0 : err.message) !== null && _b !== void 0 ? _b : err}`);
                }
            });
        };
        // Check if there are event listeners set for realtime changes
        options.monitor = { add: false, change: false, remove: false };
        if (this[_private].events) {
            if (this[_private].events["add"] && this[_private].events["add"].length > 0) {
                options.monitor.add = true;
            }
            if (this[_private].events["change"] && this[_private].events["change"].length > 0) {
                options.monitor.change = true;
            }
            if (this[_private].events["remove"] && this[_private].events["remove"].length > 0) {
                options.monitor.remove = true;
            }
        }
        // Interrompe os resultados em tempo real se ainda estiverem habilitados em um .get anterior nesta instância
        this.stop();
        // NOTA: retorna uma promise aqui, independentemente do argumento de retorno de chamada. Bom argumento para refatorar o método para async/await em breve
        const db = this.ref.db;
        return db.storage
            .query(this.ref.path, this[_private], options)
            .catch((err) => {
            throw new Error(err);
        })
            .then((res) => {
            const { stop } = res;
            let { results, context } = res;
            this.stop = async () => {
                await stop();
            };
            if (!("results" in res && "context" in res)) {
                console.warn("Query results missing context. Update your acebase and/or acebase-client packages");
                (results = res), (context = {});
            }
            if (options.snapshots) {
                const snaps = results.map((result) => {
                    const val = db.types.deserialize(result.path, result.val);
                    return new snapshot_1.DataSnapshot(db.ref(result.path), val, false, undefined, context);
                });
                return DataSnapshotsArray.from(snaps);
            }
            else {
                const refs = results.map((path) => db.ref(path));
                return DataReferencesArray.from(refs);
            }
        })
            .then((results) => {
            callback && callback(results);
            return results;
        });
    }
    /**
     * Stops a realtime query, no more notifications will be received.
     */
    async stop() {
        // Overridden by .get
    }
    /**
     * Executes the query and returns references. Short for `.get({ snapshots: false })`
     * @param callback callback to use instead of returning a promise
     * @returns returns an Promise that resolves with an array of DataReferences, or void when using a callback
     * @deprecated Use `find` instead
     */
    getRefs(callback) {
        return this.get({ snapshots: false }, callback);
    }
    /**
     * Executes the query and returns an array of references. Short for `.get({ snapshots: false })`
     */
    find() {
        return this.get({ snapshots: false });
    }
    /**
     * Executes the query and returns the number of results
     */
    async count() {
        const refs = await this.find();
        return refs.length;
    }
    /**
     * Executes the query and returns if there are any results
     */
    async exists() {
        const originalTake = this[_private].take;
        const p = this.take(1).find();
        this.take(originalTake);
        const refs = await p;
        return refs.length !== 0;
    }
    /**
     * Executes the query, removes all matches from the database
     * @returns returns a Promise that resolves once all matches have been removed
     */
    async remove(callback) {
        const refs = await this.find();
        // Perform updates on each distinct parent collection (only 1 parent if this is not a wildcard path)
        const parentUpdates = refs.reduce((parents, ref) => {
            if (ref.parent) {
                const parent = parents[ref.parent.path];
                if (!parent) {
                    parents[ref.parent.path] = [ref];
                }
                else {
                    parent.push(ref);
                }
            }
            return parents;
        }, {});
        const db = this.ref.db;
        const promises = Object.keys(parentUpdates).map(async (parentPath) => {
            const updates = refs.reduce((updates, ref) => {
                updates[ref.key] = null;
                return updates;
            }, {});
            const ref = db.ref(parentPath);
            try {
                await ref.update(updates);
                return { ref, success: true };
            }
            catch (error) {
                return { ref, success: false, error };
            }
        });
        const results = await Promise.all(promises);
        callback && callback(results);
        return results;
    }
    on(event, callback) {
        if (!this[_private].events[event]) {
            this[_private].events[event] = [];
        }
        this[_private].events[event].push(callback);
        return this;
    }
    /**
     * Unsubscribes from (a) previously added event(s)
     * @param event Name of the event
     * @param callback callback function to remove
     * @returns returns reference to this query
     */
    off(event, callback) {
        if (typeof event === "undefined") {
            this[_private].events = {};
            return this;
        }
        if (!this[_private].events[event]) {
            return this;
        }
        if (typeof callback === "undefined") {
            delete this[_private].events[event];
            return this;
        }
        const index = this[_private].events[event].indexOf(callback);
        if (!~index) {
            return this;
        }
        this[_private].events[event].splice(index, 1);
        return this;
    }
    async forEach(callbackOrOptions, callback) {
        let options;
        if (typeof callbackOrOptions === "function") {
            callback = callbackOrOptions;
        }
        else {
            options = callbackOrOptions;
        }
        if (typeof callback !== "function") {
            throw new TypeError("No callback function given");
        }
        // Get all query results. This could be tweaked further using paging
        const refs = await this.find();
        const summary = {
            canceled: false,
            total: refs.length,
            processed: 0,
        };
        // Iterate through all children until callback returns false
        for (let i = 0; i < refs.length; i++) {
            const ref = refs[i];
            // Get child data
            const snapshot = await ref.get(options);
            summary.processed++;
            if (!snapshot || !snapshot.exists()) {
                // Was removed in the meantime, skip
                continue;
            }
            // Run callback
            const result = await callback(snapshot);
            if (result === false) {
                summary.canceled = true;
                break; // Stop looping
            }
        }
        return summary;
    }
}
exports.DataReferenceQuery = DataReferenceQuery;

},{"../Lib/ID":84,"../Lib/OptionalObservable":86,"../Lib/PathInfo":88,"../Lib/Subscription":93,"./snapshot":80}],80:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MutationsDataSnapshot = exports.DataSnapshot = void 0;
const PathInfo_1 = __importDefault(require("../Lib/PathInfo"));
function getChild(snapshot, path, previous = false) {
    if (!snapshot.exists()) {
        return null;
    }
    let child = previous ? snapshot.previous() : snapshot.val();
    if (typeof path === "number") {
        return child[path];
    }
    PathInfo_1.default.getPathKeys(path).every((key) => {
        child = child[key];
        return typeof child !== "undefined";
    });
    return child || null;
}
function getChildren(snapshot) {
    if (!snapshot.exists()) {
        return [];
    }
    const value = snapshot.val();
    if (value instanceof Array) {
        return new Array(value.length).map((v, i) => i);
    }
    if (typeof value === "object") {
        return Object.keys(value);
    }
    return [];
}
class DataSnapshot {
    /**
     * Indica se o nó existe no banco de dados
     */
    exists() {
        return false;
    }
    /**
     * Cria uma nova instância do DataSnapshot
     */
    constructor(ref, value, isRemoved = false, prevValue, context) {
        this.ref = ref;
        this.val = () => {
            return value;
        };
        this.previous = () => {
            return prevValue;
        };
        this.exists = () => {
            if (isRemoved) {
                return false;
            }
            return value !== null && typeof value !== "undefined";
        };
        this.context = () => {
            return context || {};
        };
    }
    /**
     * Cria uma instância `DataSnapshot`
     * @internal (para uso interno)
     */
    static for(ref, value) {
        return new DataSnapshot(ref, value);
    }
    child(path) {
        // Create new snapshot for child data
        const val = getChild(this, path, false);
        const prev = getChild(this, path, true);
        return new DataSnapshot(this.ref.child(path), val, false, prev);
    }
    /**
     * Verifica se o valor do instantâneo tem um filho com a chave ou caminho fornecido
     * @param path chave filho ou caminho
     */
    hasChild(path) {
        return getChild(this, path) !== null;
    }
    /**
     * Indica se o valor do instantâneo tem algum nó filho
     */
    hasChildren() {
        return getChildren(this).length > 0;
    }
    /**
     * O número de nós filhos neste instantâneo
     */
    numChildren() {
        return getChildren(this).length;
    }
    /**
     * Executa uma função de retorno de chamada para cada nó filho neste instantâneo até que o retorno de chamada retorne falso
     * @param callback Função de retorno de chamada com um instantâneo de cada nó filho neste instantâneo.
     * Deve retornar um valor booleano que indica se a iteração deve continuar ou não.
     */
    forEach(callback) {
        var _a, _b;
        const value = (_a = this.val()) !== null && _a !== void 0 ? _a : {};
        const prev = (_b = this.previous()) !== null && _b !== void 0 ? _b : {};
        return getChildren(this).every((key) => {
            const snap = new DataSnapshot(this.ref.child(key), value[key], false, prev[key]);
            return callback(snap);
        });
    }
    /**
     * A chave do caminho do nó
     */
    get key() {
        return this.ref.key;
    }
}
exports.DataSnapshot = DataSnapshot;
class MutationsDataSnapshot extends DataSnapshot {
    constructor(ref, mutations, context) {
        super(ref, mutations, false, undefined, context);
        /**
         * Não use isso para obter valores anteriores de nós mutados.
         * Use as propriedades `.previous` nas snapshots individuais de cada filho.
         * @throws Lança um erro se você o utilizar.
         */
        this.previous = () => {
            throw new Error("Iterate values to get previous values for each mutation");
        };
        this.val = (warn = true) => {
            if (warn) {
                console.warn("Unless you know what you are doing, it is best not to use the value of a mutations snapshot directly. Use child methods and forEach to iterate the mutations instead");
            }
            return mutations;
        };
    }
    /**
     * Executa uma função de retorno de chamada para cada mutação nesta snapshot até que a função de retorno de chamada retorne false.
     * @param callback Função chamada com uma snapshot de cada mutação nesta snapshot. Deve retornar um valor booleano que indica se deve continuar a iteração ou não.
     * @returns Retorna se cada filho foi iterado.
     */
    forEach(callback) {
        const mutations = this.val(false);
        return mutations.every((mutation) => {
            const ref = mutation.target.reduce((ref, key) => ref.child(key), this.ref);
            const snap = new DataSnapshot(ref, mutation.val, false, mutation.prev);
            return callback(snap);
        });
    }
    child(index) {
        if (typeof index !== "number") {
            throw new Error("child index must be a number");
        }
        const mutation = this.val(false)[index];
        const ref = mutation.target.reduce((ref, key) => ref.child(key), this.ref);
        return new DataSnapshot(ref, mutation.val, false, mutation.prev);
    }
}
exports.MutationsDataSnapshot = MutationsDataSnapshot;

},{"../Lib/PathInfo":88}],81:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ascii85 = void 0;
function c(input, length, result) {
    const b = [0, 0, 0, 0, 0];
    for (let i = 0; i < length; i += 4) {
        let n = ((input[i] * 256 + input[i + 1]) * 256 + input[i + 2]) * 256 + input[i + 3];
        if (!n) {
            result.push("z");
        }
        else {
            for (let j = 0; j < 5; b[j++] = (n % 85) + 33, n = Math.floor(n / 85)) { }
            result.push(String.fromCharCode(b[4], b[3], b[2], b[1], b[0]));
        }
    }
}
function encode(arr) {
    // summary: encodes input data in ascii85 string
    // input: ArrayLike
    var _a;
    const input = arr, result = [], remainder = input.length % 4, length = input.length - remainder;
    c(input, length, result);
    if (remainder) {
        const t = new Uint8Array(4);
        t.set(input.slice(length), 0);
        c(t, 4, result);
        let x = (_a = result.pop()) !== null && _a !== void 0 ? _a : "";
        if (x == "z") {
            x = "!!!!!";
        }
        result.push(x.substr(0, remainder + 1));
    }
    let ret = result.join(""); // String
    ret = "<~" + ret + "~>";
    return ret;
}
exports.ascii85 = {
    encode: function (arr) {
        if (arr instanceof ArrayBuffer) {
            arr = new Uint8Array(arr, 0, arr.byteLength);
        }
        return encode(arr);
    },
    decode: function (input) {
        // summary: decodes the input string back to an ArrayBuffer
        // input: String: the input string to decode
        if (!input.startsWith("<~") || !input.endsWith("~>")) {
            throw new Error("Invalid input string");
        }
        input = input.substr(2, input.length - 4);
        const n = input.length, r = [], b = [0, 0, 0, 0, 0];
        let t, x, y, d;
        for (let i = 0; i < n; ++i) {
            if (input.charAt(i) == "z") {
                r.push(0, 0, 0, 0);
                continue;
            }
            for (let j = 0; j < 5; ++j) {
                b[j] = input.charCodeAt(i + j) - 33;
            }
            d = n - i;
            if (d < 5) {
                for (let j = d; j < 4; b[++j] = 0) { }
                b[d] = 85;
            }
            t = (((b[0] * 85 + b[1]) * 85 + b[2]) * 85 + b[3]) * 85 + b[4];
            x = t & 255;
            t >>>= 8;
            y = t & 255;
            t >>>= 8;
            r.push(t >>> 8, t & 255, y, x);
            for (let j = d; j < 5; ++j, r.pop()) { }
            i += 4;
        }
        const data = new Uint8Array(r);
        return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    },
};
exports.default = exports.ascii85;

},{}],82:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assert = void 0;
/**
 * Replacement for console.assert, throws an error if condition is not met.
 * @param condition 'truthy' condition
 * @param error
 */
function assert(condition, error) {
    if (!condition) {
        throw new Error(`Assertion failed: ${error !== null && error !== void 0 ? error : "check your code"}`);
    }
}
exports.assert = assert;

},{}],83:[function(require,module,exports){
(function (process){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => { };
class DebugLogger {
    constructor(level = "log", prefix = "") {
        this.level = level;
        this.prefix = prefix;
        this.setLevel(level);
    }
    setLevel(level) {
        const prefix = this.prefix ? this.prefix + " %s" : "";
        this.verbose = ["verbose"].includes(level) ? (prefix ? console.log.bind(console, prefix) : console.log.bind(console)) : noop;
        this.log = ["verbose", "log"].includes(level) ? (prefix ? console.log.bind(console, prefix) : console.log.bind(console)) : noop;
        this.warn = ["verbose", "log", "warn"].includes(level) ? (prefix ? console.warn.bind(console, prefix) : console.warn.bind(console)) : noop;
        this.error = ["verbose", "log", "warn", "error"].includes(level) ? (prefix ? console.error.bind(console, prefix) : console.error.bind(console)) : noop;
        this.write = (text) => {
            const isRunKit = typeof process !== "undefined" && process.env && typeof process.env.RUNKIT_ENDPOINT_PATH === "string";
            if (text && isRunKit) {
                text.split("\n").forEach((line) => console.log(line)); // Logs each line separately
            }
            else {
                console.log(text);
            }
        };
    }
}
exports.default = DebugLogger;

}).call(this)}).call(this,require('_process'))
},{"_process":102}],84:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cuid_1 = __importDefault(require("cuid"));
// Not using slugs, removed code
let timeBias = 0;
class ID {
    /**
     * (for internal use)
     * bias in milliseconds to adjust generated cuid timestamps with
     */
    static set timeBias(bias) {
        if (typeof bias !== "number") {
            return;
        }
        timeBias = bias;
    }
    static generate() {
        // Could also use https://www.npmjs.com/package/pushid for Firebase style 20 char id's
        return (0, cuid_1.default)().slice(1); // Cuts off the always leading 'c'
        // return uuid62.v1();
    }
}
exports.default = ID;

},{"cuid":38}],85:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectCollection = void 0;
const ID_1 = __importDefault(require("./ID"));
/**
 * Convenience interface for defining an object collection
 * @example
 * type ChatMessage = {
 *    text: string, uid: string, sent: Date
 * }
 * type Chat = {
 *    title: text
 *    messages: ObjectCollection<ChatMessage>
 * }
 */
class ObjectCollection {
    /**
     * Converts and array of values into an object collection, generating a unique key for each item in the array
     * @param array
     * @example
     * const array = [
     *  { title: "Don't make me think!", author: "Steve Krug" },
     *  { title: "The tipping point", author: "Malcolm Gladwell" }
     * ];
     *
     * // Convert:
     * const collection = ObjectCollection.from(array);
     * // --> {
     * //   kh1x3ygb000120r7ipw6biln: {
     * //       title: "Don't make me think!",
     * //       author: "Steve Krug"
     * //   },
     * //   kh1x3ygb000220r757ybpyec: {
     * //       title: "The tipping point",
     * //       author: "Malcolm Gladwell"
     * //   }
     * // }
     *
     * // Now it's easy to add them to the db:
     * db.ref('books').update(collection);
     */
    static from(array) {
        const collection = {};
        array.forEach((child) => {
            collection[ID_1.default.generate()] = child;
        });
        return collection;
    }
}
exports.ObjectCollection = ObjectCollection;

},{"./ID":84}],86:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setObservable = exports.getObservable = void 0;
const SimpleObservable_1 = __importDefault(require("./SimpleObservable"));
const Utils_1 = require("./Utils");
let _shimRequested = false;
let _observable;
(async () => {
    // Try pre-loading rxjs Observable
    // Test availability in global scope first
    const global = (0, Utils_1.getGlobalObject)();
    if (typeof global.Observable !== "undefined") {
        _observable = global.Observable;
        return;
    }
    // Try importing it from dependencies
    try {
        const { Observable } = await Promise.resolve().then(() => __importStar(require("rxjs")));
        _observable = Observable;
    }
    catch (_a) {
        // rxjs Observable not available, setObservable must be used if usage of SimpleObservable is not desired
        _observable = SimpleObservable_1.default;
    }
})();
function getObservable() {
    if (_observable === SimpleObservable_1.default && !_shimRequested) {
        console.warn("Using IvipBase's simple Observable implementation because rxjs is not available. " +
            'Add it to your project with "npm install rxjs", add it to IvipBase using db.setObservable(Observable), ' +
            'or call db.setObservable("shim") to suppress this warning');
    }
    if (_observable) {
        return _observable;
    }
    throw new Error("RxJS Observable could not be loaded. ");
}
exports.getObservable = getObservable;
function setObservable(Observable) {
    if (Observable === "shim") {
        _observable = SimpleObservable_1.default;
        _shimRequested = true;
    }
    else {
        _observable = Observable;
    }
}
exports.setObservable = setObservable;

},{"./SimpleObservable":92,"./Utils":96,"rxjs":37}],87:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartialArray = void 0;
/**
 * Sparse/partial array converted to a serializable object. Use `Object.keys(sparseArray)` and `Object.values(sparseArray)` to iterate its indice and/or values
 */
class PartialArray {
    constructor(sparseArray) {
        if (sparseArray instanceof Array) {
            for (let i = 0; i < sparseArray.length; i++) {
                if (typeof sparseArray[i] !== "undefined") {
                    this[i] = sparseArray[i];
                }
            }
        }
        else if (sparseArray) {
            Object.assign(this, sparseArray);
        }
    }
}
exports.PartialArray = PartialArray;

},{}],88:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathInfo = exports.PathReference = void 0;
class PathReference {
    /**
     * Cria uma referência a um caminho que pode ser armazenado no banco de dados. Use isso para criar referências cruzadas para outros dados em seu banco de dados.
     * @param path
     */
    constructor(path) {
        this.path = path;
    }
}
exports.PathReference = PathReference;
function getPathKeys(path) {
    path = path.replace(/\[/g, "/[").replace(/^\/+/, "").replace(/\/+$/, ""); // Substitua `[` por `/[`, remova barras invertidas iniciais, remova barras invertidas finais
    if (path.length === 0) {
        return [""];
    }
    const keys = ["", ...path.split("/")];
    return keys.map((key) => {
        return key.startsWith("[") ? parseInt(key.slice(1, -1)) : key;
    });
}
class PathInfo {
    static get(path) {
        return new PathInfo(path);
    }
    static getChildPath(path, childKey) {
        // return getChildPath(path, childKey);
        return PathInfo.get(path).child(childKey).path;
    }
    static getPathKeys(path) {
        return getPathKeys(path).filter((key, i) => !(key === "" && i === 0));
    }
    constructor(path) {
        if (typeof path === "string") {
            this.keys = getPathKeys(path);
        }
        else if (path instanceof Array) {
            this.keys = Array.prototype.concat.apply([], path
                .map((k) => (typeof k === "string" ? getPathKeys(k) : k instanceof PathInfo ? k.keys : [k]))
                .map((k) => {
                k.splice(0, k.findIndex((k) => String(k).trim() !== ""));
                return k;
            }));
        }
        else {
            this.keys = [""];
        }
        this.keys.splice(0, this.keys.findIndex((k) => String(k).trim() !== ""));
        this.path = this.keys.reduce((path, key, i) => (i === 0 ? `${key}` : typeof key === "string" ? `${path}/${key}` : `${path}[${key}]`), "").replace(/^\//gi, "");
    }
    get key() {
        return this.keys.length === 0 ? null : this.keys.slice(-1)[0];
    }
    get parent() {
        if (this.keys.length == 0) {
            return null;
        }
        const parentKeys = this.keys.slice(0, -1);
        return new PathInfo(parentKeys);
    }
    get parentPath() {
        var _a, _b;
        return this.keys.length === 0 ? null : (_b = (_a = this.parent) === null || _a === void 0 ? void 0 : _a.path) !== null && _b !== void 0 ? _b : null;
    }
    child(childKey) {
        if (typeof childKey === "string") {
            if (childKey.length === 0) {
                throw new Error(`child key for path "${this.path}" cannot be empty`);
            }
            // Permitir a expansão de um caminho filho (por exemplo, "user/name") para o equivalente a `child('user').child('name')`
            const keys = getPathKeys(childKey);
            keys.forEach((key, index) => {
                // Verifique as regras de chave do IvipBase aqui para que sejam aplicadas independentemente do destino de armazenamento.
                // Isso impede que chaves específicas sejam permitidas em um ambiente (por exemplo, navegador), mas depois
                // recusadas ao sincronizar com um banco de dados binário IvipBase.
                if (typeof key !== "string") {
                    return;
                }
                if (/[\x00-\x08\x0b\x0c\x0e-\x1f/[\]\\]/.test(key)) {
                    throw new Error(`Invalid child key "${key}" for path "${this.path}". Keys cannot contain control characters or any of the following characters: \\ / [ ]`);
                }
                if (key.length > 128) {
                    throw new Error(`child key "${key}" for path "${this.path}" is too long. Max key length is 128`);
                }
                if (index !== 0 && key.length === 0) {
                    throw new Error(`child key for path "${this.path}" cannot be empty`);
                }
            });
            childKey = keys;
        }
        if (Array.isArray(childKey) && childKey[0] === "")
            childKey.shift();
        return new PathInfo(this.keys.concat(childKey).filter((key, i, l) => (key === "" ? i === 0 : true)));
    }
    childPath(childKey) {
        return this.child(childKey).path;
    }
    get pathKeys() {
        return this.keys;
    }
    static variablesKeys(varPath) {
        let count = 0;
        const variables = [];
        if (!varPath.includes("*") && !varPath.includes("$")) {
            return variables;
        }
        getPathKeys(varPath).forEach((key) => {
            if (key === "*") {
                variables.push(count++);
            }
            else if (typeof key === "string" && key[0] === "$") {
                variables.push(count++);
                variables.push(key);
                variables.push(key.slice(1));
            }
        });
        return variables;
    }
    /**
     * Se varPath contiver variáveis ou wildcards, ele as retornará com os valores encontrados em fullPath
     * @param {string} varPath caminho contendo variáveis como * e $name
     * @param {string} fullPath caminho real para um nó
     * @returns {{ [index: number]: string|number, [variable: string]: string|number }} retorna um objeto semelhante a uma matriz com todos os valores de variáveis. Todas as variáveis nomeadas também são definidas no objeto pelo nome delas (por exemplo, vars.uid e vars.$uid)
     * @example
     * PathInfo.extractVariables('users/$uid/posts/$postid', 'users/ewout/posts/post1/title') === {
     *  0: 'ewout',
     *  1: 'post1',
     *  uid: 'ewout', // ou $uid
     *  postid: 'post1' // ou $postid
     * };
     *
     * PathInfo.extractVariables('users/*\/posts/*\/$property', 'users/ewout/posts/post1/title') === {
     *  0: 'ewout',
     *  1: 'post1',
     *  2: 'title',
     *  property: 'title' // ou $property
     * };
     *
     * PathInfo.extractVariables('users/$user/friends[*]/$friend', 'users/dora/friends[4]/diego') === {
     *  0: 'dora',
     *  1: 4,
     *  2: 'diego',
     *  user: 'dora', // ou $user
     *  friend: 'diego' // ou $friend
     * };
     */
    static extractVariables(varPath, fullPath) {
        let count = 0;
        const variables = {
            get length() {
                return count;
            },
        };
        if (!varPath.includes("*") && !varPath.includes("$")) {
            return variables;
        }
        if (!this.get(varPath).equals(this.fillVariables(varPath, fullPath))) {
            return variables;
        }
        const keys = getPathKeys(varPath);
        const pathKeys = getPathKeys(fullPath);
        keys.forEach((key, index) => {
            const pathKey = pathKeys[index];
            if (key === "*") {
                variables[count++] = pathKey;
            }
            else if (typeof key === "string" && key[0] === "$") {
                variables[count++] = pathKey;
                // Set the $variable property
                variables[key] = pathKey;
                // Set friendly property name (without $)
                const varName = key.slice(1);
                if (typeof variables[varName] === "undefined") {
                    variables[varName] = pathKey;
                }
            }
        });
        return variables;
    }
    /**
     * Se varPath contiver variáveis ou wildcards, ele retornará um caminho com as variáveis substituídas pelas chaves encontradas em fullPath.
     * @example
     * PathInfo.fillVariables('users/$uid/posts/$postid', 'users/ewout/posts/post1/title') === 'users/ewout/posts/post1'
     */
    static fillVariables(varPath, fullPath) {
        if (varPath.indexOf("*") < 0 && varPath.indexOf("$") < 0) {
            return varPath;
        }
        const keys = getPathKeys(varPath);
        const pathKeys = getPathKeys(fullPath);
        const merged = keys.map((key, index) => {
            if (key === pathKeys[index] || index >= pathKeys.length) {
                return key;
            }
            else if (typeof key === "string" && (key === "*" || key[0] === "$")) {
                return pathKeys[index];
            }
            else {
                throw new Error(`Path "${fullPath}" cannot be used to fill variables of path "${varPath}" because they do not match`);
            }
        });
        let mergedPath = "";
        merged.forEach((key) => {
            if (typeof key === "number") {
                mergedPath += `[${key}]`;
            }
            else {
                if (mergedPath.length > 0) {
                    mergedPath += "/";
                }
                mergedPath += key;
            }
        });
        return mergedPath;
    }
    /**
     * Substitui todas as variáveis em um caminho pelos valores no argumento vars
     * @param varPath caminho contendo variáveis
     * @param vars objeto de variáveis, como aquele obtido a partir de PathInfo.extractVariables
     */
    static fillVariables2(varPath, vars) {
        if (typeof vars !== "object" || Object.keys(vars).length === 0) {
            return varPath; // Nothing to fill
        }
        const pathKeys = getPathKeys(varPath);
        let n = 0;
        const targetPath = pathKeys.reduce((path, key) => {
            if (typeof key === "string" && (key === "*" || key.startsWith("$"))) {
                return PathInfo.getChildPath(path, vars[n++]);
            }
            else {
                return PathInfo.getChildPath(path, key);
            }
        }, "");
        return targetPath;
    }
    /**
     * Verifica se um caminho dado corresponde a este caminho, por exemplo, "posts/*\/title" corresponde a "posts/12344/title" e "users/123/name" corresponde a "users/$uid/name"
     */
    equals(otherPath) {
        const other = otherPath instanceof PathInfo ? otherPath : new PathInfo(otherPath);
        if (this.path.replace(/\/$/gi, "") === other.path.replace(/\/$/gi, "")) {
            return true;
        } // they are identical
        if (this.keys.length !== other.keys.length) {
            return false;
        }
        return this.keys.every((key, index) => {
            const otherKey = other.keys[index];
            return otherKey === key || (typeof otherKey === "string" && (otherKey === "*" || otherKey[0] === "$")) || (typeof key === "string" && (key === "*" || key[0] === "$"));
        });
    }
    /**
     * Verifica se um caminho dado é um ancestral, por exemplo, "posts" é um ancestral de "posts/12344/title"
     */
    isAncestorOf(descendantPath) {
        const descendant = descendantPath instanceof PathInfo ? descendantPath : new PathInfo(descendantPath);
        if (descendant.path === "" || this.path === descendant.path) {
            return false;
        }
        if (this.path === "") {
            return true;
        }
        if (this.keys.length >= descendant.keys.length) {
            return false;
        }
        return this.keys.every((key, index) => {
            const otherKey = descendant.keys[index];
            return otherKey === key || (typeof otherKey === "string" && (otherKey === "*" || otherKey[0] === "$")) || (typeof key === "string" && (key === "*" || key[0] === "$"));
        });
    }
    /**
     * Verifica se um caminho dado é um descendente, por exemplo, "posts/1234/title" é um descendente de "posts"
     */
    isDescendantOf(ancestorPath) {
        const ancestor = ancestorPath instanceof PathInfo ? ancestorPath : new PathInfo(ancestorPath);
        if (this.path === "" || this.path === ancestor.path) {
            return false;
        }
        if (ancestorPath === "") {
            return true;
        }
        if (ancestor.keys.length >= this.keys.length) {
            return false;
        }
        return ancestor.keys.every((key, index) => {
            const otherKey = this.keys[index];
            return otherKey === key || (typeof otherKey === "string" && (otherKey === "*" || otherKey[0] === "$")) || (typeof key === "string" && (key === "*" || key[0] === "$"));
        });
    }
    /**
     * Verifica se o outro caminho está na mesma trilha que este caminho. Caminhos estão na mesma trilha se compartilharem um
     * ancestral comum. Por exemplo, "posts" está na trilha de "posts/1234/title" e vice-versa.
     */
    isOnTrailOf(otherPath) {
        const other = otherPath instanceof PathInfo ? otherPath : new PathInfo(otherPath);
        if (this.path.length === 0 || other.path.length === 0) {
            return true;
        }
        if (this.path === other.path) {
            return true;
        }
        return this.pathKeys.every((key, index) => {
            if (index >= other.keys.length) {
                return true;
            }
            const otherKey = other.keys[index];
            return otherKey === key || (typeof otherKey === "string" && (otherKey === "*" || otherKey[0] === "$")) || (typeof key === "string" && (key === "*" || key[0] === "$"));
        });
    }
    /**
     * Verifica se um determinado caminho é um filho direto, por exemplo, "posts/1234/title" é um filho de "posts/1234"
     */
    isChildOf(otherPath) {
        var _a, _b;
        const other = otherPath instanceof PathInfo ? otherPath : new PathInfo(otherPath);
        if (this.path === "") {
            return false;
        } // Se nosso caminho for a raiz, ele não é filho de ninguém...
        return (_b = (_a = this.parent) === null || _a === void 0 ? void 0 : _a.equals(other)) !== null && _b !== void 0 ? _b : false;
    }
    /**
     * Verifica se um determinado caminho é seu pai, por exemplo, "posts/1234" é o pai de "posts/1234/title"
     */
    isParentOf(otherPath) {
        const other = otherPath instanceof PathInfo ? otherPath : new PathInfo(otherPath);
        if (other.path === "" || !other.parent) {
            return false;
        } // Verifica se um determinado caminho é seu pai, por exemplo, "posts/1234" é o pai de "posts/1234/title"
        return this.equals(other.parent);
    }
}
exports.PathInfo = PathInfo;
exports.default = PathInfo;

},{}],89:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaDefinition = void 0;
// parses a typestring, creates checker functions
function parse(definition) {
    // tokenize
    let pos = 0;
    function consumeSpaces() {
        let c;
        while (((c = definition[pos]), [" ", "\r", "\n", "\t"].includes(c))) {
            pos++;
        }
    }
    function consumeCharacter(c) {
        if (definition[pos] !== c) {
            throw new Error(`Unexpected character at position ${pos}. Expected: '${c}', found '${definition[pos]}'`);
        }
        pos++;
    }
    function readProperty() {
        consumeSpaces();
        const prop = { name: "", optional: false, wildcard: false };
        let c;
        while (((c = definition[pos]),
            c === "_" || c === "$" || (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || (prop.name.length > 0 && c >= "0" && c <= "9") || (prop.name.length === 0 && c === "*"))) {
            prop.name += c;
            pos++;
        }
        if (prop.name.length === 0) {
            throw new Error(`Property name expected at position ${pos}, found: ${definition.slice(pos, pos + 10)}..`);
        }
        if (definition[pos] === "?") {
            prop.optional = true;
            pos++;
        }
        if (prop.name === "*" || prop.name[0] === "$") {
            prop.optional = true;
            prop.wildcard = true;
        }
        consumeSpaces();
        consumeCharacter(":");
        return prop;
    }
    function readType() {
        consumeSpaces();
        let type = { typeOf: "any" }, c;
        // try reading simple type first: (string,number,boolean,Date etc)
        let name = "";
        while (((c = definition[pos]), (c >= "a" && c <= "z") || (c >= "A" && c <= "Z"))) {
            name += c;
            pos++;
        }
        if (name.length === 0) {
            if (definition[pos] === "*") {
                // any value
                consumeCharacter("*");
                type.typeOf = "any";
            }
            else if (["'", '"', "`"].includes(definition[pos])) {
                // Read string value
                type.typeOf = "string";
                type.value = "";
                const quote = definition[pos];
                consumeCharacter(quote);
                while (((c = definition[pos]), c && c !== quote)) {
                    type.value += c;
                    pos++;
                }
                consumeCharacter(quote);
            }
            else if (definition[pos] >= "0" && definition[pos] <= "9") {
                // read numeric value
                type.typeOf = "number";
                let nr = "";
                while (((c = definition[pos]), c === "." || c === "n" || (c >= "0" && c <= "9"))) {
                    nr += c;
                    pos++;
                }
                if (nr.endsWith("n")) {
                    type.value = BigInt(nr);
                }
                else if (nr.includes(".")) {
                    type.value = parseFloat(nr);
                }
                else {
                    type.value = parseInt(nr);
                }
            }
            else if (definition[pos] === "{") {
                // Read object (interface) definition
                consumeCharacter("{");
                type.typeOf = "object";
                type.instanceOf = Object;
                // Read children:
                type.children = [];
                while (true) {
                    const prop = readProperty();
                    const types = readTypes();
                    type.children.push({ name: prop.name, optional: prop.optional, wildcard: prop.wildcard, types });
                    consumeSpaces();
                    if (definition[pos] === ";" || definition[pos] === ",") {
                        consumeCharacter(definition[pos]);
                        consumeSpaces();
                    }
                    if (definition[pos] === "}") {
                        break;
                    }
                }
                consumeCharacter("}");
            }
            else if (definition[pos] === "/") {
                // Read regular expression definition
                consumeCharacter("/");
                let pattern = "", flags = "";
                while (((c = definition[pos]), c !== "/" || pattern.endsWith("\\"))) {
                    pattern += c;
                    pos++;
                }
                consumeCharacter("/");
                while (((c = definition[pos]), ["g", "i", "m", "s", "u", "y", "d"].includes(c))) {
                    flags += c;
                    pos++;
                }
                type.typeOf = "string";
                type.matches = new RegExp(pattern, flags);
            }
            else {
                throw new Error(`Expected a type definition at position ${pos}, found character '${definition[pos]}'`);
            }
        }
        else if (["string", "number", "boolean", "bigint", "undefined", "String", "Number", "Boolean", "BigInt"].includes(name)) {
            type.typeOf = name.toLowerCase();
        }
        else if (name === "Object" || name === "object") {
            type.typeOf = "object";
            type.instanceOf = Object;
        }
        else if (name === "Date") {
            type.typeOf = "object";
            type.instanceOf = Date;
        }
        else if (name === "Binary" || name === "binary") {
            type.typeOf = "object";
            type.instanceOf = ArrayBuffer;
        }
        else if (name === "any") {
            type.typeOf = "any";
        }
        else if (name === "null") {
            // This is ignored, null values are not stored in the db (null indicates deletion)
            type.typeOf = "object";
            type.value = null;
        }
        else if (name === "Array") {
            // Read generic Array defintion
            consumeCharacter("<");
            type.typeOf = "object";
            type.instanceOf = Array; //name;
            type.genericTypes = readTypes();
            consumeCharacter(">");
        }
        else if (["true", "false"].includes(name)) {
            type.typeOf = "boolean";
            type.value = name === "true";
        }
        else {
            throw new Error(`Unknown type at position ${pos}: "${type}"`);
        }
        // Check if it's an Array of given type (eg: string[] or string[][])
        // Also converts to generics, string[] becomes Array<string>, string[][] becomes Array<Array<string>>
        consumeSpaces();
        while (definition[pos] === "[") {
            consumeCharacter("[");
            consumeCharacter("]");
            type = { typeOf: "object", instanceOf: Array, genericTypes: [type] };
        }
        return type;
    }
    function readTypes() {
        consumeSpaces();
        const types = [readType()];
        while (definition[pos] === "|") {
            consumeCharacter("|");
            types.push(readType());
            consumeSpaces();
        }
        return types;
    }
    return readType();
}
function checkObject(path, properties, obj, partial) {
    // Are there any properties that should not be in there?
    const invalidProperties = properties.find((prop) => prop.name === "*" || prop.name[0] === "$") // Only if no wildcard properties are allowed
        ? []
        : Object.keys(obj).filter((key) => ![null, undefined].includes(obj[key]) && // Ignore null or undefined values
            !properties.find((prop) => prop.name === key));
    if (invalidProperties.length > 0) {
        return { ok: false, reason: `Object at path "${path}" cannot have propert${invalidProperties.length === 1 ? "y" : "ies"} ${invalidProperties.map((p) => `"${p}"`).join(", ")}` };
    }
    // Loop through properties that should be present
    function checkProperty(property) {
        const hasValue = ![null, undefined].includes(obj[property.name]);
        if (!property.optional && (partial ? obj[property.name] === null : !hasValue)) {
            return { ok: false, reason: `Property at path "${path}/${property.name}" is not optional` };
        }
        if (hasValue && property.types.length === 1) {
            return checkType(`${path}/${property.name}`, property.types[0], obj[property.name], false);
        }
        if (hasValue && !property.types.some((type) => checkType(`${path}/${property.name}`, type, obj[property.name], false).ok)) {
            return { ok: false, reason: `Property at path "${path}/${property.name}" does not match any of ${property.types.length} allowed types` };
        }
        return { ok: true };
    }
    const namedProperties = properties.filter((prop) => !prop.wildcard);
    const failedProperty = namedProperties.find((prop) => !checkProperty(prop).ok);
    if (failedProperty) {
        const reason = checkProperty(failedProperty).reason;
        return { ok: false, reason };
    }
    const wildcardProperty = properties.find((prop) => prop.wildcard);
    if (!wildcardProperty) {
        return { ok: true };
    }
    const wildcardChildKeys = Object.keys(obj).filter((key) => !namedProperties.find((prop) => prop.name === key));
    let result = { ok: true };
    for (let i = 0; i < wildcardChildKeys.length && result.ok; i++) {
        const childKey = wildcardChildKeys[i];
        result = checkProperty({ name: childKey, types: wildcardProperty.types, optional: true, wildcard: true });
    }
    return result;
}
function checkType(path, type, value, partial, trailKeys) {
    const ok = { ok: true };
    if (type.typeOf === "any") {
        return ok;
    }
    if (trailKeys instanceof Array && trailKeys.length > 0) {
        // The value to check resides in a descendant path of given type definition.
        // Recursivly check child type definitions to find a match
        if (type.typeOf !== "object") {
            return { ok: false, reason: `path "${path}" must be typeof ${type.typeOf}` }; // given value resides in a child path, but parent is not allowed be an object.
        }
        if (!type.children) {
            return ok;
        }
        const childKey = trailKeys[0];
        let property = type.children.find((prop) => prop.name === childKey);
        if (!property) {
            property = type.children.find((prop) => prop.name === "*" || prop.name[0] === "$");
        }
        if (!property) {
            return { ok: false, reason: `Object at path "${path}" cannot have property "${childKey}"` };
        }
        if (property.optional && value === null && trailKeys.length === 1) {
            return ok;
        }
        let result = { ok: false, reason: `` };
        property.types.some((type) => {
            const childPath = typeof childKey === "number" ? `${path}[${childKey}]` : `${path}/${childKey}`;
            result = checkType(childPath, type, value, partial, trailKeys.slice(1));
            return result.ok;
        });
        return result;
    }
    if (value === null) {
        return ok;
    }
    if (type.instanceOf === Object && (typeof value !== "object" || value instanceof Array || value instanceof Date)) {
        return { ok: false, reason: `path "${path}" must be an object collection` };
    }
    if (type.instanceOf && (typeof value !== "object" || value.constructor !== type.instanceOf)) {
        // !(value instanceof type.instanceOf) // value.constructor.name !== type.instanceOf
        return { ok: false, reason: `path "${path}" must be an instance of ${type.instanceOf.name}` };
    }
    if ("value" in type && value !== type.value) {
        return { ok: false, reason: `path "${path}" must be value: ${type.value}` };
    }
    if (typeof value !== type.typeOf) {
        return { ok: false, reason: `path "${path}" must be typeof ${type.typeOf}` };
    }
    if (type.instanceOf === Array && type.genericTypes && !value.every((v) => { var _a; return ((_a = type.genericTypes) !== null && _a !== void 0 ? _a : []).some((t) => checkType(path, t, v, false).ok); })) {
        return { ok: false, reason: `every array value of path "${path}" must match one of the specified types` };
    }
    if (type.typeOf === "object" && type.children) {
        return checkObject(path, type.children, value, partial);
    }
    if (type.matches && !type.matches.test(value)) {
        return { ok: false, reason: `path "${path}" must match regular expression /${type.matches.source}/${type.matches.flags}` };
    }
    return ok;
}
// eslint-disable-next-line @typescript-eslint/ban-types
function getConstructorType(val) {
    switch (val) {
        case String:
            return "string";
        case Number:
            return "number";
        case Boolean:
            return "boolean";
        case Date:
            return "Date";
        case BigInt:
            return "bigint";
        case Array:
            throw new Error("Schema error: Array cannot be used without a type. Use string[] or Array<string> instead");
        default:
            throw new Error(`Schema error: unknown type used: ${val.name}`);
    }
}
class SchemaDefinition {
    constructor(definition, handling = { warnOnly: false }) {
        this.handling = handling;
        this.source = definition;
        if (typeof definition === "object") {
            // Turn object into typescript definitions
            // eg:
            // const example = {
            //     name: String,
            //     born: Date,
            //     instrument: "'guitar'|'piano'",
            //     "address?": {
            //         street: String
            //     }
            // };
            // Resulting ts: "{name:string,born:Date,instrument:'guitar'|'piano',address?:{street:string}}"
            const toTS = (obj) => {
                return ("{" +
                    Object.keys(obj)
                        .map((key) => {
                        let val = obj[key];
                        if (val === undefined) {
                            val = "undefined";
                        }
                        else if (val instanceof RegExp) {
                            val = `/${val.source}/${val.flags}`;
                        }
                        else if (typeof val === "object") {
                            val = toTS(val);
                        }
                        else if (typeof val === "function") {
                            val = getConstructorType(val);
                        }
                        else if (!["string", "number", "boolean", "bigint"].includes(typeof val)) {
                            throw new Error(`Type definition for key "${key}" must be a string, number, boolean, bigint, object, regular expression, or one of these classes: String, Number, Boolean, Date, BigInt`);
                        }
                        return `${key}:${val}`;
                    })
                        .join(",") +
                    "}");
            };
            this.text = toTS(definition);
        }
        else if (typeof definition === "string") {
            this.text = definition;
        }
        else {
            throw new Error("Type definiton must be a string or an object");
        }
        this.type = parse(this.text);
    }
    check(path, value, partial, trailKeys) {
        const result = checkType(path, this.type, value, partial, trailKeys);
        if (!result.ok && this.handling.warnOnly) {
            // Only issue a warning, allows schema definitions to be added to a production db to monitor if they are accurate before enforcing them.
            result.warning = `${partial ? "Partial schema" : "Schema"} check on path "${path}"${trailKeys ? ` for child "${trailKeys.join("/")}"` : ""} failed: ${result.reason}`;
            result.ok = true;
            if (typeof this.handling.warnCallback === "function")
                this.handling.warnCallback(result.warning);
        }
        return result;
    }
}
exports.SchemaDefinition = SchemaDefinition;

},{}],90:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleCache = void 0;
const Utils_1 = require("./Utils");
const calculateExpiryTime = (expirySeconds) => (expirySeconds > 0 ? Date.now() + expirySeconds * 1000 : Infinity);
/**
 * Implementação simples de cache que mantém valores imutáveis na memória por um tempo limitado.
 * A imutabilidade é garantida clonando os valores armazenados e recuperados. Para alterar um valor em cache, ele terá que ser `set` novamente com o novo valor.
 */
class SimpleCache {
    get size() {
        return this.cache.size;
    }
    constructor(options) {
        var _a;
        this.enabled = true;
        if (typeof options === "number") {
            // Assinatura antiga: apenas expirySeconds fornecido
            options = { expirySeconds: options };
        }
        options.cloneValues = options.cloneValues !== false;
        if (typeof options.expirySeconds !== "number" && typeof options.maxEntries !== "number") {
            throw new Error("Either expirySeconds or maxEntries must be specified");
        }
        this.options = Object.assign({ expirySeconds: 15 }, options);
        this.cache = new Map();
        // Limpeza a cada minuto
        const interval = setInterval(() => {
            this.cleanUp();
        }, 60 * 1000);
        (_a = interval.unref) === null || _a === void 0 ? void 0 : _a.call(interval);
    }
    has(key) {
        if (!this.enabled) {
            return false;
        }
        return this.cache.has(key);
    }
    get(key) {
        if (!this.enabled) {
            return null;
        }
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        } // if (!entry || entry.expires <= Date.now()) { return null; }
        entry.expires = calculateExpiryTime(this.options.expirySeconds);
        entry.accessed = Date.now();
        return this.options.cloneValues ? (0, Utils_1.cloneObject)(entry.value) : entry.value;
    }
    set(key, value) {
        if (typeof this.options.maxEntries === "number" && this.options.maxEntries > 0 && this.cache.size >= this.options.maxEntries && !this.cache.has(key)) {
            // console.warn(`* cache limit ${this.options.maxEntries} reached: ${this.cache.size}`);
            // Remove um item expirado ou aquele que foi acessado há mais tempo
            let oldest = null;
            const now = Date.now();
            for (const [key, entry] of this.cache.entries()) {
                if (entry.expires <= now) {
                    // Found an expired item. Remove it now and stop
                    this.cache.delete(key);
                    oldest = null;
                    break;
                }
                if (!oldest || entry.accessed < oldest.accessed) {
                    oldest = { key, accessed: entry.accessed };
                }
            }
            if (oldest !== null) {
                this.cache.delete(oldest.key);
            }
        }
        this.cache.set(key, { value: this.options.cloneValues ? (0, Utils_1.cloneObject)(value) : value, added: Date.now(), accessed: Date.now(), expires: calculateExpiryTime(this.options.expirySeconds) });
    }
    remove(key) {
        this.cache.delete(key);
    }
    cleanUp() {
        const now = Date.now();
        this.cache.forEach((entry, key) => {
            if (entry.expires <= now) {
                this.cache.delete(key);
            }
        });
    }
    keys() {
        return Array.from(this.cache.keys());
    }
    values() {
        return Array.from(this.cache.values()).map((v) => v.value);
    }
    forEach(callback) {
        this.cache.forEach((entry, key) => {
            callback(entry.value, key, this);
        });
    }
}
exports.SimpleCache = SimpleCache;

},{"./Utils":96}],91:[function(require,module,exports){
arguments[4][69][0].apply(exports,arguments)
},{"dup":69}],92:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * rxjs is an optional dependency that only needs installing when any of IvipBase's observe methods are used.
 * If for some reason rxjs is not available (eg in test suite), we can provide a shim. This class is used when
 * `db.setObservable("shim")` is called
 */
class SimpleObservable {
    constructor(create) {
        this._active = false;
        this._subscribers = [];
        this._create = create;
    }
    subscribe(subscriber) {
        if (!this._active) {
            const next = (value) => {
                // emit value to all subscribers
                this._subscribers.forEach((s) => {
                    try {
                        s(value);
                    }
                    catch (err) {
                        console.error("Error in subscriber callback:", err);
                    }
                });
            };
            const observer = { next };
            this._cleanup = this._create(observer);
            this._active = true;
        }
        this._subscribers.push(subscriber);
        const unsubscribe = () => {
            this._subscribers.splice(this._subscribers.indexOf(subscriber), 1);
            if (this._subscribers.length === 0) {
                this._active = false;
                this._cleanup();
            }
        };
        const subscription = {
            unsubscribe,
        };
        return subscription;
    }
}
exports.default = SimpleObservable;

},{}],93:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventStream = exports.EventPublisher = exports.EventSubscription = void 0;
class EventSubscription {
    /**
     * @param stop function that stops the subscription from receiving future events
     */
    constructor(stop) {
        this.stop = stop;
        this._internal = {
            state: "init",
            activatePromises: [],
        };
    }
    /**
     * Notifies when subscription is activated or canceled
     * @param callback optional callback to run each time activation state changes
     * @returns returns a promise that resolves once activated, or rejects when it is denied (and no callback was supplied)
     */
    activated(callback) {
        if (callback) {
            this._internal.activatePromises.push({ callback });
            if (this._internal.state === "active") {
                callback(true);
            }
            else if (this._internal.state === "canceled") {
                callback(false, this._internal.cancelReason);
            }
        }
        // Changed behaviour: now also returns a Promise when the callback is used.
        // This allows for 1 activated call to both handle: first activation result,
        // and any future events using the callback
        return new Promise((resolve, reject) => {
            if (this._internal.state === "active") {
                return resolve();
            }
            else if (this._internal.state === "canceled" && !callback) {
                return reject(new Error(this._internal.cancelReason));
            }
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            const noop = () => { };
            this._internal.activatePromises.push({
                resolve,
                reject: callback ? noop : reject, // Don't reject when callback is used: let callback handle this (prevents UnhandledPromiseRejection if only callback is used)
            });
        });
    }
    /** (for internal use) */
    _setActivationState(activated, cancelReason) {
        this._internal.cancelReason = cancelReason;
        this._internal.state = activated ? "active" : "canceled";
        while (this._internal.activatePromises.length > 0) {
            const p = this._internal.activatePromises.shift();
            if (p && activated) {
                p.callback && p.callback(true);
                p.resolve && p.resolve();
            }
            else if (p) {
                p.callback && p.callback(false, cancelReason);
                p.reject && p.reject(cancelReason);
            }
        }
    }
}
exports.EventSubscription = EventSubscription;
class EventPublisher {
    /**
     *
     * @param publish function that publishes a new value to subscribers, return if there are any active subscribers
     * @param start function that notifies subscribers their subscription is activated
     * @param cancel function that notifies subscribers their subscription has been canceled, removes all subscriptions
     */
    constructor(publish, start, cancel) {
        this.publish = publish;
        this.start = start;
        this.cancel = cancel;
    }
}
exports.EventPublisher = EventPublisher;
class EventStream {
    constructor(eventPublisherCallback) {
        const subscribers = [];
        let noMoreSubscribersCallback;
        let activationState; // TODO: refactor to string only: STATE_INIT, STATE_STOPPED, STATE_ACTIVATED, STATE_CANCELED
        const STATE_STOPPED = "stopped (no more subscribers)";
        this.subscribe = (callback, activationCallback) => {
            if (typeof callback !== "function") {
                throw new TypeError("callback must be a function");
            }
            else if (activationState === STATE_STOPPED) {
                throw new Error("stream can't be used anymore because all subscribers were stopped");
            }
            const sub = {
                callback,
                activationCallback: function (activated, cancelReason) {
                    activationCallback === null || activationCallback === void 0 ? void 0 : activationCallback(activated, cancelReason);
                    this.subscription._setActivationState(activated, cancelReason);
                },
                subscription: new EventSubscription(function stop() {
                    subscribers.splice(subscribers.indexOf(sub), 1);
                    return checkActiveSubscribers();
                }),
            };
            subscribers.push(sub);
            if (typeof activationState !== "undefined") {
                if (activationState === true) {
                    activationCallback === null || activationCallback === void 0 ? void 0 : activationCallback(true);
                    sub.subscription._setActivationState(true);
                }
                else if (typeof activationState === "string") {
                    activationCallback === null || activationCallback === void 0 ? void 0 : activationCallback(false, activationState);
                    sub.subscription._setActivationState(false, activationState);
                }
            }
            return sub.subscription;
        };
        const checkActiveSubscribers = () => {
            let ret;
            if (subscribers.length === 0) {
                ret = noMoreSubscribersCallback === null || noMoreSubscribersCallback === void 0 ? void 0 : noMoreSubscribersCallback();
                activationState = STATE_STOPPED;
            }
            return Promise.resolve(ret);
        };
        this.unsubscribe = (callback) => {
            const remove = callback ? subscribers.filter((sub) => sub.callback === callback) : subscribers;
            remove.forEach((sub) => {
                const i = subscribers.indexOf(sub);
                subscribers.splice(i, 1);
            });
            checkActiveSubscribers();
        };
        this.stop = () => {
            // Stop (remove) all subscriptions
            subscribers.splice(0);
            checkActiveSubscribers();
        };
        /**
         * For publishing side: adds a value that will trigger callbacks to all subscribers
         * @param val
         * @returns returns whether there are subscribers left
         */
        const publish = (val) => {
            subscribers.forEach((sub) => {
                try {
                    sub.callback(val);
                }
                catch (err) {
                    console.error(`Error running subscriber callback: ${err.message}`);
                }
            });
            if (subscribers.length === 0) {
                checkActiveSubscribers();
            }
            return subscribers.length > 0;
        };
        /**
         * For publishing side: let subscribers know their subscription is activated. Should be called only once
         */
        const start = (allSubscriptionsStoppedCallback) => {
            activationState = true;
            noMoreSubscribersCallback = allSubscriptionsStoppedCallback;
            subscribers.forEach((sub) => {
                var _a;
                (_a = sub.activationCallback) === null || _a === void 0 ? void 0 : _a.call(sub, true);
            });
        };
        /**
         * For publishing side: let subscribers know their subscription has been canceled. Should be called only once
         */
        const cancel = (reason) => {
            activationState = reason;
            subscribers.forEach((sub) => {
                var _a;
                (_a = sub.activationCallback) === null || _a === void 0 ? void 0 : _a.call(sub, false, reason || new Error("unknown reason"));
            });
            subscribers.splice(0); // Clear all
        };
        const publisher = new EventPublisher(publish, start, cancel);
        eventPublisherCallback(publisher);
    }
}
exports.EventStream = EventStream;

},{}],94:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deserialize2 = exports.serialize2 = exports.serialize = exports.detectSerializeVersion = exports.deserialize = void 0;
const Ascii85_1 = __importDefault(require("./Ascii85"));
const PartialArray_1 = require("./PartialArray");
const PathInfo_1 = __importStar(require("./PathInfo"));
const Utils_1 = require("./Utils");
/*
    There are now 2 different serialization methods for transporting values.

    v1:
    The original version (v1) created an object with "map" and "val" properties.
    The "map" property was made optional in v1.14.1 so they won't be present for values needing no serializing

    v2:
    The new version replaces serialized values inline by objects containing ".type" and ".val" properties.
    This serializing method was introduced by `export` and `import` methods because they use streaming and
    are unable to prepare type mappings up-front. This format is smaller in transmission (in many cases),
    and easier to read and process.

    original: { "date": (some date) }
    v1 serialized: { "map": { "date": "date" }, "val": { date: "2022-04-22T07:49:23Z" } }
    v2 serialized: { "date": { ".type": "date", ".val": "2022-04-22T07:49:23Z" } }

    original: (some date)
    v1 serialized: { "map": "date", "val": "2022-04-22T07:49:23Z" }
    v2 serialized: { ".type": "date", ".val": "2022-04-22T07:49:23Z" }
    comment: top level value that need serializing is wrapped in an object with ".type" and ".val". v1 is smaller in this case

    original: 'some string'
    v1 serialized: { "map": {}, "val": "some string" }
    v2 serialized: "some string"
    comment: primitive types such as strings don't need serializing and are returned as is in v2

    original: { "date": (some date), "text": "Some string" }
    v1 serialized: { "map": { "date": "date" }, "val": { date: "2022-04-22T07:49:23Z", "text": "Some string" } }
    v2 serialized: { "date": { ".type": "date", ".val": "2022-04-22T07:49:23Z" }, "text": "Some string" }
*/
/**
 * Original deserialization method using global `map` and `val` properties
 * @param data
 * @returns
 */
const deserialize = (data) => {
    if (data.map === null || typeof data.map === "undefined") {
        if (typeof data.val === "undefined") {
            throw new Error("serialized value must have a val property");
        }
        return data.val;
    }
    const deserializeValue = (type, val) => {
        if (type === "date") {
            // Date was serialized as a string (UTC)
            return new Date(val);
        }
        else if (type === "binary") {
            // ascii85 encoded binary data
            return Ascii85_1.default.decode(val);
        }
        else if (type === "reference") {
            return new PathInfo_1.PathReference(val);
        }
        else if (type === "regexp") {
            return new RegExp(val.pattern, val.flags);
        }
        else if (type === "array") {
            return new PartialArray_1.PartialArray(val);
        }
        else if (type === "bigint") {
            return BigInt(val);
        }
        return val;
    };
    if (typeof data.map === "string") {
        // Single value
        return deserializeValue(data.map, data.val);
    }
    Object.keys(data.map).forEach((path) => {
        const type = data.map[path];
        const keys = PathInfo_1.default.getPathKeys(path);
        let parent = data;
        let key = "val";
        let val = data.val;
        keys.forEach((k) => {
            key = k;
            parent = val;
            val = val[key]; // If an error occurs here, there's something wrong with the calling code...
        });
        parent[key] = deserializeValue(type, val);
    });
    return data.val;
};
exports.deserialize = deserialize;
/**
 * Function to detect the used serialization method with for the given object
 * @param data
 * @returns
 */
const detectSerializeVersion = (data) => {
    if (typeof data !== "object" || data === null) {
        // This can only be v2, which allows primitive types to bypass serializing
        return 2;
    }
    if ("map" in data && "val" in data) {
        return 1;
    }
    else if ("val" in data) {
        // If it's v1, 'val' will be the only key in the object because serialize2 adds ".version": 2 to the object to prevent confusion.
        if (Object.keys(data).length > 1) {
            return 2;
        }
        return 1;
    }
    return 2;
};
exports.detectSerializeVersion = detectSerializeVersion;
/**
 * Original serialization method using global `map` and `val` properties
 * @param data
 * @returns
 */
const serialize = (obj) => {
    var _a;
    // Recursively find dates and binary data
    if (obj === null || typeof obj !== "object" || obj instanceof Date || obj instanceof ArrayBuffer || obj instanceof PathInfo_1.PathReference || obj instanceof RegExp) {
        // Single value
        const ser = (0, exports.serialize)({ value: obj });
        return {
            map: (_a = ser.map) === null || _a === void 0 ? void 0 : _a.value,
            val: ser.val.value,
        };
    }
    obj = (0, Utils_1.cloneObject)(obj); // Make sure we don't alter the original object
    const process = (obj, mappings, prefix) => {
        if (obj instanceof PartialArray_1.PartialArray) {
            mappings[prefix] = "array";
        }
        Object.keys(obj).forEach((key) => {
            const val = obj[key];
            const path = prefix.length === 0 ? key : `${prefix}/${key}`;
            if (typeof val === "bigint") {
                obj[key] = val.toString();
                mappings[path] = "bigint";
            }
            else if (val instanceof Date) {
                // serialize date to UTC string
                obj[key] = val.toISOString();
                mappings[path] = "date";
            }
            else if (val instanceof ArrayBuffer) {
                // Serialize binary data with ascii85
                obj[key] = Ascii85_1.default.encode(val); //ascii85.encode(Buffer.from(val)).toString();
                mappings[path] = "binary";
            }
            else if (val instanceof PathInfo_1.PathReference) {
                obj[key] = val.path;
                mappings[path] = "reference";
            }
            else if (val instanceof RegExp) {
                // Queries using the 'matches' filter with a regular expression can now also be used on remote db's
                obj[key] = { pattern: val.source, flags: val.flags };
                mappings[path] = "regexp";
            }
            else if (typeof val === "object" && val !== null) {
                process(val, mappings, path);
            }
        });
    };
    const mappings = {};
    process(obj, mappings, "");
    const serialized = { val: obj };
    if (Object.keys(mappings).length > 0) {
        serialized.map = mappings;
    }
    return serialized;
};
exports.serialize = serialize;
/**
 * New serialization method using inline `.type` and `.val` properties
 * @param obj
 * @returns
 */
const serialize2 = (obj) => {
    // Recursively find data that needs serializing
    const getSerializedValue = (val) => {
        if (typeof val === "bigint") {
            // serialize bigint to string
            return {
                ".type": "bigint",
                ".val": val.toString(),
            };
        }
        else if (val instanceof Date) {
            // serialize date to UTC string
            return {
                ".type": "date",
                ".val": val.toISOString(),
            };
        }
        else if (val instanceof ArrayBuffer) {
            // Serialize binary data with ascii85
            return {
                ".type": "binary",
                ".val": Ascii85_1.default.encode(val),
            };
        }
        else if (val instanceof PathInfo_1.PathReference) {
            return {
                ".type": "reference",
                ".val": val.path,
            };
        }
        else if (val instanceof RegExp) {
            // Queries using the 'matches' filter with a regular expression can now also be used on remote db's
            return {
                ".type": "regexp",
                ".val": `/${val.source}/${val.flags}`, // new: shorter
                // '.val': {
                //     pattern: val.source,
                //     flags: val.flags
                // }
            };
        }
        else if (typeof val === "object" && val !== null) {
            if (val instanceof Array) {
                const copy = [];
                for (let i = 0; i < val.length; i++) {
                    copy[i] = getSerializedValue(val[i]);
                }
                return copy;
            }
            else {
                const copy = {}; //val instanceof Array ? [] : {} as SerializedValueV2;
                if (val instanceof PartialArray_1.PartialArray) {
                    // Mark the object as partial ("sparse") array
                    copy[".type"] = "array";
                }
                for (const prop in val) {
                    copy[prop] = getSerializedValue(val[prop]);
                }
                return copy;
            }
        }
        else {
            // Primitive value. Don't serialize
            return val;
        }
    };
    const serialized = getSerializedValue(obj);
    if (serialized !== null && typeof serialized === "object" && "val" in serialized && Object.keys(serialized).length === 1) {
        // acebase-core v1.14.1 made the 'map' property optional.
        // This v2 serialized object might be confused with a v1 without mappings, because it only has a "val" property
        // To prevent this, mark the serialized object with version 2
        serialized[".version"] = 2;
    }
    return serialized;
};
exports.serialize2 = serialize2;
/**
 * New deserialization method using inline `.type` and `.val` properties
 * @param obj
 * @returns
 */
const deserialize2 = (data) => {
    if (typeof data !== "object" || data === null) {
        // primitive value, not serialized
        return data;
    }
    if (typeof data[".type"] === "undefined") {
        // No type given: this is a plain object or array
        if (data instanceof Array) {
            // Plain array, deserialize items into a copy
            const copy = [];
            const arr = data;
            for (let i = 0; i < arr.length; i++) {
                copy.push((0, exports.deserialize2)(arr[i]));
            }
            return copy;
        }
        else {
            // Plain object, deserialize properties into a copy
            const copy = {};
            const obj = data;
            for (const prop in obj) {
                copy[prop] = (0, exports.deserialize2)(obj[prop]);
            }
            return copy;
        }
    }
    else if (typeof data[".type"] === "string") {
        const dataType = data[".type"].toLowerCase();
        if (dataType === "bigint") {
            const val = data[".val"];
            return BigInt(val);
        }
        else if (dataType === "array") {
            // partial ("sparse") array, deserialize children into a copy
            const arr = data;
            const copy = {};
            for (const index in arr) {
                copy[index] = (0, exports.deserialize2)(arr[index]);
            }
            delete copy[".type"];
            return new PartialArray_1.PartialArray(copy);
        }
        else if (dataType === "date") {
            // Date was serialized as a string (UTC)
            const val = data[".val"];
            return new Date(val);
        }
        else if (dataType === "binary") {
            // ascii85 encoded binary data
            const val = data[".val"];
            return Ascii85_1.default.decode(val);
        }
        else if (dataType === "reference") {
            const val = data[".val"];
            return new PathInfo_1.PathReference(val);
        }
        else if (dataType === "regexp") {
            const val = data[".val"];
            if (typeof val === "string") {
                // serialized as '/(pattern)/flags'
                const match = /^\/(.*)\/([a-z]+)$/.exec(val);
                return match ? new RegExp(match[1], match[2]) : null;
            }
            // serialized as object with pattern & flags properties
            return new RegExp(val.pattern, val.flags);
        }
    }
    throw new Error(`Unknown data type "${data[".type"]}" in serialized value`);
};
exports.deserialize2 = deserialize2;

},{"./Ascii85":81,"./PartialArray":87,"./PathInfo":88,"./Utils":96}],95:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Utils_1 = require("./Utils");
const PathInfo_1 = __importDefault(require("./PathInfo"));
const reference_1 = require("../DataBase/reference");
const snapshot_1 = require("../DataBase/snapshot");
/**
 * (for internal use) - gets the mapping set for a specific path
 */
function get(mappings, path) {
    // path points to the mapped (object container) location
    path = path.replace(/^\/|\/$/g, ""); // trim slashes
    const keys = PathInfo_1.default.getPathKeys(path);
    const mappedPath = Object.keys(mappings).find((mpath) => {
        const mkeys = PathInfo_1.default.getPathKeys(mpath);
        if (mkeys.length !== keys.length) {
            return false; // Can't be a match
        }
        return mkeys.every((mkey, index) => {
            if (mkey === "*" || (typeof mkey === "string" && mkey[0] === "$")) {
                return true; // wildcard
            }
            return mkey === keys[index];
        });
    });
    if (!mappedPath)
        return;
    const mapping = mappings[mappedPath];
    return mapping;
}
/**
 * (for internal use) - gets the mapping set for a specific path's parent
 */
function map(mappings, path) {
    // path points to the object location, its parent should have the mapping
    const targetPath = PathInfo_1.default.get(path).parentPath;
    if (targetPath === null) {
        return;
    }
    return get(mappings, targetPath);
}
/**
 * (for internal use) - gets all mappings set for a specific path and all subnodes
 * @returns returns array of all matched mappings in path
 */
function mapDeep(mappings, entryPath) {
    // returns mapping for this node, and all mappings for nested nodes
    // entryPath: "users/ewout"
    // mappingPath: "users"
    // mappingPath: "users/*/posts"
    entryPath = entryPath.replace(/^\/|\/$/g, ""); // trim slashes
    // Start with current path's parent node
    const pathInfo = PathInfo_1.default.get(entryPath);
    const startPath = pathInfo.parentPath;
    const keys = startPath ? PathInfo_1.default.getPathKeys(startPath) : [];
    // Every path that starts with startPath, is a match
    // TODO: refactor to return Object.keys(mappings),filter(...)
    const matches = Object.keys(mappings).reduce((m, mpath) => {
        //const mkeys = mpath.length > 0 ? mpath.split("/") : [];
        const mkeys = PathInfo_1.default.getPathKeys(mpath);
        if (mkeys.length < keys.length) {
            return m; // Can't be a match
        }
        let isMatch = true;
        if (keys.length === 0 && startPath !== null) {
            // Only match first node's children if mapping pattern is "*" or "$variable"
            isMatch = mkeys.length === 1 && (mkeys[0] === "*" || (typeof mkeys[0] === "string" && mkeys[0][0] === "$"));
        }
        else {
            mkeys.every((mkey, index) => {
                if (index >= keys.length) {
                    return false; // stop .every loop
                }
                else if (mkey === "*" || (typeof mkey === "string" && mkey[0] === "$") || mkey === keys[index]) {
                    return true; // continue .every loop
                }
                else {
                    isMatch = false;
                    return false; // stop .every loop
                }
            });
        }
        if (isMatch) {
            const mapping = mappings[mpath];
            m.push({ path: mpath, type: mapping });
        }
        return m;
    }, []);
    return matches;
}
/**
 * (for internal use) - serializes or deserializes an object using type mappings
 * @returns returns the (de)serialized value
 */
function process(db, mappings, path, obj, action) {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }
    const keys = PathInfo_1.default.getPathKeys(path); // path.length > 0 ? path.split("/") : [];
    const m = mapDeep(mappings, path);
    const changes = [];
    m.sort((a, b) => (PathInfo_1.default.getPathKeys(a.path).length > PathInfo_1.default.getPathKeys(b.path).length ? -1 : 1)); // Deepest paths first
    m.forEach((mapping) => {
        const mkeys = PathInfo_1.default.getPathKeys(mapping.path); //mapping.path.length > 0 ? mapping.path.split("/") : [];
        mkeys.push("*");
        const mTrailKeys = mkeys.slice(keys.length);
        if (mTrailKeys.length === 0) {
            const vars = PathInfo_1.default.extractVariables(mapping.path, path);
            const ref = new reference_1.DataReference(db, path, vars);
            if (action === "serialize") {
                // serialize this object
                obj = mapping.type.serialize(obj, ref);
            }
            else if (action === "deserialize") {
                // deserialize this object
                const snap = new snapshot_1.DataSnapshot(ref, obj);
                obj = mapping.type.deserialize(snap);
            }
            return;
        }
        // Find all nested objects at this trail path
        const process = (parentPath, parent, keys) => {
            if (obj === null || typeof obj !== "object") {
                return obj;
            }
            const key = keys[0];
            let children = [];
            if (key === "*" || (typeof key === "string" && key[0] === "$")) {
                // Include all children
                if (parent instanceof Array) {
                    children = parent.map((val, index) => ({
                        key: index,
                        val,
                    }));
                }
                else {
                    children = Object.keys(parent).map((k) => ({
                        key: k,
                        val: parent[k],
                    }));
                }
            }
            else {
                // Get the 1 child
                const child = parent[key];
                if (typeof child === "object") {
                    children.push({ key, val: child });
                }
            }
            children.forEach((child) => {
                const childPath = PathInfo_1.default.getChildPath(parentPath, child.key);
                const vars = PathInfo_1.default.extractVariables(mapping.path, childPath);
                const ref = new reference_1.DataReference(db, childPath, vars);
                if (keys.length === 1) {
                    // TODO: this alters the existing object, we must build our own copy!
                    if (action === "serialize") {
                        // serialize this object
                        changes.push({
                            parent,
                            key: child.key,
                            original: parent[child.key],
                        });
                        parent[child.key] = mapping.type.serialize(child.val, ref);
                    }
                    else if (action === "deserialize") {
                        // deserialize this object
                        const snap = new snapshot_1.DataSnapshot(ref, child.val);
                        parent[child.key] = mapping.type.deserialize(snap);
                    }
                }
                else {
                    // Dig deeper
                    process(childPath, child.val, keys.slice(1));
                }
            });
        };
        process(path, obj, mTrailKeys);
    });
    if (action === "serialize") {
        // Clone this serialized object so any types that remained
        // will become plain objects without functions, and we can restore
        // the original object's values if any mappings were processed.
        // This will also prevent circular references
        obj = (0, Utils_1.cloneObject)(obj);
        if (changes.length > 0) {
            // Restore the changes made to the original object
            changes.forEach((change) => {
                change.parent[change.key] = change.original;
            });
        }
    }
    return obj;
}
const _mappings = Symbol("mappings");
class TypeMappings {
    constructor(db) {
        this.db = db;
        this[_mappings] = {};
    }
    /** (for internal use) */
    get mappings() {
        return this[_mappings];
    }
    /** (for internal use) */
    map(path) {
        return map(this[_mappings], path);
    }
    /**
     * Maps objects that are stored in a specific path to a class, so they can automatically be
     * serialized when stored to, and deserialized (instantiated) when loaded from the database.
     * @param path path to an object container, eg "users" or "users/*\/posts"
     * @param type class to bind all child objects of path to
     * Best practice is to implement 2 methods for instantiation and serializing of your objects:
     * 1) `static create(snap: DataSnapshot)` and 2) `serialize(ref: DataReference)`. See example
     * @param options (optional) You can specify the functions to use to
     * serialize and/or instantiate your class. If you do not specificy a creator (constructor) method,
     * IvipBase will call `YourClass.create(snapshot)` method if it exists, or create an instance of
     * YourClass with `new YourClass(snapshot)`.
     * If you do not specifiy a serializer method, IvipBase will call `YourClass.prototype.serialize(ref)`
     * if it exists, or tries storing your object's fields unaltered. NOTE: `this` in your creator
     * function will point to `YourClass`, and `this` in your serializer function will point to the
     * `instance` of `YourClass`.
     * @example
     * class User {
     *    static create(snap: DataSnapshot): User {
     *        // Deserialize (instantiate) User from plain database object
     *        let user = new User();
     *        Object.assign(user, snap.val()); // Copy all properties to user
     *        user.id = snap.ref.key; // Add the key as id
     *        return user;
     *    }
     *    serialize(ref: DataReference) {
     *        // Serialize user for database storage
     *        return {
     *            name: this.name
     *            email: this.email
     *        };
     *    }
     * }
     * db.types.bind('users', User); // Automatically uses serialize and static create methods
     */
    bind(path, type, options = {}) {
        // Maps objects that are stored in a specific path to a constructor method,
        // so they are automatically deserialized
        if (typeof path !== "string") {
            throw new TypeError("path must be a string");
        }
        if (typeof type !== "function") {
            throw new TypeError("constructor must be a function");
        }
        if (typeof options.serializer === "undefined") {
            // if (typeof type.prototype.serialize === 'function') {
            //     // Use .serialize instance method
            //     options.serializer = type.prototype.serialize;
            // }
            // Use object's serialize method upon serialization (if available)
        }
        else if (typeof options.serializer === "string") {
            if (typeof type.prototype[options.serializer] === "function") {
                options.serializer = type.prototype[options.serializer];
            }
            else {
                throw new TypeError(`${type.name}.prototype.${options.serializer} is not a function, cannot use it as serializer`);
            }
        }
        else if (typeof options.serializer !== "function") {
            throw new TypeError(`serializer for class ${type.name} must be a function, or the name of a prototype method`);
        }
        if (typeof options.creator === "undefined") {
            if (typeof type.create === "function") {
                // Use static .create as creator method
                options.creator = type.create;
            }
        }
        else if (typeof options.creator === "string") {
            if (typeof type[options.creator] === "function") {
                options.creator = type[options.creator];
            }
            else {
                throw new TypeError(`${type.name}.${options.creator} is not a function, cannot use it as creator`);
            }
        }
        else if (typeof options.creator !== "function") {
            throw new TypeError(`creator for class ${type.name} must be a function, or the name of a static method`);
        }
        path = path.replace(/^\/|\/$/g, ""); // trim slashes
        this[_mappings][path] = {
            db: this.db,
            type,
            creator: options.creator,
            serializer: options.serializer,
            deserialize(snap) {
                // run constructor method
                let obj;
                if (this.creator) {
                    obj = this.creator.call(this.type, snap);
                }
                else {
                    obj = new this.type(snap);
                }
                return obj;
            },
            serialize(obj, ref) {
                if (this.serializer) {
                    obj = this.serializer.call(obj, ref, obj);
                }
                else if (obj && typeof obj.serialize === "function") {
                    obj = obj.serialize(ref, obj);
                }
                return obj;
            },
        };
    }
    /**
     * @internal (for internal use)
     * Serializes any child in given object that has a type mapping
     * @param path | path to the object's location
     * @param obj object to serialize
     */
    serialize(path, obj) {
        return process(this.db, this[_mappings], path, obj, "serialize");
    }
    /**
     * @internal (for internal use)
     * Deserialzes any child in given object that has a type mapping
     * @param path path to the object's location
     * @param obj object to deserialize
     */
    deserialize(path, obj) {
        return process(this.db, this[_mappings], path, obj, "deserialize");
    }
}
exports.default = TypeMappings;

},{"../DataBase/reference":79,"../DataBase/snapshot":80,"./PathInfo":88,"./Utils":96}],96:[function(require,module,exports){
(function (global,Buffer){(function (){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uuidv4 = exports.deepEqual = exports.isEmpty = exports.safeGet = exports.contains = exports.getGlobalObject = exports.defer = exports.getChildValues = exports.getMutations = exports.compareValues = exports.isDate = exports.ObjectDifferences = exports.valuesAreEqual = exports.cloneObject = exports.concatTypedArrays = exports.decodeString = exports.encodeString = exports.bytesToBigint = exports.bigintToBytes = exports.bytesToNumber = exports.numberToBytes = void 0;
const PathInfo_1 = require("./PathInfo");
const PartialArray_1 = require("./PartialArray");
const process_1 = __importDefault(require("../process"));
function numberToBytes(number) {
    const bytes = new Uint8Array(8);
    const view = new DataView(bytes.buffer);
    view.setFloat64(0, number);
    return new Array(...bytes);
}
exports.numberToBytes = numberToBytes;
function bytesToNumber(bytes) {
    const length = Array.isArray(bytes) ? bytes.length : bytes.byteLength;
    if (length !== 8) {
        throw new TypeError("must be 8 bytes");
    }
    const bin = new Uint8Array(bytes);
    const view = new DataView(bin.buffer);
    const nr = view.getFloat64(0);
    return nr;
}
exports.bytesToNumber = bytesToNumber;
const hasBigIntSupport = (() => {
    try {
        return typeof BigInt(0) === "bigint";
    }
    catch (err) {
        return false;
    }
})();
const noBigIntError = "BigInt is not supported on this platform";
const bigIntFunctions = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    bigintToBytes(number) {
        throw new Error(noBigIntError);
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    bytesToBigint(bytes) {
        throw new Error(noBigIntError);
    },
};
if (hasBigIntSupport) {
    const big = {
        zero: BigInt(0),
        one: BigInt(1),
        two: BigInt(2),
        eight: BigInt(8),
        ff: BigInt(0xff),
    };
    bigIntFunctions.bigintToBytes = function bigintToBytes(number) {
        if (typeof number !== "bigint") {
            throw new Error("number must be a bigint");
        }
        const bytes = [];
        const negative = number < big.zero;
        do {
            const byte = Number(number & big.ff); // NOTE: bits are inverted on negative numbers
            bytes.push(byte);
            number = number >> big.eight;
        } while (number !== (negative ? -big.one : big.zero));
        bytes.reverse(); // little-endian
        if (negative ? bytes[0] < 128 : bytes[0] >= 128) {
            bytes.unshift(negative ? 255 : 0); // extra sign byte needed
        }
        return bytes;
    };
    bigIntFunctions.bytesToBigint = function bytesToBigint(bytes) {
        const negative = bytes[0] >= 128;
        let number = big.zero;
        for (let b of bytes) {
            if (negative) {
                b = ~b & 0xff;
            } // Invert the bits
            number = (number << big.eight) + BigInt(b);
        }
        if (negative) {
            number = -(number + big.one);
        }
        return number;
    };
}
exports.bigintToBytes = bigIntFunctions.bigintToBytes;
exports.bytesToBigint = bigIntFunctions.bytesToBigint;
/**
 * Converts a string to a utf-8 encoded Uint8Array
 */
function encodeString(str) {
    if (typeof TextEncoder !== "undefined") {
        // Modern browsers, Node.js v11.0.0+ (or v8.3.0+ with util.TextEncoder)
        const encoder = new TextEncoder();
        return encoder.encode(str);
    }
    else if (typeof Buffer === "function") {
        // Node.js
        const buf = Buffer.from(str, "utf-8");
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    else {
        // Older browsers. Manually encode
        const arr = [];
        for (let i = 0; i < str.length; i++) {
            let code = str.charCodeAt(i);
            if (code > 128) {
                // Attempt simple UTF-8 conversion. See https://en.wikipedia.org/wiki/UTF-8
                if ((code & 0xd800) === 0xd800) {
                    // code starts with 1101 10...: this is a 2-part utf-16 char code
                    const nextCode = str.charCodeAt(i + 1);
                    if ((nextCode & 0xdc00) !== 0xdc00) {
                        // next code must start with 1101 11...
                        throw new Error("follow-up utf-16 character does not start with 0xDC00");
                    }
                    i++;
                    const p1 = code & 0x3ff; // Only use last 10 bits
                    const p2 = nextCode & 0x3ff;
                    // Create code point from these 2: (see https://en.wikipedia.org/wiki/UTF-16)
                    code = 0x10000 | (p1 << 10) | p2;
                }
                if (code < 2048) {
                    // Use 2 bytes for 11 bit value, first byte starts with 110xxxxx (0xc0), 2nd byte with 10xxxxxx (0x80)
                    const b1 = 0xc0 | ((code >> 6) & 0x1f); // 0xc0 = 11000000, 0x1f = 11111
                    const b2 = 0x80 | (code & 0x3f); // 0x80 = 10000000, 0x3f = 111111
                    arr.push(b1, b2);
                }
                else if (code < 65536) {
                    // Use 3 bytes for 16-bit value, bits per byte: 4, 6, 6
                    const b1 = 0xe0 | ((code >> 12) & 0xf); // 0xe0 = 11100000, 0xf = 1111
                    const b2 = 0x80 | ((code >> 6) & 0x3f); // 0x80 = 10000000, 0x3f = 111111
                    const b3 = 0x80 | (code & 0x3f);
                    arr.push(b1, b2, b3);
                }
                else if (code < 2097152) {
                    // Use 4 bytes for 21-bit value, bits per byte: 3, 6, 6, 6
                    const b1 = 0xf0 | ((code >> 18) & 0x7); // 0xf0 = 11110000, 0x7 = 111
                    const b2 = 0x80 | ((code >> 12) & 0x3f); // 0x80 = 10000000, 0x3f = 111111
                    const b3 = 0x80 | ((code >> 6) & 0x3f); // 0x80 = 10000000, 0x3f = 111111
                    const b4 = 0x80 | (code & 0x3f);
                    arr.push(b1, b2, b3, b4);
                }
                else {
                    throw new Error(`Cannot convert character ${str.charAt(i)} (code ${code}) to utf-8`);
                }
            }
            else {
                arr.push(code < 128 ? code : 63); // 63 = ?
            }
        }
        return new Uint8Array(arr);
    }
}
exports.encodeString = encodeString;
/**
 * Converts a utf-8 encoded buffer to string
 */
function decodeString(buffer) {
    // ArrayBuffer|
    if (typeof TextDecoder !== "undefined") {
        // Modern browsers, Node.js v11.0.0+ (or v8.3.0+ with util.TextDecoder)
        const decoder = new TextDecoder();
        if (buffer instanceof Uint8Array) {
            return decoder.decode(buffer);
        }
        const buf = Uint8Array.from(buffer);
        return decoder.decode(buf);
    }
    else if (typeof Buffer === "function") {
        // Node.js (v10 and below)
        if (buffer instanceof Array) {
            buffer = Uint8Array.from(buffer); // convert to typed array
        }
        if (!(buffer instanceof Buffer) && "buffer" in buffer && buffer.buffer instanceof ArrayBuffer) {
            const typedArray = buffer;
            buffer = Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength); // Convert typed array to node.js Buffer
        }
        if (!(buffer instanceof Buffer)) {
            throw new Error("Unsupported buffer argument");
        }
        return buffer.toString("utf-8");
    }
    else {
        // Older browsers. Manually decode!
        if (!(buffer instanceof Uint8Array) && "buffer" in buffer && buffer["buffer"] instanceof ArrayBuffer) {
            // Convert TypedArray to Uint8Array
            const typedArray = buffer;
            buffer = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
        }
        if (buffer instanceof Buffer || buffer instanceof Array || buffer instanceof Uint8Array) {
            let str = "";
            for (let i = 0; i < buffer.length; i++) {
                let code = buffer[i];
                if (code > 128) {
                    // Decode Unicode character
                    if ((code & 0xf0) === 0xf0) {
                        // 4 byte char
                        const b1 = code, b2 = buffer[i + 1], b3 = buffer[i + 2], b4 = buffer[i + 3];
                        code = ((b1 & 0x7) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f);
                        i += 3;
                    }
                    else if ((code & 0xe0) === 0xe0) {
                        // 3 byte char
                        const b1 = code, b2 = buffer[i + 1], b3 = buffer[i + 2];
                        code = ((b1 & 0xf) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
                        i += 2;
                    }
                    else if ((code & 0xc0) === 0xc0) {
                        // 2 byte char
                        const b1 = code, b2 = buffer[i + 1];
                        code = ((b1 & 0x1f) << 6) | (b2 & 0x3f);
                        i++;
                    }
                    else {
                        throw new Error("invalid utf-8 data");
                    }
                }
                if (code >= 65536) {
                    // Split into 2-part utf-16 char codes
                    code ^= 0x10000;
                    const p1 = 0xd800 | (code >> 10);
                    const p2 = 0xdc00 | (code & 0x3ff);
                    str += String.fromCharCode(p1);
                    str += String.fromCharCode(p2);
                }
                else {
                    str += String.fromCharCode(code);
                }
            }
            return str;
        }
        else {
            throw new Error("Unsupported buffer argument");
        }
    }
}
exports.decodeString = decodeString;
function concatTypedArrays(a, b) {
    const c = new a.constructor(a.length + b.length);
    c.set(a);
    c.set(b, a.length);
    return c;
}
exports.concatTypedArrays = concatTypedArrays;
function cloneObject(original, stack = []) {
    var _a;
    if (((_a = original === null || original === void 0 ? void 0 : original.constructor) === null || _a === void 0 ? void 0 : _a.name) === "DataSnapshot") {
        throw new TypeError(`Object to clone is a DataSnapshot (path "${original.ref.path}")`);
    }
    const checkAndFixTypedArray = (obj) => {
        if (obj !== null &&
            typeof obj === "object" &&
            typeof obj.constructor === "function" &&
            typeof obj.constructor.name === "string" &&
            ["Buffer", "Uint8Array", "Int8Array", "Uint16Array", "Int16Array", "Uint32Array", "Int32Array", "BigUint64Array", "BigInt64Array"].includes(obj.constructor.name)) {
            // FIX for typed array being converted to objects with numeric properties:
            // Convert Buffer or TypedArray to ArrayBuffer
            obj = obj.buffer.slice(obj.byteOffset, obj.byteOffset + obj.byteLength);
        }
        return obj;
    };
    original = checkAndFixTypedArray(original);
    if (typeof original !== "object" || original === null || original instanceof Date || original instanceof ArrayBuffer || original instanceof PathInfo_1.PathReference || original instanceof RegExp) {
        return original;
    }
    const cloneValue = (val) => {
        if (stack.indexOf(val) >= 0) {
            throw new ReferenceError("object contains a circular reference");
        }
        val = checkAndFixTypedArray(val);
        if (val === null || val instanceof Date || val instanceof ArrayBuffer || val instanceof PathInfo_1.PathReference || val instanceof RegExp) {
            // || val instanceof ID
            return val;
        }
        else if (typeof val === "object") {
            stack.push(val);
            val = cloneObject(val, stack);
            stack.pop();
            return val;
        }
        else {
            return val; // Anything other can just be copied
        }
    };
    if (typeof stack === "undefined") {
        stack = [original];
    }
    const clone = original instanceof Array ? [] : original instanceof PartialArray_1.PartialArray ? new PartialArray_1.PartialArray() : {};
    Object.keys(original).forEach((key) => {
        const val = original[key];
        if (typeof val === "function") {
            return; // skip functions
        }
        clone[key] = cloneValue(val);
    });
    return clone;
}
exports.cloneObject = cloneObject;
const isTypedArray = (val) => typeof val === "object" && ["ArrayBuffer", "Buffer", "Uint8Array", "Uint16Array", "Uint32Array", "Int8Array", "Int16Array", "Int32Array"].includes(val.constructor.name);
// CONSIDER: updating isTypedArray to: const isTypedArray = val => typeof val === 'object' && 'buffer' in val && 'byteOffset' in val && 'byteLength' in val;
function valuesAreEqual(val1, val2) {
    if (val1 === val2) {
        return true;
    }
    if (typeof val1 !== typeof val2) {
        return false;
    }
    if (typeof val1 === "object" || typeof val2 === "object") {
        if (val1 === null || val2 === null) {
            return false;
        }
        if (val1 instanceof PathInfo_1.PathReference || val2 instanceof PathInfo_1.PathReference) {
            return val1 instanceof PathInfo_1.PathReference && val2 instanceof PathInfo_1.PathReference && val1.path === val2.path;
        }
        if (val1 instanceof Date || val2 instanceof Date) {
            return val1 instanceof Date && val2 instanceof Date && val1.getTime() === val2.getTime();
        }
        if (val1 instanceof Array || val2 instanceof Array) {
            return val1 instanceof Array && val2 instanceof Array && val1.length === val2.length && val1.every((item, i) => valuesAreEqual(val1[i], val2[i]));
        }
        if (isTypedArray(val1) || isTypedArray(val2)) {
            if (!isTypedArray(val1) || !isTypedArray(val2) || val1.byteLength === val2.byteLength) {
                return false;
            }
            const typed1 = val1 instanceof ArrayBuffer ? new Uint8Array(val1) : new Uint8Array(val1.buffer, val1.byteOffset, val1.byteLength), typed2 = val2 instanceof ArrayBuffer ? new Uint8Array(val2) : new Uint8Array(val2.buffer, val2.byteOffset, val2.byteLength);
            return typed1.every((val, i) => typed2[i] === val);
        }
        const keys1 = Object.keys(val1), keys2 = Object.keys(val2);
        return keys1.length === keys2.length && keys1.every((key) => keys2.includes(key)) && keys1.every((key) => valuesAreEqual(val1[key], val2[key]));
    }
    return false;
}
exports.valuesAreEqual = valuesAreEqual;
class ObjectDifferences {
    constructor(added, removed, changed) {
        this.added = added;
        this.removed = removed;
        this.changed = changed;
    }
    forChild(key) {
        if (this.added.includes(key)) {
            return "added";
        }
        if (this.removed.includes(key)) {
            return "removed";
        }
        const changed = this.changed.find((ch) => ch.key === key);
        return changed ? changed.change : "identical";
    }
}
exports.ObjectDifferences = ObjectDifferences;
const isDate = function (value) {
    return value instanceof Date || (typeof value === "string" && /^\d+$/.test(value) !== true && !isNaN(Date.parse(value)));
};
exports.isDate = isDate;
function compareValues(oldVal, newVal, sortedResults = false) {
    const voids = [undefined, null];
    if (oldVal === newVal) {
        return "identical";
    }
    else if (voids.indexOf(oldVal) >= 0 && voids.indexOf(newVal) < 0) {
        return "added";
    }
    else if (voids.indexOf(oldVal) < 0 && voids.indexOf(newVal) >= 0) {
        return "removed";
    }
    else if (typeof oldVal !== typeof newVal) {
        return "changed";
    }
    else if (isTypedArray(oldVal) || isTypedArray(newVal)) {
        // One or both values are typed arrays.
        if (!isTypedArray(oldVal) || !isTypedArray(newVal)) {
            return "changed";
        }
        // Both are typed. Compare lengths and byte content of typed arrays
        const typed1 = oldVal instanceof Uint8Array
            ? oldVal
            : oldVal instanceof ArrayBuffer
                ? new Uint8Array(oldVal)
                : new Uint8Array(oldVal.buffer, oldVal.byteOffset, oldVal.byteLength);
        const typed2 = newVal instanceof Uint8Array
            ? newVal
            : newVal instanceof ArrayBuffer
                ? new Uint8Array(newVal)
                : new Uint8Array(newVal.buffer, newVal.byteOffset, newVal.byteLength);
        return typed1.byteLength === typed2.byteLength && typed1.every((val, i) => typed2[i] === val) ? "identical" : "changed";
    }
    else if ((0, exports.isDate)(oldVal) || (0, exports.isDate)(newVal)) {
        return (0, exports.isDate)(oldVal) && (0, exports.isDate)(newVal) && new Date(oldVal).getTime() === new Date(newVal).getTime() ? "identical" : "changed";
    }
    else if (oldVal instanceof PathInfo_1.PathReference || newVal instanceof PathInfo_1.PathReference) {
        return oldVal instanceof PathInfo_1.PathReference && newVal instanceof PathInfo_1.PathReference && oldVal.path === newVal.path ? "identical" : "changed";
    }
    else if (typeof oldVal === "object") {
        // Do key-by-key comparison of objects
        const isArray = oldVal instanceof Array;
        const getKeys = (obj) => {
            let keys = Object.keys(obj).filter((key) => !voids.includes(obj[key]));
            if (isArray) {
                keys = keys.map((v) => parseInt(v));
            }
            return keys;
        };
        const oldKeys = getKeys(oldVal);
        const newKeys = getKeys(newVal);
        const removedKeys = oldKeys.filter((key) => !newKeys.includes(key));
        const addedKeys = newKeys.filter((key) => !oldKeys.includes(key));
        const changedKeys = newKeys.reduce((changed, key) => {
            if (oldKeys.includes(key)) {
                const val1 = oldVal[key];
                const val2 = newVal[key];
                const c = compareValues(val1, val2);
                if (c !== "identical") {
                    changed.push({ key, change: c });
                }
            }
            return changed;
        }, []);
        if (addedKeys.length === 0 && removedKeys.length === 0 && changedKeys.length === 0) {
            return "identical";
        }
        else {
            return new ObjectDifferences(addedKeys, removedKeys, sortedResults ? changedKeys.sort((a, b) => (a.key < b.key ? -1 : 1)) : changedKeys);
        }
    }
    return "changed";
}
exports.compareValues = compareValues;
function getMutations(oldVal, newVal, sortedResults = false) {
    const process = (target, compareResult, prev, val) => {
        switch (compareResult) {
            case "identical":
                return [];
            case "changed":
                return [{ target, prev, val }];
            case "added":
                return [{ target, prev: null, val }];
            case "removed":
                return [{ target, prev, val: null }];
            default: {
                let changes = [];
                compareResult.added.forEach((key) => changes.push({ target: target.concat(key), prev: null, val: val[key] }));
                compareResult.removed.forEach((key) => changes.push({ target: target.concat(key), prev: prev[key], val: null }));
                compareResult.changed.forEach((item) => {
                    const childChanges = process(target.concat(item.key), item.change, prev[item.key], val[item.key]);
                    changes = changes.concat(childChanges);
                });
                return changes;
            }
        }
    };
    const compareResult = compareValues(oldVal, newVal, sortedResults);
    return process([], compareResult, oldVal, newVal);
}
exports.getMutations = getMutations;
function getChildValues(childKey, oldValue, newValue) {
    oldValue = !oldValue || !oldValue[childKey] ? null : oldValue[childKey];
    if (typeof oldValue === "undefined") {
        oldValue = null;
    }
    newValue = !newValue || !newValue[childKey] ? null : newValue[childKey];
    if (typeof newValue === "undefined") {
        newValue = null;
    }
    return { oldValue, newValue };
}
exports.getChildValues = getChildValues;
function defer(fn) {
    process_1.default.nextTick(fn);
}
exports.defer = defer;
function getGlobalObject() {
    if (typeof globalThis !== "undefined") {
        return globalThis;
    }
    if (typeof self !== "undefined") {
        return self;
    }
    if (typeof window !== "undefined") {
        return window;
    }
    if (typeof global !== "undefined") {
        return global;
    }
    throw new Error("Unable to locate global object.");
}
exports.getGlobalObject = getGlobalObject;
function contains(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}
exports.contains = contains;
function safeGet(obj, key) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
        return obj[key];
    }
    else {
        return undefined;
    }
}
exports.safeGet = safeGet;
function isEmpty(obj) {
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            return false;
        }
    }
    return true;
}
exports.isEmpty = isEmpty;
/**
 * Deep equal two objects. Support Arrays and Objects.
 */
function deepEqual(a, b) {
    if (a === b) {
        return true;
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    for (const k of aKeys) {
        if (!bKeys.includes(k)) {
            return false;
        }
        const aProp = a[k];
        const bProp = b[k];
        if (isObject(aProp) && isObject(bProp)) {
            if (!deepEqual(aProp, bProp)) {
                return false;
            }
        }
        else if (aProp !== bProp) {
            return false;
        }
    }
    for (const k of bKeys) {
        if (!aKeys.includes(k)) {
            return false;
        }
    }
    return true;
}
exports.deepEqual = deepEqual;
function isObject(thing) {
    return thing !== null && typeof thing === "object";
}
/**
 * Copied from https://stackoverflow.com/a/2117523
 * Generates a new uuid.
 * @public
 */
function uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
exports.uuidv4 = uuidv4;

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"../process":100,"./PartialArray":87,"./PathInfo":88,"buffer":37}],97:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assert = void 0;
var Assert_1 = require("./Assert");
Object.defineProperty(exports, "assert", { enumerable: true, get: function () { return Assert_1.assert; } });

},{"./Assert":82}],98:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],99:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectCollection = exports.PartialArray = exports.SimpleObservable = exports.SchemaDefinition = exports.SimpleEventEmitter = exports.ascii85 = exports.Utils = exports.TypeMappings = exports.Transport = exports.EventSubscription = exports.EventPublisher = exports.EventStream = exports.PathInfo = exports.PathReference = exports.ID = exports.DebugLogger = exports.Lib = exports.MutationsDataSnapshot = exports.DataSnapshot = exports.DataReferencesArray = exports.DataSnapshotsArray = exports.QueryDataRetrievalOptions = exports.DataRetrievalOptions = exports.DataReferenceQuery = exports.DataReference = exports.Types = exports.Api = exports.DataBaseSettings = exports.DataBase = void 0;
var DataBase_1 = require("./DataBase");
Object.defineProperty(exports, "DataBase", { enumerable: true, get: function () { return DataBase_1.DataBase; } });
Object.defineProperty(exports, "DataBaseSettings", { enumerable: true, get: function () { return DataBase_1.DataBaseSettings; } });
var api_1 = require("./DataBase/api");
Object.defineProperty(exports, "Api", { enumerable: true, get: function () { return __importDefault(api_1).default; } });
exports.Types = __importStar(require("./Types"));
var reference_1 = require("./DataBase/reference");
Object.defineProperty(exports, "DataReference", { enumerable: true, get: function () { return reference_1.DataReference; } });
Object.defineProperty(exports, "DataReferenceQuery", { enumerable: true, get: function () { return reference_1.DataReferenceQuery; } });
Object.defineProperty(exports, "DataRetrievalOptions", { enumerable: true, get: function () { return reference_1.DataRetrievalOptions; } });
Object.defineProperty(exports, "QueryDataRetrievalOptions", { enumerable: true, get: function () { return reference_1.QueryDataRetrievalOptions; } });
Object.defineProperty(exports, "DataSnapshotsArray", { enumerable: true, get: function () { return reference_1.DataSnapshotsArray; } });
Object.defineProperty(exports, "DataReferencesArray", { enumerable: true, get: function () { return reference_1.DataReferencesArray; } });
var snapshot_1 = require("./DataBase/snapshot");
Object.defineProperty(exports, "DataSnapshot", { enumerable: true, get: function () { return snapshot_1.DataSnapshot; } });
Object.defineProperty(exports, "MutationsDataSnapshot", { enumerable: true, get: function () { return snapshot_1.MutationsDataSnapshot; } });
exports.Lib = __importStar(require("./Lib"));
var DebugLogger_1 = require("./Lib/DebugLogger");
Object.defineProperty(exports, "DebugLogger", { enumerable: true, get: function () { return __importDefault(DebugLogger_1).default; } });
var ID_1 = require("./Lib/ID");
Object.defineProperty(exports, "ID", { enumerable: true, get: function () { return __importDefault(ID_1).default; } });
var PathInfo_1 = require("./Lib/PathInfo");
Object.defineProperty(exports, "PathReference", { enumerable: true, get: function () { return PathInfo_1.PathReference; } });
Object.defineProperty(exports, "PathInfo", { enumerable: true, get: function () { return PathInfo_1.PathInfo; } });
var Subscription_1 = require("./Lib/Subscription");
Object.defineProperty(exports, "EventStream", { enumerable: true, get: function () { return Subscription_1.EventStream; } });
Object.defineProperty(exports, "EventPublisher", { enumerable: true, get: function () { return Subscription_1.EventPublisher; } });
Object.defineProperty(exports, "EventSubscription", { enumerable: true, get: function () { return Subscription_1.EventSubscription; } });
exports.Transport = __importStar(require("./Lib/Transport"));
var TypeMappings_1 = require("./Lib/TypeMappings");
Object.defineProperty(exports, "TypeMappings", { enumerable: true, get: function () { return __importDefault(TypeMappings_1).default; } });
exports.Utils = __importStar(require("./Lib/Utils"));
__exportStar(require("./Lib/SimpleCache"), exports);
var Ascii85_1 = require("./Lib/Ascii85");
Object.defineProperty(exports, "ascii85", { enumerable: true, get: function () { return Ascii85_1.ascii85; } });
var SimpleEventEmitter_1 = require("./Lib/SimpleEventEmitter");
Object.defineProperty(exports, "SimpleEventEmitter", { enumerable: true, get: function () { return __importDefault(SimpleEventEmitter_1).default; } });
var Schema_1 = require("./Lib/Schema");
Object.defineProperty(exports, "SchemaDefinition", { enumerable: true, get: function () { return Schema_1.SchemaDefinition; } });
var SimpleObservable_1 = require("./Lib/SimpleObservable");
Object.defineProperty(exports, "SimpleObservable", { enumerable: true, get: function () { return __importDefault(SimpleObservable_1).default; } });
var PartialArray_1 = require("./Lib/PartialArray");
Object.defineProperty(exports, "PartialArray", { enumerable: true, get: function () { return PartialArray_1.PartialArray; } });
var ObjectCollection_1 = require("./Lib/ObjectCollection");
Object.defineProperty(exports, "ObjectCollection", { enumerable: true, get: function () { return ObjectCollection_1.ObjectCollection; } });

},{"./DataBase":78,"./DataBase/api":77,"./DataBase/reference":79,"./DataBase/snapshot":80,"./Lib":97,"./Lib/Ascii85":81,"./Lib/DebugLogger":83,"./Lib/ID":84,"./Lib/ObjectCollection":85,"./Lib/PartialArray":87,"./Lib/PathInfo":88,"./Lib/Schema":89,"./Lib/SimpleCache":90,"./Lib/SimpleEventEmitter":91,"./Lib/SimpleObservable":92,"./Lib/Subscription":93,"./Lib/Transport":94,"./Lib/TypeMappings":95,"./Lib/Utils":96,"./Types":98}],100:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    // eslint-disable-next-line @typescript-eslint/ban-types
    nextTick(fn) {
        setTimeout(fn, 0);
    },
};

},{}],101:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var w = d * 7;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isFinite(val)) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'weeks':
    case 'week':
    case 'w':
      return n * w;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  var msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (msAbs >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (msAbs >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (msAbs >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  var msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return plural(ms, msAbs, d, 'day');
  }
  if (msAbs >= h) {
    return plural(ms, msAbs, h, 'hour');
  }
  if (msAbs >= m) {
    return plural(ms, msAbs, m, 'minute');
  }
  if (msAbs >= s) {
    return plural(ms, msAbs, s, 'second');
  }
  return ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, msAbs, n, name) {
  var isPlural = msAbs >= n * 1.5;
  return Math.round(ms / n) + ' ' + name + (isPlural ? 's' : '');
}

},{}],102:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],103:[function(require,module,exports){
"use strict";
/**
 * Initialize backoff timer with `opts`.
 *
 * - `min` initial timeout in milliseconds [100]
 * - `max` max timeout [10000]
 * - `jitter` [0]
 * - `factor` [2]
 *
 * @param {Object} opts
 * @api public
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Backoff = void 0;
function Backoff(opts) {
    opts = opts || {};
    this.ms = opts.min || 100;
    this.max = opts.max || 10000;
    this.factor = opts.factor || 2;
    this.jitter = opts.jitter > 0 && opts.jitter <= 1 ? opts.jitter : 0;
    this.attempts = 0;
}
exports.Backoff = Backoff;
/**
 * Return the backoff duration.
 *
 * @return {Number}
 * @api public
 */
Backoff.prototype.duration = function () {
    var ms = this.ms * Math.pow(this.factor, this.attempts++);
    if (this.jitter) {
        var rand = Math.random();
        var deviation = Math.floor(rand * this.jitter * ms);
        ms = (Math.floor(rand * 10) & 1) == 0 ? ms - deviation : ms + deviation;
    }
    return Math.min(ms, this.max) | 0;
};
/**
 * Reset the number of attempts.
 *
 * @api public
 */
Backoff.prototype.reset = function () {
    this.attempts = 0;
};
/**
 * Set the minimum duration
 *
 * @api public
 */
Backoff.prototype.setMin = function (min) {
    this.ms = min;
};
/**
 * Set the maximum duration
 *
 * @api public
 */
Backoff.prototype.setMax = function (max) {
    this.max = max;
};
/**
 * Set the jitter
 *
 * @api public
 */
Backoff.prototype.setJitter = function (jitter) {
    this.jitter = jitter;
};

},{}],104:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.connect = exports.io = exports.Socket = exports.Manager = exports.protocol = void 0;
const url_js_1 = require("./url.js");
const manager_js_1 = require("./manager.js");
Object.defineProperty(exports, "Manager", { enumerable: true, get: function () { return manager_js_1.Manager; } });
const socket_js_1 = require("./socket.js");
Object.defineProperty(exports, "Socket", { enumerable: true, get: function () { return socket_js_1.Socket; } });
const debug_1 = __importDefault(require("debug")); // debug()
const debug = debug_1.default("socket.io-client"); // debug()
/**
 * Managers cache.
 */
const cache = {};
function lookup(uri, opts) {
    if (typeof uri === "object") {
        opts = uri;
        uri = undefined;
    }
    opts = opts || {};
    const parsed = url_js_1.url(uri, opts.path || "/socket.io");
    const source = parsed.source;
    const id = parsed.id;
    const path = parsed.path;
    const sameNamespace = cache[id] && path in cache[id]["nsps"];
    const newConnection = opts.forceNew ||
        opts["force new connection"] ||
        false === opts.multiplex ||
        sameNamespace;
    let io;
    if (newConnection) {
        debug("ignoring socket cache for %s", source);
        io = new manager_js_1.Manager(source, opts);
    }
    else {
        if (!cache[id]) {
            debug("new io instance for %s", source);
            cache[id] = new manager_js_1.Manager(source, opts);
        }
        io = cache[id];
    }
    if (parsed.query && !opts.query) {
        opts.query = parsed.queryKey;
    }
    return io.socket(parsed.path, opts);
}
exports.io = lookup;
exports.connect = lookup;
exports.default = lookup;
// so that "lookup" can be used both as a function (e.g. `io(...)`) and as a
// namespace (e.g. `io.connect(...)`), for backward compatibility
Object.assign(lookup, {
    Manager: manager_js_1.Manager,
    Socket: socket_js_1.Socket,
    io: lookup,
    connect: lookup,
});
/**
 * Protocol version.
 *
 * @public
 */
var socket_io_parser_1 = require("socket.io-parser");
Object.defineProperty(exports, "protocol", { enumerable: true, get: function () { return socket_io_parser_1.protocol; } });

module.exports = lookup;

},{"./manager.js":105,"./socket.js":107,"./url.js":108,"debug":42,"socket.io-parser":110}],105:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Manager = void 0;
const engine_io_client_1 = require("engine.io-client");
const socket_js_1 = require("./socket.js");
const parser = __importStar(require("socket.io-parser"));
const on_js_1 = require("./on.js");
const backo2_js_1 = require("./contrib/backo2.js");
const component_emitter_1 = require("@socket.io/component-emitter");
const debug_1 = __importDefault(require("debug")); // debug()
const debug = debug_1.default("socket.io-client:manager"); // debug()
class Manager extends component_emitter_1.Emitter {
    constructor(uri, opts) {
        var _a;
        super();
        this.nsps = {};
        this.subs = [];
        if (uri && "object" === typeof uri) {
            opts = uri;
            uri = undefined;
        }
        opts = opts || {};
        opts.path = opts.path || "/socket.io";
        this.opts = opts;
        engine_io_client_1.installTimerFunctions(this, opts);
        this.reconnection(opts.reconnection !== false);
        this.reconnectionAttempts(opts.reconnectionAttempts || Infinity);
        this.reconnectionDelay(opts.reconnectionDelay || 1000);
        this.reconnectionDelayMax(opts.reconnectionDelayMax || 5000);
        this.randomizationFactor((_a = opts.randomizationFactor) !== null && _a !== void 0 ? _a : 0.5);
        this.backoff = new backo2_js_1.Backoff({
            min: this.reconnectionDelay(),
            max: this.reconnectionDelayMax(),
            jitter: this.randomizationFactor(),
        });
        this.timeout(null == opts.timeout ? 20000 : opts.timeout);
        this._readyState = "closed";
        this.uri = uri;
        const _parser = opts.parser || parser;
        this.encoder = new _parser.Encoder();
        this.decoder = new _parser.Decoder();
        this._autoConnect = opts.autoConnect !== false;
        if (this._autoConnect)
            this.open();
    }
    reconnection(v) {
        if (!arguments.length)
            return this._reconnection;
        this._reconnection = !!v;
        return this;
    }
    reconnectionAttempts(v) {
        if (v === undefined)
            return this._reconnectionAttempts;
        this._reconnectionAttempts = v;
        return this;
    }
    reconnectionDelay(v) {
        var _a;
        if (v === undefined)
            return this._reconnectionDelay;
        this._reconnectionDelay = v;
        (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMin(v);
        return this;
    }
    randomizationFactor(v) {
        var _a;
        if (v === undefined)
            return this._randomizationFactor;
        this._randomizationFactor = v;
        (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setJitter(v);
        return this;
    }
    reconnectionDelayMax(v) {
        var _a;
        if (v === undefined)
            return this._reconnectionDelayMax;
        this._reconnectionDelayMax = v;
        (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMax(v);
        return this;
    }
    timeout(v) {
        if (!arguments.length)
            return this._timeout;
        this._timeout = v;
        return this;
    }
    /**
     * Starts trying to reconnect if reconnection is enabled and we have not
     * started reconnecting yet
     *
     * @private
     */
    maybeReconnectOnOpen() {
        // Only try to reconnect if it's the first time we're connecting
        if (!this._reconnecting &&
            this._reconnection &&
            this.backoff.attempts === 0) {
            // keeps reconnection from firing twice for the same reconnection loop
            this.reconnect();
        }
    }
    /**
     * Sets the current transport `socket`.
     *
     * @param {Function} fn - optional, callback
     * @return self
     * @public
     */
    open(fn) {
        debug("readyState %s", this._readyState);
        if (~this._readyState.indexOf("open"))
            return this;
        debug("opening %s", this.uri);
        this.engine = new engine_io_client_1.Socket(this.uri, this.opts);
        const socket = this.engine;
        const self = this;
        this._readyState = "opening";
        this.skipReconnect = false;
        // emit `open`
        const openSubDestroy = on_js_1.on(socket, "open", function () {
            self.onopen();
            fn && fn();
        });
        const onError = (err) => {
            debug("error");
            this.cleanup();
            this._readyState = "closed";
            this.emitReserved("error", err);
            if (fn) {
                fn(err);
            }
            else {
                // Only do this if there is no fn to handle the error
                this.maybeReconnectOnOpen();
            }
        };
        // emit `error`
        const errorSub = on_js_1.on(socket, "error", onError);
        if (false !== this._timeout) {
            const timeout = this._timeout;
            debug("connect attempt will timeout after %d", timeout);
            // set timer
            const timer = this.setTimeoutFn(() => {
                debug("connect attempt timed out after %d", timeout);
                openSubDestroy();
                onError(new Error("timeout"));
                socket.close();
            }, timeout);
            if (this.opts.autoUnref) {
                timer.unref();
            }
            this.subs.push(() => {
                this.clearTimeoutFn(timer);
            });
        }
        this.subs.push(openSubDestroy);
        this.subs.push(errorSub);
        return this;
    }
    /**
     * Alias for open()
     *
     * @return self
     * @public
     */
    connect(fn) {
        return this.open(fn);
    }
    /**
     * Called upon transport open.
     *
     * @private
     */
    onopen() {
        debug("open");
        // clear old subs
        this.cleanup();
        // mark as open
        this._readyState = "open";
        this.emitReserved("open");
        // add new subs
        const socket = this.engine;
        this.subs.push(on_js_1.on(socket, "ping", this.onping.bind(this)), on_js_1.on(socket, "data", this.ondata.bind(this)), on_js_1.on(socket, "error", this.onerror.bind(this)), on_js_1.on(socket, "close", this.onclose.bind(this)), on_js_1.on(this.decoder, "decoded", this.ondecoded.bind(this)));
    }
    /**
     * Called upon a ping.
     *
     * @private
     */
    onping() {
        this.emitReserved("ping");
    }
    /**
     * Called with data.
     *
     * @private
     */
    ondata(data) {
        try {
            this.decoder.add(data);
        }
        catch (e) {
            this.onclose("parse error", e);
        }
    }
    /**
     * Called when parser fully decodes a packet.
     *
     * @private
     */
    ondecoded(packet) {
        // the nextTick call prevents an exception in a user-provided event listener from triggering a disconnection due to a "parse error"
        engine_io_client_1.nextTick(() => {
            this.emitReserved("packet", packet);
        }, this.setTimeoutFn);
    }
    /**
     * Called upon socket error.
     *
     * @private
     */
    onerror(err) {
        debug("error", err);
        this.emitReserved("error", err);
    }
    /**
     * Creates a new socket for the given `nsp`.
     *
     * @return {Socket}
     * @public
     */
    socket(nsp, opts) {
        let socket = this.nsps[nsp];
        if (!socket) {
            socket = new socket_js_1.Socket(this, nsp, opts);
            this.nsps[nsp] = socket;
        }
        else if (this._autoConnect && !socket.active) {
            socket.connect();
        }
        return socket;
    }
    /**
     * Called upon a socket close.
     *
     * @param socket
     * @private
     */
    _destroy(socket) {
        const nsps = Object.keys(this.nsps);
        for (const nsp of nsps) {
            const socket = this.nsps[nsp];
            if (socket.active) {
                debug("socket %s is still active, skipping close", nsp);
                return;
            }
        }
        this._close();
    }
    /**
     * Writes a packet.
     *
     * @param packet
     * @private
     */
    _packet(packet) {
        debug("writing packet %j", packet);
        const encodedPackets = this.encoder.encode(packet);
        for (let i = 0; i < encodedPackets.length; i++) {
            this.engine.write(encodedPackets[i], packet.options);
        }
    }
    /**
     * Clean up transport subscriptions and packet buffer.
     *
     * @private
     */
    cleanup() {
        debug("cleanup");
        this.subs.forEach((subDestroy) => subDestroy());
        this.subs.length = 0;
        this.decoder.destroy();
    }
    /**
     * Close the current socket.
     *
     * @private
     */
    _close() {
        debug("disconnect");
        this.skipReconnect = true;
        this._reconnecting = false;
        this.onclose("forced close");
        if (this.engine)
            this.engine.close();
    }
    /**
     * Alias for close()
     *
     * @private
     */
    disconnect() {
        return this._close();
    }
    /**
     * Called upon engine close.
     *
     * @private
     */
    onclose(reason, description) {
        debug("closed due to %s", reason);
        this.cleanup();
        this.backoff.reset();
        this._readyState = "closed";
        this.emitReserved("close", reason, description);
        if (this._reconnection && !this.skipReconnect) {
            this.reconnect();
        }
    }
    /**
     * Attempt a reconnection.
     *
     * @private
     */
    reconnect() {
        if (this._reconnecting || this.skipReconnect)
            return this;
        const self = this;
        if (this.backoff.attempts >= this._reconnectionAttempts) {
            debug("reconnect failed");
            this.backoff.reset();
            this.emitReserved("reconnect_failed");
            this._reconnecting = false;
        }
        else {
            const delay = this.backoff.duration();
            debug("will wait %dms before reconnect attempt", delay);
            this._reconnecting = true;
            const timer = this.setTimeoutFn(() => {
                if (self.skipReconnect)
                    return;
                debug("attempting reconnect");
                this.emitReserved("reconnect_attempt", self.backoff.attempts);
                // check again for the case socket closed in above events
                if (self.skipReconnect)
                    return;
                self.open((err) => {
                    if (err) {
                        debug("reconnect attempt error");
                        self._reconnecting = false;
                        self.reconnect();
                        this.emitReserved("reconnect_error", err);
                    }
                    else {
                        debug("reconnect success");
                        self.onreconnect();
                    }
                });
            }, delay);
            if (this.opts.autoUnref) {
                timer.unref();
            }
            this.subs.push(() => {
                this.clearTimeoutFn(timer);
            });
        }
    }
    /**
     * Called upon successful reconnect.
     *
     * @private
     */
    onreconnect() {
        const attempt = this.backoff.attempts;
        this._reconnecting = false;
        this.backoff.reset();
        this.emitReserved("reconnect", attempt);
    }
}
exports.Manager = Manager;

},{"./contrib/backo2.js":103,"./on.js":106,"./socket.js":107,"@socket.io/component-emitter":36,"debug":42,"engine.io-client":49,"socket.io-parser":110}],106:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.on = void 0;
function on(obj, ev, fn) {
    obj.on(ev, fn);
    return function subDestroy() {
        obj.off(ev, fn);
    };
}
exports.on = on;

},{}],107:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Socket = void 0;
const socket_io_parser_1 = require("socket.io-parser");
const on_js_1 = require("./on.js");
const component_emitter_1 = require("@socket.io/component-emitter");
const debug_1 = __importDefault(require("debug")); // debug()
const debug = debug_1.default("socket.io-client:socket"); // debug()
/**
 * Internal events.
 * These events can't be emitted by the user.
 */
const RESERVED_EVENTS = Object.freeze({
    connect: 1,
    connect_error: 1,
    disconnect: 1,
    disconnecting: 1,
    // EventEmitter reserved events: https://nodejs.org/api/events.html#events_event_newlistener
    newListener: 1,
    removeListener: 1,
});
/**
 * A Socket is the fundamental class for interacting with the server.
 *
 * A Socket belongs to a certain Namespace (by default /) and uses an underlying {@link Manager} to communicate.
 *
 * @example
 * const socket = io();
 *
 * socket.on("connect", () => {
 *   console.log("connected");
 * });
 *
 * // send an event to the server
 * socket.emit("foo", "bar");
 *
 * socket.on("foobar", () => {
 *   // an event was received from the server
 * });
 *
 * // upon disconnection
 * socket.on("disconnect", (reason) => {
 *   console.log(`disconnected due to ${reason}`);
 * });
 */
class Socket extends component_emitter_1.Emitter {
    /**
     * `Socket` constructor.
     */
    constructor(io, nsp, opts) {
        super();
        /**
         * Whether the socket is currently connected to the server.
         *
         * @example
         * const socket = io();
         *
         * socket.on("connect", () => {
         *   console.log(socket.connected); // true
         * });
         *
         * socket.on("disconnect", () => {
         *   console.log(socket.connected); // false
         * });
         */
        this.connected = false;
        /**
         * Whether the connection state was recovered after a temporary disconnection. In that case, any missed packets will
         * be transmitted by the server.
         */
        this.recovered = false;
        /**
         * Buffer for packets received before the CONNECT packet
         */
        this.receiveBuffer = [];
        /**
         * Buffer for packets that will be sent once the socket is connected
         */
        this.sendBuffer = [];
        /**
         * The queue of packets to be sent with retry in case of failure.
         *
         * Packets are sent one by one, each waiting for the server acknowledgement, in order to guarantee the delivery order.
         * @private
         */
        this._queue = [];
        /**
         * A sequence to generate the ID of the {@link QueuedPacket}.
         * @private
         */
        this._queueSeq = 0;
        this.ids = 0;
        /**
         * A map containing acknowledgement handlers.
         *
         * The `withError` attribute is used to differentiate handlers that accept an error as first argument:
         *
         * - `socket.emit("test", (err, value) => { ... })` with `ackTimeout` option
         * - `socket.timeout(5000).emit("test", (err, value) => { ... })`
         * - `const value = await socket.emitWithAck("test")`
         *
         * From those that don't:
         *
         * - `socket.emit("test", (value) => { ... });`
         *
         * In the first case, the handlers will be called with an error when:
         *
         * - the timeout is reached
         * - the socket gets disconnected
         *
         * In the second case, the handlers will be simply discarded upon disconnection, since the client will never receive
         * an acknowledgement from the server.
         *
         * @private
         */
        this.acks = {};
        this.flags = {};
        this.io = io;
        this.nsp = nsp;
        if (opts && opts.auth) {
            this.auth = opts.auth;
        }
        this._opts = Object.assign({}, opts);
        if (this.io._autoConnect)
            this.open();
    }
    /**
     * Whether the socket is currently disconnected
     *
     * @example
     * const socket = io();
     *
     * socket.on("connect", () => {
     *   console.log(socket.disconnected); // false
     * });
     *
     * socket.on("disconnect", () => {
     *   console.log(socket.disconnected); // true
     * });
     */
    get disconnected() {
        return !this.connected;
    }
    /**
     * Subscribe to open, close and packet events
     *
     * @private
     */
    subEvents() {
        if (this.subs)
            return;
        const io = this.io;
        this.subs = [
            on_js_1.on(io, "open", this.onopen.bind(this)),
            on_js_1.on(io, "packet", this.onpacket.bind(this)),
            on_js_1.on(io, "error", this.onerror.bind(this)),
            on_js_1.on(io, "close", this.onclose.bind(this)),
        ];
    }
    /**
     * Whether the Socket will try to reconnect when its Manager connects or reconnects.
     *
     * @example
     * const socket = io();
     *
     * console.log(socket.active); // true
     *
     * socket.on("disconnect", (reason) => {
     *   if (reason === "io server disconnect") {
     *     // the disconnection was initiated by the server, you need to manually reconnect
     *     console.log(socket.active); // false
     *   }
     *   // else the socket will automatically try to reconnect
     *   console.log(socket.active); // true
     * });
     */
    get active() {
        return !!this.subs;
    }
    /**
     * "Opens" the socket.
     *
     * @example
     * const socket = io({
     *   autoConnect: false
     * });
     *
     * socket.connect();
     */
    connect() {
        if (this.connected)
            return this;
        this.subEvents();
        if (!this.io["_reconnecting"])
            this.io.open(); // ensure open
        if ("open" === this.io._readyState)
            this.onopen();
        return this;
    }
    /**
     * Alias for {@link connect()}.
     */
    open() {
        return this.connect();
    }
    /**
     * Sends a `message` event.
     *
     * This method mimics the WebSocket.send() method.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
     *
     * @example
     * socket.send("hello");
     *
     * // this is equivalent to
     * socket.emit("message", "hello");
     *
     * @return self
     */
    send(...args) {
        args.unshift("message");
        this.emit.apply(this, args);
        return this;
    }
    /**
     * Override `emit`.
     * If the event is in `events`, it's emitted normally.
     *
     * @example
     * socket.emit("hello", "world");
     *
     * // all serializable datastructures are supported (no need to call JSON.stringify)
     * socket.emit("hello", 1, "2", { 3: ["4"], 5: Uint8Array.from([6]) });
     *
     * // with an acknowledgement from the server
     * socket.emit("hello", "world", (val) => {
     *   // ...
     * });
     *
     * @return self
     */
    emit(ev, ...args) {
        if (RESERVED_EVENTS.hasOwnProperty(ev)) {
            throw new Error('"' + ev.toString() + '" is a reserved event name');
        }
        args.unshift(ev);
        if (this._opts.retries && !this.flags.fromQueue && !this.flags.volatile) {
            this._addToQueue(args);
            return this;
        }
        const packet = {
            type: socket_io_parser_1.PacketType.EVENT,
            data: args,
        };
        packet.options = {};
        packet.options.compress = this.flags.compress !== false;
        // event ack callback
        if ("function" === typeof args[args.length - 1]) {
            const id = this.ids++;
            debug("emitting packet with ack id %d", id);
            const ack = args.pop();
            this._registerAckCallback(id, ack);
            packet.id = id;
        }
        const isTransportWritable = this.io.engine &&
            this.io.engine.transport &&
            this.io.engine.transport.writable;
        const discardPacket = this.flags.volatile && (!isTransportWritable || !this.connected);
        if (discardPacket) {
            debug("discard packet as the transport is not currently writable");
        }
        else if (this.connected) {
            this.notifyOutgoingListeners(packet);
            this.packet(packet);
        }
        else {
            this.sendBuffer.push(packet);
        }
        this.flags = {};
        return this;
    }
    /**
     * @private
     */
    _registerAckCallback(id, ack) {
        var _a;
        const timeout = (_a = this.flags.timeout) !== null && _a !== void 0 ? _a : this._opts.ackTimeout;
        if (timeout === undefined) {
            this.acks[id] = ack;
            return;
        }
        // @ts-ignore
        const timer = this.io.setTimeoutFn(() => {
            delete this.acks[id];
            for (let i = 0; i < this.sendBuffer.length; i++) {
                if (this.sendBuffer[i].id === id) {
                    debug("removing packet with ack id %d from the buffer", id);
                    this.sendBuffer.splice(i, 1);
                }
            }
            debug("event with ack id %d has timed out after %d ms", id, timeout);
            ack.call(this, new Error("operation has timed out"));
        }, timeout);
        const fn = (...args) => {
            // @ts-ignore
            this.io.clearTimeoutFn(timer);
            ack.apply(this, args);
        };
        fn.withError = true;
        this.acks[id] = fn;
    }
    /**
     * Emits an event and waits for an acknowledgement
     *
     * @example
     * // without timeout
     * const response = await socket.emitWithAck("hello", "world");
     *
     * // with a specific timeout
     * try {
     *   const response = await socket.timeout(1000).emitWithAck("hello", "world");
     * } catch (err) {
     *   // the server did not acknowledge the event in the given delay
     * }
     *
     * @return a Promise that will be fulfilled when the server acknowledges the event
     */
    emitWithAck(ev, ...args) {
        return new Promise((resolve, reject) => {
            const fn = (arg1, arg2) => {
                return arg1 ? reject(arg1) : resolve(arg2);
            };
            fn.withError = true;
            args.push(fn);
            this.emit(ev, ...args);
        });
    }
    /**
     * Add the packet to the queue.
     * @param args
     * @private
     */
    _addToQueue(args) {
        let ack;
        if (typeof args[args.length - 1] === "function") {
            ack = args.pop();
        }
        const packet = {
            id: this._queueSeq++,
            tryCount: 0,
            pending: false,
            args,
            flags: Object.assign({ fromQueue: true }, this.flags),
        };
        args.push((err, ...responseArgs) => {
            if (packet !== this._queue[0]) {
                // the packet has already been acknowledged
                return;
            }
            const hasError = err !== null;
            if (hasError) {
                if (packet.tryCount > this._opts.retries) {
                    debug("packet [%d] is discarded after %d tries", packet.id, packet.tryCount);
                    this._queue.shift();
                    if (ack) {
                        ack(err);
                    }
                }
            }
            else {
                debug("packet [%d] was successfully sent", packet.id);
                this._queue.shift();
                if (ack) {
                    ack(null, ...responseArgs);
                }
            }
            packet.pending = false;
            return this._drainQueue();
        });
        this._queue.push(packet);
        this._drainQueue();
    }
    /**
     * Send the first packet of the queue, and wait for an acknowledgement from the server.
     * @param force - whether to resend a packet that has not been acknowledged yet
     *
     * @private
     */
    _drainQueue(force = false) {
        debug("draining queue");
        if (!this.connected || this._queue.length === 0) {
            return;
        }
        const packet = this._queue[0];
        if (packet.pending && !force) {
            debug("packet [%d] has already been sent and is waiting for an ack", packet.id);
            return;
        }
        packet.pending = true;
        packet.tryCount++;
        debug("sending packet [%d] (try n°%d)", packet.id, packet.tryCount);
        this.flags = packet.flags;
        this.emit.apply(this, packet.args);
    }
    /**
     * Sends a packet.
     *
     * @param packet
     * @private
     */
    packet(packet) {
        packet.nsp = this.nsp;
        this.io._packet(packet);
    }
    /**
     * Called upon engine `open`.
     *
     * @private
     */
    onopen() {
        debug("transport is open - connecting");
        if (typeof this.auth == "function") {
            this.auth((data) => {
                this._sendConnectPacket(data);
            });
        }
        else {
            this._sendConnectPacket(this.auth);
        }
    }
    /**
     * Sends a CONNECT packet to initiate the Socket.IO session.
     *
     * @param data
     * @private
     */
    _sendConnectPacket(data) {
        this.packet({
            type: socket_io_parser_1.PacketType.CONNECT,
            data: this._pid
                ? Object.assign({ pid: this._pid, offset: this._lastOffset }, data)
                : data,
        });
    }
    /**
     * Called upon engine or manager `error`.
     *
     * @param err
     * @private
     */
    onerror(err) {
        if (!this.connected) {
            this.emitReserved("connect_error", err);
        }
    }
    /**
     * Called upon engine `close`.
     *
     * @param reason
     * @param description
     * @private
     */
    onclose(reason, description) {
        debug("close (%s)", reason);
        this.connected = false;
        delete this.id;
        this.emitReserved("disconnect", reason, description);
        this._clearAcks();
    }
    /**
     * Clears the acknowledgement handlers upon disconnection, since the client will never receive an acknowledgement from
     * the server.
     *
     * @private
     */
    _clearAcks() {
        Object.keys(this.acks).forEach((id) => {
            const isBuffered = this.sendBuffer.some((packet) => String(packet.id) === id);
            if (!isBuffered) {
                // note: handlers that do not accept an error as first argument are ignored here
                const ack = this.acks[id];
                delete this.acks[id];
                if (ack.withError) {
                    ack.call(this, new Error("socket has been disconnected"));
                }
            }
        });
    }
    /**
     * Called with socket packet.
     *
     * @param packet
     * @private
     */
    onpacket(packet) {
        const sameNamespace = packet.nsp === this.nsp;
        if (!sameNamespace)
            return;
        switch (packet.type) {
            case socket_io_parser_1.PacketType.CONNECT:
                if (packet.data && packet.data.sid) {
                    this.onconnect(packet.data.sid, packet.data.pid);
                }
                else {
                    this.emitReserved("connect_error", new Error("It seems you are trying to reach a Socket.IO server in v2.x with a v3.x client, but they are not compatible (more information here: https://socket.io/docs/v3/migrating-from-2-x-to-3-0/)"));
                }
                break;
            case socket_io_parser_1.PacketType.EVENT:
            case socket_io_parser_1.PacketType.BINARY_EVENT:
                this.onevent(packet);
                break;
            case socket_io_parser_1.PacketType.ACK:
            case socket_io_parser_1.PacketType.BINARY_ACK:
                this.onack(packet);
                break;
            case socket_io_parser_1.PacketType.DISCONNECT:
                this.ondisconnect();
                break;
            case socket_io_parser_1.PacketType.CONNECT_ERROR:
                this.destroy();
                const err = new Error(packet.data.message);
                // @ts-ignore
                err.data = packet.data.data;
                this.emitReserved("connect_error", err);
                break;
        }
    }
    /**
     * Called upon a server event.
     *
     * @param packet
     * @private
     */
    onevent(packet) {
        const args = packet.data || [];
        debug("emitting event %j", args);
        if (null != packet.id) {
            debug("attaching ack callback to event");
            args.push(this.ack(packet.id));
        }
        if (this.connected) {
            this.emitEvent(args);
        }
        else {
            this.receiveBuffer.push(Object.freeze(args));
        }
    }
    emitEvent(args) {
        if (this._anyListeners && this._anyListeners.length) {
            const listeners = this._anyListeners.slice();
            for (const listener of listeners) {
                listener.apply(this, args);
            }
        }
        super.emit.apply(this, args);
        if (this._pid && args.length && typeof args[args.length - 1] === "string") {
            this._lastOffset = args[args.length - 1];
        }
    }
    /**
     * Produces an ack callback to emit with an event.
     *
     * @private
     */
    ack(id) {
        const self = this;
        let sent = false;
        return function (...args) {
            // prevent double callbacks
            if (sent)
                return;
            sent = true;
            debug("sending ack %j", args);
            self.packet({
                type: socket_io_parser_1.PacketType.ACK,
                id: id,
                data: args,
            });
        };
    }
    /**
     * Called upon a server acknowledgement.
     *
     * @param packet
     * @private
     */
    onack(packet) {
        const ack = this.acks[packet.id];
        if (typeof ack !== "function") {
            debug("bad ack %s", packet.id);
            return;
        }
        delete this.acks[packet.id];
        debug("calling ack %s with %j", packet.id, packet.data);
        // @ts-ignore FIXME ack is incorrectly inferred as 'never'
        if (ack.withError) {
            packet.data.unshift(null);
        }
        // @ts-ignore
        ack.apply(this, packet.data);
    }
    /**
     * Called upon server connect.
     *
     * @private
     */
    onconnect(id, pid) {
        debug("socket connected with id %s", id);
        this.id = id;
        this.recovered = pid && this._pid === pid;
        this._pid = pid; // defined only if connection state recovery is enabled
        this.connected = true;
        this.emitBuffered();
        this.emitReserved("connect");
        this._drainQueue(true);
    }
    /**
     * Emit buffered events (received and emitted).
     *
     * @private
     */
    emitBuffered() {
        this.receiveBuffer.forEach((args) => this.emitEvent(args));
        this.receiveBuffer = [];
        this.sendBuffer.forEach((packet) => {
            this.notifyOutgoingListeners(packet);
            this.packet(packet);
        });
        this.sendBuffer = [];
    }
    /**
     * Called upon server disconnect.
     *
     * @private
     */
    ondisconnect() {
        debug("server disconnect (%s)", this.nsp);
        this.destroy();
        this.onclose("io server disconnect");
    }
    /**
     * Called upon forced client/server side disconnections,
     * this method ensures the manager stops tracking us and
     * that reconnections don't get triggered for this.
     *
     * @private
     */
    destroy() {
        if (this.subs) {
            // clean subscriptions to avoid reconnections
            this.subs.forEach((subDestroy) => subDestroy());
            this.subs = undefined;
        }
        this.io["_destroy"](this);
    }
    /**
     * Disconnects the socket manually. In that case, the socket will not try to reconnect.
     *
     * If this is the last active Socket instance of the {@link Manager}, the low-level connection will be closed.
     *
     * @example
     * const socket = io();
     *
     * socket.on("disconnect", (reason) => {
     *   // console.log(reason); prints "io client disconnect"
     * });
     *
     * socket.disconnect();
     *
     * @return self
     */
    disconnect() {
        if (this.connected) {
            debug("performing disconnect (%s)", this.nsp);
            this.packet({ type: socket_io_parser_1.PacketType.DISCONNECT });
        }
        // remove socket from pool
        this.destroy();
        if (this.connected) {
            // fire events
            this.onclose("io client disconnect");
        }
        return this;
    }
    /**
     * Alias for {@link disconnect()}.
     *
     * @return self
     */
    close() {
        return this.disconnect();
    }
    /**
     * Sets the compress flag.
     *
     * @example
     * socket.compress(false).emit("hello");
     *
     * @param compress - if `true`, compresses the sending data
     * @return self
     */
    compress(compress) {
        this.flags.compress = compress;
        return this;
    }
    /**
     * Sets a modifier for a subsequent event emission that the event message will be dropped when this socket is not
     * ready to send messages.
     *
     * @example
     * socket.volatile.emit("hello"); // the server may or may not receive it
     *
     * @returns self
     */
    get volatile() {
        this.flags.volatile = true;
        return this;
    }
    /**
     * Sets a modifier for a subsequent event emission that the callback will be called with an error when the
     * given number of milliseconds have elapsed without an acknowledgement from the server:
     *
     * @example
     * socket.timeout(5000).emit("my-event", (err) => {
     *   if (err) {
     *     // the server did not acknowledge the event in the given delay
     *   }
     * });
     *
     * @returns self
     */
    timeout(timeout) {
        this.flags.timeout = timeout;
        return this;
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback.
     *
     * @example
     * socket.onAny((event, ...args) => {
     *   console.log(`got ${event}`);
     * });
     *
     * @param listener
     */
    onAny(listener) {
        this._anyListeners = this._anyListeners || [];
        this._anyListeners.push(listener);
        return this;
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback. The listener is added to the beginning of the listeners array.
     *
     * @example
     * socket.prependAny((event, ...args) => {
     *   console.log(`got event ${event}`);
     * });
     *
     * @param listener
     */
    prependAny(listener) {
        this._anyListeners = this._anyListeners || [];
        this._anyListeners.unshift(listener);
        return this;
    }
    /**
     * Removes the listener that will be fired when any event is emitted.
     *
     * @example
     * const catchAllListener = (event, ...args) => {
     *   console.log(`got event ${event}`);
     * }
     *
     * socket.onAny(catchAllListener);
     *
     * // remove a specific listener
     * socket.offAny(catchAllListener);
     *
     * // or remove all listeners
     * socket.offAny();
     *
     * @param listener
     */
    offAny(listener) {
        if (!this._anyListeners) {
            return this;
        }
        if (listener) {
            const listeners = this._anyListeners;
            for (let i = 0; i < listeners.length; i++) {
                if (listener === listeners[i]) {
                    listeners.splice(i, 1);
                    return this;
                }
            }
        }
        else {
            this._anyListeners = [];
        }
        return this;
    }
    /**
     * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
     * e.g. to remove listeners.
     */
    listenersAny() {
        return this._anyListeners || [];
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback.
     *
     * Note: acknowledgements sent to the server are not included.
     *
     * @example
     * socket.onAnyOutgoing((event, ...args) => {
     *   console.log(`sent event ${event}`);
     * });
     *
     * @param listener
     */
    onAnyOutgoing(listener) {
        this._anyOutgoingListeners = this._anyOutgoingListeners || [];
        this._anyOutgoingListeners.push(listener);
        return this;
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback. The listener is added to the beginning of the listeners array.
     *
     * Note: acknowledgements sent to the server are not included.
     *
     * @example
     * socket.prependAnyOutgoing((event, ...args) => {
     *   console.log(`sent event ${event}`);
     * });
     *
     * @param listener
     */
    prependAnyOutgoing(listener) {
        this._anyOutgoingListeners = this._anyOutgoingListeners || [];
        this._anyOutgoingListeners.unshift(listener);
        return this;
    }
    /**
     * Removes the listener that will be fired when any event is emitted.
     *
     * @example
     * const catchAllListener = (event, ...args) => {
     *   console.log(`sent event ${event}`);
     * }
     *
     * socket.onAnyOutgoing(catchAllListener);
     *
     * // remove a specific listener
     * socket.offAnyOutgoing(catchAllListener);
     *
     * // or remove all listeners
     * socket.offAnyOutgoing();
     *
     * @param [listener] - the catch-all listener (optional)
     */
    offAnyOutgoing(listener) {
        if (!this._anyOutgoingListeners) {
            return this;
        }
        if (listener) {
            const listeners = this._anyOutgoingListeners;
            for (let i = 0; i < listeners.length; i++) {
                if (listener === listeners[i]) {
                    listeners.splice(i, 1);
                    return this;
                }
            }
        }
        else {
            this._anyOutgoingListeners = [];
        }
        return this;
    }
    /**
     * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
     * e.g. to remove listeners.
     */
    listenersAnyOutgoing() {
        return this._anyOutgoingListeners || [];
    }
    /**
     * Notify the listeners for each packet sent
     *
     * @param packet
     *
     * @private
     */
    notifyOutgoingListeners(packet) {
        if (this._anyOutgoingListeners && this._anyOutgoingListeners.length) {
            const listeners = this._anyOutgoingListeners.slice();
            for (const listener of listeners) {
                listener.apply(this, packet.data);
            }
        }
    }
}
exports.Socket = Socket;

},{"./on.js":106,"@socket.io/component-emitter":36,"debug":42,"socket.io-parser":110}],108:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.url = void 0;
const engine_io_client_1 = require("engine.io-client");
const debug_1 = __importDefault(require("debug")); // debug()
const debug = debug_1.default("socket.io-client:url"); // debug()
/**
 * URL parser.
 *
 * @param uri - url
 * @param path - the request path of the connection
 * @param loc - An object meant to mimic window.location.
 *        Defaults to window.location.
 * @public
 */
function url(uri, path = "", loc) {
    let obj = uri;
    // default to window.location
    loc = loc || (typeof location !== "undefined" && location);
    if (null == uri)
        uri = loc.protocol + "//" + loc.host;
    // relative path support
    if (typeof uri === "string") {
        if ("/" === uri.charAt(0)) {
            if ("/" === uri.charAt(1)) {
                uri = loc.protocol + uri;
            }
            else {
                uri = loc.host + uri;
            }
        }
        if (!/^(https?|wss?):\/\//.test(uri)) {
            debug("protocol-less url %s", uri);
            if ("undefined" !== typeof loc) {
                uri = loc.protocol + "//" + uri;
            }
            else {
                uri = "https://" + uri;
            }
        }
        // parse
        debug("parse %s", uri);
        obj = engine_io_client_1.parse(uri);
    }
    // make sure we treat `localhost:80` and `localhost` equally
    if (!obj.port) {
        if (/^(http|ws)$/.test(obj.protocol)) {
            obj.port = "80";
        }
        else if (/^(http|ws)s$/.test(obj.protocol)) {
            obj.port = "443";
        }
    }
    obj.path = obj.path || "/";
    const ipv6 = obj.host.indexOf(":") !== -1;
    const host = ipv6 ? "[" + obj.host + "]" : obj.host;
    // define unique id
    obj.id = obj.protocol + "://" + host + ":" + obj.port + path;
    // define href
    obj.href =
        obj.protocol +
            "://" +
            host +
            (loc && loc.port === obj.port ? "" : ":" + obj.port);
    return obj;
}
exports.url = url;

},{"debug":42,"engine.io-client":49}],109:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconstructPacket = exports.deconstructPacket = void 0;
const is_binary_js_1 = require("./is-binary.js");
/**
 * Replaces every Buffer | ArrayBuffer | Blob | File in packet with a numbered placeholder.
 *
 * @param {Object} packet - socket.io event packet
 * @return {Object} with deconstructed packet and list of buffers
 * @public
 */
function deconstructPacket(packet) {
    const buffers = [];
    const packetData = packet.data;
    const pack = packet;
    pack.data = _deconstructPacket(packetData, buffers);
    pack.attachments = buffers.length; // number of binary 'attachments'
    return { packet: pack, buffers: buffers };
}
exports.deconstructPacket = deconstructPacket;
function _deconstructPacket(data, buffers) {
    if (!data)
        return data;
    if ((0, is_binary_js_1.isBinary)(data)) {
        const placeholder = { _placeholder: true, num: buffers.length };
        buffers.push(data);
        return placeholder;
    }
    else if (Array.isArray(data)) {
        const newData = new Array(data.length);
        for (let i = 0; i < data.length; i++) {
            newData[i] = _deconstructPacket(data[i], buffers);
        }
        return newData;
    }
    else if (typeof data === "object" && !(data instanceof Date)) {
        const newData = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                newData[key] = _deconstructPacket(data[key], buffers);
            }
        }
        return newData;
    }
    return data;
}
/**
 * Reconstructs a binary packet from its placeholder packet and buffers
 *
 * @param {Object} packet - event packet with placeholders
 * @param {Array} buffers - binary buffers to put in placeholder positions
 * @return {Object} reconstructed packet
 * @public
 */
function reconstructPacket(packet, buffers) {
    packet.data = _reconstructPacket(packet.data, buffers);
    delete packet.attachments; // no longer useful
    return packet;
}
exports.reconstructPacket = reconstructPacket;
function _reconstructPacket(data, buffers) {
    if (!data)
        return data;
    if (data && data._placeholder === true) {
        const isIndexValid = typeof data.num === "number" &&
            data.num >= 0 &&
            data.num < buffers.length;
        if (isIndexValid) {
            return buffers[data.num]; // appropriate buffer (should be natural order anyway)
        }
        else {
            throw new Error("illegal attachments");
        }
    }
    else if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
            data[i] = _reconstructPacket(data[i], buffers);
        }
    }
    else if (typeof data === "object") {
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                data[key] = _reconstructPacket(data[key], buffers);
            }
        }
    }
    return data;
}

},{"./is-binary.js":111}],110:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Decoder = exports.Encoder = exports.PacketType = exports.protocol = void 0;
const component_emitter_1 = require("@socket.io/component-emitter");
const binary_js_1 = require("./binary.js");
const is_binary_js_1 = require("./is-binary.js");
const debug_1 = require("debug"); // debug()
const debug = (0, debug_1.default)("socket.io-parser"); // debug()
/**
 * These strings must not be used as event names, as they have a special meaning.
 */
const RESERVED_EVENTS = [
    "connect",
    "connect_error",
    "disconnect",
    "disconnecting",
    "newListener",
    "removeListener", // used by the Node.js EventEmitter
];
/**
 * Protocol version.
 *
 * @public
 */
exports.protocol = 5;
var PacketType;
(function (PacketType) {
    PacketType[PacketType["CONNECT"] = 0] = "CONNECT";
    PacketType[PacketType["DISCONNECT"] = 1] = "DISCONNECT";
    PacketType[PacketType["EVENT"] = 2] = "EVENT";
    PacketType[PacketType["ACK"] = 3] = "ACK";
    PacketType[PacketType["CONNECT_ERROR"] = 4] = "CONNECT_ERROR";
    PacketType[PacketType["BINARY_EVENT"] = 5] = "BINARY_EVENT";
    PacketType[PacketType["BINARY_ACK"] = 6] = "BINARY_ACK";
})(PacketType = exports.PacketType || (exports.PacketType = {}));
/**
 * A socket.io Encoder instance
 */
class Encoder {
    /**
     * Encoder constructor
     *
     * @param {function} replacer - custom replacer to pass down to JSON.parse
     */
    constructor(replacer) {
        this.replacer = replacer;
    }
    /**
     * Encode a packet as a single string if non-binary, or as a
     * buffer sequence, depending on packet type.
     *
     * @param {Object} obj - packet object
     */
    encode(obj) {
        debug("encoding packet %j", obj);
        if (obj.type === PacketType.EVENT || obj.type === PacketType.ACK) {
            if ((0, is_binary_js_1.hasBinary)(obj)) {
                return this.encodeAsBinary({
                    type: obj.type === PacketType.EVENT
                        ? PacketType.BINARY_EVENT
                        : PacketType.BINARY_ACK,
                    nsp: obj.nsp,
                    data: obj.data,
                    id: obj.id,
                });
            }
        }
        return [this.encodeAsString(obj)];
    }
    /**
     * Encode packet as string.
     */
    encodeAsString(obj) {
        // first is type
        let str = "" + obj.type;
        // attachments if we have them
        if (obj.type === PacketType.BINARY_EVENT ||
            obj.type === PacketType.BINARY_ACK) {
            str += obj.attachments + "-";
        }
        // if we have a namespace other than `/`
        // we append it followed by a comma `,`
        if (obj.nsp && "/" !== obj.nsp) {
            str += obj.nsp + ",";
        }
        // immediately followed by the id
        if (null != obj.id) {
            str += obj.id;
        }
        // json data
        if (null != obj.data) {
            str += JSON.stringify(obj.data, this.replacer);
        }
        debug("encoded %j as %s", obj, str);
        return str;
    }
    /**
     * Encode packet as 'buffer sequence' by removing blobs, and
     * deconstructing packet into object with placeholders and
     * a list of buffers.
     */
    encodeAsBinary(obj) {
        const deconstruction = (0, binary_js_1.deconstructPacket)(obj);
        const pack = this.encodeAsString(deconstruction.packet);
        const buffers = deconstruction.buffers;
        buffers.unshift(pack); // add packet info to beginning of data list
        return buffers; // write all the buffers
    }
}
exports.Encoder = Encoder;
// see https://stackoverflow.com/questions/8511281/check-if-a-value-is-an-object-in-javascript
function isObject(value) {
    return Object.prototype.toString.call(value) === "[object Object]";
}
/**
 * A socket.io Decoder instance
 *
 * @return {Object} decoder
 */
class Decoder extends component_emitter_1.Emitter {
    /**
     * Decoder constructor
     *
     * @param {function} reviver - custom reviver to pass down to JSON.stringify
     */
    constructor(reviver) {
        super();
        this.reviver = reviver;
    }
    /**
     * Decodes an encoded packet string into packet JSON.
     *
     * @param {String} obj - encoded packet
     */
    add(obj) {
        let packet;
        if (typeof obj === "string") {
            if (this.reconstructor) {
                throw new Error("got plaintext data when reconstructing a packet");
            }
            packet = this.decodeString(obj);
            const isBinaryEvent = packet.type === PacketType.BINARY_EVENT;
            if (isBinaryEvent || packet.type === PacketType.BINARY_ACK) {
                packet.type = isBinaryEvent ? PacketType.EVENT : PacketType.ACK;
                // binary packet's json
                this.reconstructor = new BinaryReconstructor(packet);
                // no attachments, labeled binary but no binary data to follow
                if (packet.attachments === 0) {
                    super.emitReserved("decoded", packet);
                }
            }
            else {
                // non-binary full packet
                super.emitReserved("decoded", packet);
            }
        }
        else if ((0, is_binary_js_1.isBinary)(obj) || obj.base64) {
            // raw binary data
            if (!this.reconstructor) {
                throw new Error("got binary data when not reconstructing a packet");
            }
            else {
                packet = this.reconstructor.takeBinaryData(obj);
                if (packet) {
                    // received final buffer
                    this.reconstructor = null;
                    super.emitReserved("decoded", packet);
                }
            }
        }
        else {
            throw new Error("Unknown type: " + obj);
        }
    }
    /**
     * Decode a packet String (JSON data)
     *
     * @param {String} str
     * @return {Object} packet
     */
    decodeString(str) {
        let i = 0;
        // look up type
        const p = {
            type: Number(str.charAt(0)),
        };
        if (PacketType[p.type] === undefined) {
            throw new Error("unknown packet type " + p.type);
        }
        // look up attachments if type binary
        if (p.type === PacketType.BINARY_EVENT ||
            p.type === PacketType.BINARY_ACK) {
            const start = i + 1;
            while (str.charAt(++i) !== "-" && i != str.length) { }
            const buf = str.substring(start, i);
            if (buf != Number(buf) || str.charAt(i) !== "-") {
                throw new Error("Illegal attachments");
            }
            p.attachments = Number(buf);
        }
        // look up namespace (if any)
        if ("/" === str.charAt(i + 1)) {
            const start = i + 1;
            while (++i) {
                const c = str.charAt(i);
                if ("," === c)
                    break;
                if (i === str.length)
                    break;
            }
            p.nsp = str.substring(start, i);
        }
        else {
            p.nsp = "/";
        }
        // look up id
        const next = str.charAt(i + 1);
        if ("" !== next && Number(next) == next) {
            const start = i + 1;
            while (++i) {
                const c = str.charAt(i);
                if (null == c || Number(c) != c) {
                    --i;
                    break;
                }
                if (i === str.length)
                    break;
            }
            p.id = Number(str.substring(start, i + 1));
        }
        // look up json data
        if (str.charAt(++i)) {
            const payload = this.tryParse(str.substr(i));
            if (Decoder.isPayloadValid(p.type, payload)) {
                p.data = payload;
            }
            else {
                throw new Error("invalid payload");
            }
        }
        debug("decoded %s as %j", str, p);
        return p;
    }
    tryParse(str) {
        try {
            return JSON.parse(str, this.reviver);
        }
        catch (e) {
            return false;
        }
    }
    static isPayloadValid(type, payload) {
        switch (type) {
            case PacketType.CONNECT:
                return isObject(payload);
            case PacketType.DISCONNECT:
                return payload === undefined;
            case PacketType.CONNECT_ERROR:
                return typeof payload === "string" || isObject(payload);
            case PacketType.EVENT:
            case PacketType.BINARY_EVENT:
                return (Array.isArray(payload) &&
                    (typeof payload[0] === "number" ||
                        (typeof payload[0] === "string" &&
                            RESERVED_EVENTS.indexOf(payload[0]) === -1)));
            case PacketType.ACK:
            case PacketType.BINARY_ACK:
                return Array.isArray(payload);
        }
    }
    /**
     * Deallocates a parser's resources
     */
    destroy() {
        if (this.reconstructor) {
            this.reconstructor.finishedReconstruction();
            this.reconstructor = null;
        }
    }
}
exports.Decoder = Decoder;
/**
 * A manager of a binary event's 'buffer sequence'. Should
 * be constructed whenever a packet of type BINARY_EVENT is
 * decoded.
 *
 * @param {Object} packet
 * @return {BinaryReconstructor} initialized reconstructor
 */
class BinaryReconstructor {
    constructor(packet) {
        this.packet = packet;
        this.buffers = [];
        this.reconPack = packet;
    }
    /**
     * Method to be called when binary data received from connection
     * after a BINARY_EVENT packet.
     *
     * @param {Buffer | ArrayBuffer} binData - the raw binary data received
     * @return {null | Object} returns null if more binary data is expected or
     *   a reconstructed packet object if all buffers have been received.
     */
    takeBinaryData(binData) {
        this.buffers.push(binData);
        if (this.buffers.length === this.reconPack.attachments) {
            // done with buffer list
            const packet = (0, binary_js_1.reconstructPacket)(this.reconPack, this.buffers);
            this.finishedReconstruction();
            return packet;
        }
        return null;
    }
    /**
     * Cleans up binary packet reconstruction variables.
     */
    finishedReconstruction() {
        this.reconPack = null;
        this.buffers = [];
    }
}

},{"./binary.js":109,"./is-binary.js":111,"@socket.io/component-emitter":36,"debug":42}],111:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasBinary = exports.isBinary = void 0;
const withNativeArrayBuffer = typeof ArrayBuffer === "function";
const isView = (obj) => {
    return typeof ArrayBuffer.isView === "function"
        ? ArrayBuffer.isView(obj)
        : obj.buffer instanceof ArrayBuffer;
};
const toString = Object.prototype.toString;
const withNativeBlob = typeof Blob === "function" ||
    (typeof Blob !== "undefined" &&
        toString.call(Blob) === "[object BlobConstructor]");
const withNativeFile = typeof File === "function" ||
    (typeof File !== "undefined" &&
        toString.call(File) === "[object FileConstructor]");
/**
 * Returns true if obj is a Buffer, an ArrayBuffer, a Blob or a File.
 *
 * @private
 */
function isBinary(obj) {
    return ((withNativeArrayBuffer && (obj instanceof ArrayBuffer || isView(obj))) ||
        (withNativeBlob && obj instanceof Blob) ||
        (withNativeFile && obj instanceof File));
}
exports.isBinary = isBinary;
function hasBinary(obj, toJSON) {
    if (!obj || typeof obj !== "object") {
        return false;
    }
    if (Array.isArray(obj)) {
        for (let i = 0, l = obj.length; i < l; i++) {
            if (hasBinary(obj[i])) {
                return true;
            }
        }
        return false;
    }
    if (isBinary(obj)) {
        return true;
    }
    if (obj.toJSON &&
        typeof obj.toJSON === "function" &&
        arguments.length === 1) {
        return hasBinary(obj.toJSON(), true);
    }
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && hasBinary(obj[key])) {
            return true;
        }
    }
    return false;
}
exports.hasBinary = hasBinary;

},{}],112:[function(require,module,exports){
var indexOf = function (xs, item) {
    if (xs.indexOf) return xs.indexOf(item);
    else for (var i = 0; i < xs.length; i++) {
        if (xs[i] === item) return i;
    }
    return -1;
};
var Object_keys = function (obj) {
    if (Object.keys) return Object.keys(obj)
    else {
        var res = [];
        for (var key in obj) res.push(key)
        return res;
    }
};

var forEach = function (xs, fn) {
    if (xs.forEach) return xs.forEach(fn)
    else for (var i = 0; i < xs.length; i++) {
        fn(xs[i], i, xs);
    }
};

var defineProp = (function() {
    try {
        Object.defineProperty({}, '_', {});
        return function(obj, name, value) {
            Object.defineProperty(obj, name, {
                writable: true,
                enumerable: false,
                configurable: true,
                value: value
            })
        };
    } catch(e) {
        return function(obj, name, value) {
            obj[name] = value;
        };
    }
}());

var globals = ['Array', 'Boolean', 'Date', 'Error', 'EvalError', 'Function',
'Infinity', 'JSON', 'Math', 'NaN', 'Number', 'Object', 'RangeError',
'ReferenceError', 'RegExp', 'String', 'SyntaxError', 'TypeError', 'URIError',
'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'escape',
'eval', 'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'undefined', 'unescape'];

function Context() {}
Context.prototype = {};

var Script = exports.Script = function NodeScript (code) {
    if (!(this instanceof Script)) return new Script(code);
    this.code = code;
};

Script.prototype.runInContext = function (context) {
    if (!(context instanceof Context)) {
        throw new TypeError("needs a 'context' argument.");
    }
    
    var iframe = document.createElement('iframe');
    if (!iframe.style) iframe.style = {};
    iframe.style.display = 'none';
    
    document.body.appendChild(iframe);
    
    var win = iframe.contentWindow;
    var wEval = win.eval, wExecScript = win.execScript;

    if (!wEval && wExecScript) {
        // win.eval() magically appears when this is called in IE:
        wExecScript.call(win, 'null');
        wEval = win.eval;
    }
    
    forEach(Object_keys(context), function (key) {
        win[key] = context[key];
    });
    forEach(globals, function (key) {
        if (context[key]) {
            win[key] = context[key];
        }
    });
    
    var winKeys = Object_keys(win);

    var res = wEval.call(win, this.code);
    
    forEach(Object_keys(win), function (key) {
        // Avoid copying circular objects like `top` and `window` by only
        // updating existing context properties or new properties in the `win`
        // that was only introduced after the eval.
        if (key in context || indexOf(winKeys, key) === -1) {
            context[key] = win[key];
        }
    });

    forEach(globals, function (key) {
        if (!(key in context)) {
            defineProp(context, key, win[key]);
        }
    });
    
    document.body.removeChild(iframe);
    
    return res;
};

Script.prototype.runInThisContext = function () {
    return eval(this.code); // maybe...
};

Script.prototype.runInNewContext = function (context) {
    var ctx = Script.createContext(context);
    var res = this.runInContext(ctx);

    if (context) {
        forEach(Object_keys(ctx), function (key) {
            context[key] = ctx[key];
        });
    }

    return res;
};

forEach(Object_keys(Script.prototype), function (name) {
    exports[name] = Script[name] = function (code) {
        var s = Script(code);
        return s[name].apply(s, [].slice.call(arguments, 1));
    };
});

exports.isContext = function (context) {
    return context instanceof Context;
};

exports.createScript = function (code) {
    return exports.Script(code);
};

exports.createContext = Script.createContext = function (context) {
    var copy = new Context();
    if(typeof context === 'object') {
        forEach(Object_keys(context), function (key) {
            copy[key] = context[key];
        });
    }
    return copy;
};

},{}]},{},[6])(6)
});
