import { SimpleEventEmitter, Utils } from "ivipbase-core";
import { DEFAULT_ENTRY_NAME, _apps } from "./internal.js";
import { ERROR_FACTORY } from "../controller/erros/index.js";
import { LocalServer } from "../server/index.js";
import { applySettings } from "./verifyStorage/index.js";
import { IvipBaseSettings } from "./settings/index.js";
import { DataBase } from "../database/index.js";
import _request from "../controller/request/index.js";
const CONNECTION_STATE_DISCONNECTED = "disconnected";
const CONNECTION_STATE_CONNECTING = "connecting";
const CONNECTION_STATE_CONNECTED = "connected";
const CONNECTION_STATE_DISCONNECTING = "disconnecting";
export class IvipBaseApp extends SimpleEventEmitter {
    constructor(options) {
        super();
        this._ready = false;
        this.name = DEFAULT_ENTRY_NAME;
        this.isDeleted = false;
        this.databases = new Map();
        this.auth = new Map();
        this._socket = null;
        // this._connectionState = CONNECTION_STATE_DISCONNECTED;
        this._connectionState = CONNECTION_STATE_CONNECTED;
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
                    const server = new LocalServer(this, this.settings.server);
                    await server.ready();
                    this.server = server;
                    resolve();
                }));
            }
            for (const dbName of dbList) {
                promises.push(new Promise(async (resolve, reject) => {
                    const db = new DataBase(dbName, this);
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
        callback?.();
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
        return `${this.settings.protocol}://${this.settings.host ?? "localhost"}${typeof this.settings.port === "number" ? `:${this.settings.port}` : ""}`;
    }
    async request(options) {
        const url = `${this.url}/${options.route.replace(/^\/+/, "")}`;
        return new Promise(async (resolve, reject) => {
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
        });
    }
    async projects() {
        return this.request({ route: "projects" });
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