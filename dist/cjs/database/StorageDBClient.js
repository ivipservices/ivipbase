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
        this.cache = {};
        this.auth = () => {
            return (0, auth_1.getAuth)(this.db.database);
        };
        this.app = db.app;
        this.url = this.app.url.replace(/\/+$/, "");
        this.initialize();
    }
    get serverPingUrl() {
        return `/ping/${this.db.database}`;
    }
    async initialize() {
        await (0, auth_1.getAuth)(this.db.database).ready();
        await this.db.app.request({ route: this.serverPingUrl });
        this.db.emit("ready");
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
        if (this.isConnected || options.ignoreConnectionState === true) {
            try {
                const user = this.auth().currentUser;
                const accessToken = user ? await user.getIdToken() : undefined;
                return await this.db.app.request(Object.assign(Object.assign({}, options), { accessToken }));
            }
            catch (err) {
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
    subscribe(path, event, callback, settings) {
        this.db.subscriptions.add(path, event, callback);
    }
    unsubscribe(path, event, callback) {
        this.db.subscriptions.remove(path, event, callback);
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
    async query(path, query, options = { snapshots: false }) {
        const request = {
            query,
            options,
        };
        const reqData = JSON.stringify(ivipbase_core_1.Transport.serialize(request));
        const { data, context } = await this._request({ method: "POST", route: `/query/${this.db.database}/${path}`, data: reqData, includeContext: true });
        const results = ivipbase_core_1.Transport.deserialize(data);
        const stop = () => Promise.resolve();
        return { results: results.list, context, stop };
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
//# sourceMappingURL=StorageDBClient.js.map