"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteApp = exports.getFirstApp = exports.getApps = exports.getApp = exports.appExists = exports.initializeApp = exports.IvipBaseApp = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const internal_1 = require("./internal");
const erros_1 = require("../controller/erros");
const server_1 = require("../server");
const verifyStorage_1 = require("./verifyStorage");
const settings_1 = require("./settings");
class IvipBaseApp extends ivipbase_core_1.SimpleEventEmitter {
    constructor(options) {
        super();
        this._ready = false;
        this.name = internal_1.DEFAULT_ENTRY_NAME;
        this.settings = new settings_1.IvipBaseSettings();
        this.storage = new verifyStorage_1.DataStorage();
        this.isDeleted = false;
        if (typeof options.name === "string") {
            this.name = options.name;
        }
        if (options.settings instanceof settings_1.IvipBaseSettings) {
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
    }
    init() {
        if (!this._ready) {
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
    newApp.init();
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