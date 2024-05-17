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
        // this._connectionState = CONNECTION_STATE_DISCONNECTED;
        this._connectionState = CONNECTION_STATE_CONNECTED;
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
    initialize() {
        if (!this._ready) {
            const promises = [];
            const dbList = Array.isArray(this.settings.dbname) ? this.settings.dbname : [this.settings.dbname];
            promises.push(new Promise(async (resolve, reject) => {
                await this.storage.ready();
                resolve();
            }));
            if (this.isServer) {
                promises.push(new Promise(async (resolve, reject) => {
                    const server = new server_1.LocalServer(this, this.settings.server);
                    await server.ready();
                    this.server = server;
                    resolve();
                }));
            }
            for (const dbName of dbList) {
                promises.push(new Promise(async (resolve, reject) => {
                    const db = new database_1.DataBase(dbName, this);
                    await db.ready();
                    this.databases.set(dbName, db);
                    resolve();
                }));
            }
            Promise.all(promises).then(() => {
                this.emit("ready");
            });
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
        return this._connectionState === CONNECTION_STATE_CONNECTED;
    }
    get isConnecting() {
        return this._connectionState === CONNECTION_STATE_CONNECTING;
    }
    get connectionState() {
        return this._connectionState;
    }
    get socket() {
        return this._socket;
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
        });
    }
    async projects() {
        return this.request({ route: "projects" });
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