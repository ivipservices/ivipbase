import { SimpleEventEmitter, Utils } from "ivipbase-core";
import { DEFAULT_ENTRY_NAME, _apps } from "./internal.js";
import { ERROR_FACTORY } from "../controller/erros/index.js";
import { LocalServer } from "../server/index.js";
import { DataStorage, applySettings } from "./verifyStorage/index.js";
import { IvipBaseSettings } from "./settings/index.js";
export class IvipBaseApp extends SimpleEventEmitter {
    constructor(options) {
        super();
        this._ready = false;
        this.name = DEFAULT_ENTRY_NAME;
        this.settings = new IvipBaseSettings();
        this.storage = new DataStorage();
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
        this.storage = applySettings(this.settings.dbname, this.settings.storage);
        this.isServer = typeof this.settings.server === "object";
        this.once("ready", () => {
            this._ready = true;
        });
    }
    init() {
        if (!this._ready) {
            if (this.isServer) {
                this.server = new LocalServer(this.name, this.settings.server);
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
        callback?.();
    }
    get isReady() {
        return this._ready;
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
    newApp.init();
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