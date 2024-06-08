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
            for (const query_id in this._realtimeQueries) {
                const subscribeQuery = this._realtimeQueries[query_id];
                subscribePromises.push(new Promise(async (resolve, reject) => {
                    try {
                        await this.app.websocketRequest(socket, "query-subscribe", subscribeQuery, this.db.name);
                    }
                    catch (err) {
                        if (err.code === "access_denied" && !this.db.accessToken) {
                            this.db.debug.error(`Could not subscribe to event "Query-Event" on path "${subscribeQuery.path}" because you are not signed in. If you added this event while offline and have a user access token, you can prevent this by using getAuth().signInWithToken(token) to automatically try signing in after connecting`);
                        }
                        else {
                            this.db.debug.error(err);
                        }
                    }
                }));
            }
            this.db.subscriptions.forEach((event, path) => {
                subscribePromises.push(new Promise(async (resolve, reject) => {
                    try {
                        await this.app.websocketRequest(socket, "subscribe", { path: path, event: event }, this.db.name);
                    }
                    catch (err) {
                        if (err.code === "access_denied" && !this.db.accessToken) {
                            this.db.debug.error(`Could not subscribe to event "${event}" on path "${path}" because you are not signed in. If you added this event while offline and have a user access token, you can prevent this by using getAuth().signInWithToken(token) to automatically try signing in after connecting`);
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
                var _a, _b, _c;
                data = ivipbase_core_1.Transport.deserialize(data);
                const query = this._realtimeQueries[data.query_id];
                if (!query) {
                    return;
                }
                let keepMonitoring = true;
                try {
                    keepMonitoring = ((_b = (_a = query.options) === null || _a === void 0 ? void 0 : _a.eventHandler) === null || _b === void 0 ? void 0 : _b.call(_a, data)) !== false;
                }
                catch (err) {
                    keepMonitoring = false;
                }
                if (keepMonitoring === false) {
                    delete this._realtimeQueries[data.query_id];
                    (_c = this.app.socket) === null || _c === void 0 ? void 0 : _c.emit("query-unsubscribe", { dbName: this.db.database, query_id: data.query_id });
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
        const containsRealtime = (options.monitor === true || (typeof options.monitor === "object" && (options.monitor.add || options.monitor.change || options.monitor.remove))) &&
            typeof options.eventHandler === "function";
        if (options.monitor === true || (typeof options.monitor === "object" && (options.monitor.add || options.monitor.change || options.monitor.remove))) {
            console.assert(typeof options.eventHandler === "function", `no eventHandler specified to handle realtime changes`);
            if (!this.app.socket) {
                throw new Error(`Cannot create realtime query because websocket is not connected. Check your AceBaseClient network.realtime setting`);
            }
            request.query_id = ivipbase_core_1.ID.generate();
            request.client_id = this.app.id;
            this._realtimeQueries[request.query_id] = { path, query_id: request.query_id, query, options: Object.assign(Object.assign({}, options), { eventHandler: undefined }), matchedPaths: [] };
        }
        const reqData = JSON.stringify(ivipbase_core_1.Transport.serialize(request));
        try {
            const { data, context } = await this._request({ method: "POST", route: `/query/${this.db.database}/${path}`, data: reqData, includeContext: true });
            const { list, isMore } = ivipbase_core_1.Transport.deserialize(data);
            let socketSend;
            if (containsRealtime && typeof request.query_id === "string") {
                this._realtimeQueries[request.query_id].matchedPaths = list.map((n) => n.path);
                socketSend = this.app.websocketRequest(this.app.socket, "query-subscribe", this._realtimeQueries[request.query_id], this.db.name);
            }
            const stop = async () => {
                if (!containsRealtime && socketSend !== undefined) {
                    return;
                }
                await socketSend;
                delete this._realtimeQueries[request.query_id];
                await this.app.websocketRequest(this.app.socket, "query-unsubscribe", { query_id: request.query_id }, this.db.name);
            };
            return { results: list, context, stop, isMore };
        }
        catch (err) {
            if (typeof request.query_id === "string" && request.query_id in this._realtimeQueries) {
                delete this._realtimeQueries[request.query_id];
            }
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
//# sourceMappingURL=StorageDBClient.js.map