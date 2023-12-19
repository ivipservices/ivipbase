"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteApp = exports.getFirstApp = exports.getApps = exports.getApp = exports.appExists = exports.initializeApp = exports.IvipBaseApp = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const internal_1 = require("./internal");
const erros_1 = require("../controller/erros");
const server_1 = require("../server");
const verifyStorage_1 = require("./verifyStorage");
const DEFAULT_ENTRY_NAME = "[DEFAULT]";
class IvipBaseSettings {
    constructor(options = {}) {
        var _a;
        this.name = DEFAULT_ENTRY_NAME;
        this.dbname = "root";
        this.logLevel = "log";
        this.storage = new verifyStorage_1.DataStorageSettings();
        if (typeof options.name === "string") {
            this.name = options.name;
        }
        if (typeof options.dbname === "string") {
            this.dbname = options.dbname;
        }
        if (typeof options.logLevel === "string" && ["log", "warn", "error"].includes(options.logLevel)) {
            this.logLevel = options.logLevel;
        }
        if ((0, verifyStorage_1.validSettings)(options.storage)) {
            this.storage = options.storage;
        }
        if (typeof options.server === "object") {
            if (server_1.isPossiblyServer) {
                this.server = options.server;
            }
            else {
                this.client = options.server;
            }
        }
        if (typeof options.client === "object") {
            this.client = Object.assign((_a = this.client) !== null && _a !== void 0 ? _a : {}, options.client);
        }
    }
}
class IvipBaseApp extends ivipbase_core_1.SimpleEventEmitter {
    constructor(options) {
        super();
        this._ready = false;
        this.name = DEFAULT_ENTRY_NAME;
        this.settings = new IvipBaseSettings();
        this.storage = new verifyStorage_1.DataStorage();
        this.isDeleted = false;
        if (typeof options.name === "string") {
            this.name = options.name;
        }
        if (options.settings instanceof IvipBaseSettings) {
            this.settings = options.settings;
        }
        if (typeof options.isDeleted === "boolean") {
            this.isDeleted = options.isDeleted;
        }
        this.storage = (0, verifyStorage_1.applySettings)(this.settings.dbname, this.settings.storage);
        this.isServer = typeof this.settings.server === "object";
        this.once("ready", () => {
            this._ready = true;
        });
        if (this.isServer) {
            this.server = new server_1.LocalServer(this.name, this.settings.server);
            this.server.ready(() => {
                this.emitOnce("ready");
            });
        }
        else {
            this.emitOnce("ready");
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
            await new Promise((resolve) => this.on("ready", resolve));
        }
        callback === null || callback === void 0 ? void 0 : callback();
    }
    get isReady() {
        return this._ready;
    }
}
exports.IvipBaseApp = IvipBaseApp;
function initializeApp(options) {
    const settings = new IvipBaseSettings(options);
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
    return newApp;
}
exports.initializeApp = initializeApp;
function appExists(name) {
    return typeof name === "string" && internal_1._apps.has(name);
}
exports.appExists = appExists;
function getApp(name = DEFAULT_ENTRY_NAME) {
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
function getFirstApp() {
    let app;
    if (internal_1._apps.has(DEFAULT_ENTRY_NAME)) {
        app = internal_1._apps.get(DEFAULT_ENTRY_NAME);
    }
    app = !app ? getApps()[0] : app;
    if (!app) {
        throw erros_1.ERROR_FACTORY.create("no-app" /* AppError.NO_APP */, { appName: DEFAULT_ENTRY_NAME });
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