import { Api, ID, SchemaDefinition, Transport } from "ivipbase-core";
import { NOT_CONNECTED_ERROR_MESSAGE } from "../controller/request/error.js";
import { getAuth } from "../auth/index.js";
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
export class StorageDBClient extends Api {
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
            this.app.socket?.on("data-event", (data) => {
                const val = Transport.deserialize(data.val);
                const context = data.context ?? {};
                context.acebase_event_source = "server";
                const isValid = this.db.subscriptions.hasValueSubscribersForPath(data.subscr_path);
                if (!isValid) {
                    return;
                }
                this.db.subscriptions.trigger(data.event, data.subscr_path, data.path, val.previous, val.current, context);
            });
            this.app.socket?.on("query-event", (data) => {
                data = Transport.deserialize(data);
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
                    this.app.socket?.emit("query-unsubscribe", { query_id: data.query_id });
                }
            });
        });
    }
    get serverPingUrl() {
        return `/ping/${this.db.database}`;
    }
    async initialize() {
        this.app.onConnect(async () => {
            await getAuth(this.db.database).initialize();
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
        if (this.isConnected || options.ignoreConnectionState === true) {
            const auth = this.app.auth.get(this.db.database);
            try {
                const accessToken = auth?.currentUser?.accessToken;
                return await this.db.app.request({
                    ...options,
                    accessToken,
                });
            }
            catch (err) {
                auth?.currentUser?.reload();
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
                throw new Error(NOT_CONNECTED_ERROR_MESSAGE);
            }
            const connectPromise = new Promise((resolve) => this.app.socket?.once("connect", resolve));
            await promiseTimeout(connectPromise, 1000, "Waiting for connection").catch((err) => {
                throw new Error(NOT_CONNECTED_ERROR_MESSAGE);
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
        const data = JSON.stringify(Transport.serialize(value));
        const { context } = await this._request({ method: "PUT", route: `/data/${this.db.database}/${path}`, data, context: options.context ?? {}, includeContext: true });
        const cursor = context?.database_cursor;
        return { cursor };
    }
    async update(path, updates, options = {
        suppress_events: true,
        context: {},
    }) {
        const data = JSON.stringify(Transport.serialize(updates));
        const { context } = await this._request({ method: "POST", route: `/data/${this.db.database}/${path}`, data, context: options.context, includeContext: true });
        const cursor = context?.database_cursor;
        return { cursor };
    }
    async transaction(path, callback, options = {
        suppress_events: false,
        context: null,
    }) {
        const { value, context } = await this.get(path, { child_objects: true });
        const newValue = await Promise.race([callback(value ?? null)]);
        return this.update(path, newValue, { suppress_events: options.suppress_events, context: options.context });
    }
    async get(path, options) {
        const { data, context } = await this._request({ route: `/data/${this.db.database}/${path}`, context: options, includeContext: true });
        return { value: Transport.deserialize(data), context, cursor: context?.database_cursor };
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
            request.query_id = ID.generate();
            request.client_id = this.app.socket.id;
            this._realtimeQueries[request.query_id] = { query, options };
        }
        const reqData = JSON.stringify(Transport.serialize(request));
        try {
            const { data, context } = await this._request({ method: "POST", route: `/query/${this.db.database}/${path}`, data: reqData, includeContext: true });
            const results = Transport.deserialize(data);
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
            schema = new SchemaDefinition(schema).text;
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
//# sourceMappingURL=StorageDBClient.js.map