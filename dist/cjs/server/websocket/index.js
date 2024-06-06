"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addWebsocketServer = exports.SocketRequestError = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const clients_1 = require("../shared/clients");
const tokens_1 = require("../shared/tokens");
const socket_io_1 = require("./socket.io");
class SocketRequestError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.SocketRequestError = SocketRequestError;
const addWebsocketServer = (env) => {
    env.localApp.ipcReady((ipc) => {
        ipc.on("notification", (message) => {
            if (message.type === "websocket.userConnect") {
                env.emit("userConnect", {
                    dbNames: message.dbNames,
                    user: message.user,
                });
            }
            else if (message.type === "websocket.userDisconnect") {
                env.emit("userDisconnect", {
                    dbNames: message.dbNames,
                    user: message.user,
                });
            }
        });
    });
    // TODO: Allow using uWebSockets.js server instead of Socket.IO
    const serverManager = (0, socket_io_1.createServer)(env);
    const getClientBySocketId = (id, event) => {
        const client = env.clients.get(id);
        if (!client) {
            env.debug.error(`Cannot find client "${id}" for socket event "${event}"`);
        }
        return !client || client.disconnected ? undefined : client;
    };
    serverManager.on("connect", (event) => {
        var _a;
        const client = new clients_1.ConnectedClient(event.socket);
        env.clients.set(client.id, client);
        //env.debug.warn(`New socket connected, total: ${env.clients.size}`);
        serverManager.send(event.socket, "welcome");
        (_a = env.localApp.ipc) === null || _a === void 0 ? void 0 : _a.sendNotification({
            type: "websocket.userConnect",
            dbNames: event.dbNames,
            user: client.id,
        });
        env.emit("userConnect", {
            dbNames: event.dbNames,
            user: client.id,
        });
    });
    serverManager.on("disconnect", (event) => {
        var _a;
        (_a = env.localApp.ipc) === null || _a === void 0 ? void 0 : _a.sendNotification({
            type: "websocket.userDisconnect",
            dbNames: event.dbNames,
            user: event.socket_id,
        });
        env.emit("userDisconnect", {
            dbNames: event.dbNames,
            user: event.socket_id,
        });
        // We lost one
        const client = getClientBySocketId(event.socket_id, "disconnect");
        if (!client) {
            return;
        } // Disconnected a client we did not know? Don't crash, just ignore.
        client.disconnected = true;
        for (const dbName in client.subscriptions) {
            const subscribedPaths = Object.keys(client.subscriptions[dbName]);
            if (subscribedPaths.length > 0) {
                // TODO: Substitute the original callbacks to cache them
                // if the client then reconnects within a certain time,
                // we can send the missed notifications
                //
                // subscribedPaths.forEach(path => {
                //     client.subscriptions[path].forEach(subscr => {
                //         subscr.callback
                //     })
                // });
                const remove = [];
                subscribedPaths.forEach((path) => {
                    remove.push(...client.subscriptions[dbName][path]);
                });
                remove.forEach((subscr) => {
                    // Unsubscribe them at db level and remove from our list
                    env.db(dbName).storage.unsubscribe(subscr.path, subscr.event, subscr.callback); //db.ref(subscr.path).off(subscr.event, subscr.callback);
                    const pathSubs = client.subscriptions[dbName][subscr.path];
                    if (pathSubs && pathSubs.length > 0 && pathSubs.includes(subscr)) {
                        pathSubs.splice(pathSubs.indexOf(subscr), 1);
                    }
                });
            }
        }
        env.clients.delete(client.id);
        env.debug.verbose(`Socket disconnected, total: ${env.clients.size}`);
    });
    serverManager.on("signin", (event) => {
        var _a;
        // client sends this request once user has been signed in, binds the user to the socket,
        // deprecated since client v0.9.4, which sends client_id with signin api call
        // const client = clients.get(socket.id);
        const client = getClientBySocketId(event.socket_id, "signin");
        if (!client) {
            return;
        }
        try {
            if (!event.data) {
                throw new SocketRequestError("missing_data", "Missing data");
            }
            if (!event.data.accessToken) {
                throw new SocketRequestError("missing_access_token", "Missing access token");
            }
            if (!event.data.dbName) {
                throw new SocketRequestError("missing_db_name", "Missing database name");
            }
            const tokenSalt = env.tokenSalt[event.data.dbName];
            if (!tokenSalt) {
                throw new SocketRequestError("missing_token_salt", "Missing token salt");
            }
            const uid = (0, tokens_1.decodePublicAccessToken)(event.data.accessToken, tokenSalt).uid;
            const user = (_a = env.authCache.get(uid)) !== null && _a !== void 0 ? _a : undefined;
            if (user) {
                client.user.set(event.data.dbName, user);
            }
            else {
                client.user.delete(event.data.dbName);
            }
        }
        catch (err) {
            if (event.data && event.data.accessToken) {
                env.debug.error(`websocket: invalid access token passed to signin: ${event.data.accessToken}`);
            }
            else {
                env.debug.error(`websocket: invalid access token passed to signin (${err.message})`);
            }
        }
    });
    serverManager.on("signout", (event) => {
        // deprecated since client v0.9.4, which sends client_id with signout api call
        // const client = clients.get(socket.id);
        const client = getClientBySocketId(event.socket_id, "signout");
        if (!client || !event.data) {
            return;
        }
        client.user.delete(event.data.dbName);
    });
    const acknowledgeRequest = (socket, requestId) => {
        // Send acknowledgement
        serverManager.send(socket, "result", {
            success: true,
            req_id: requestId,
        });
    };
    const failRequest = (socket, requestId, code) => {
        // Send error
        serverManager.send(socket, "result", {
            success: false,
            reason: code,
            req_id: requestId,
        });
    };
    serverManager.on("subscribe", async (event) => {
        var _a, _b, _c, _d;
        // Client wants to subscribe to events on a node
        const client = getClientBySocketId(event.socket_id, "subscribe");
        if (!client || !event.data) {
            return;
        }
        const eventName = event.data.event;
        const subscriptionPath = event.data.path;
        const dbName = event.data.dbName;
        env.debug.verbose(`Client ${event.socket_id} subscribes to event "${eventName}" on path "/${subscriptionPath}"`);
        const isSubscribed = () => client.subscriptions[dbName] && subscriptionPath in client.subscriptions[dbName] && client.subscriptions[dbName][subscriptionPath].some((s) => s.event === eventName);
        if (isSubscribed()) {
            return acknowledgeRequest(event.socket, event.data.req_id);
        }
        // Get client
        // const client = clients.get(socket.id);
        if (!(await env.rules(dbName).isOperationAllowed((_a = client.user.get(dbName)) !== null && _a !== void 0 ? _a : {}, subscriptionPath, "get"))) {
            env.log.error("event.subscribe", "access_denied", { uid: (_c = (_b = client.user.get(dbName)) === null || _b === void 0 ? void 0 : _b.uid) !== null && _c !== void 0 ? _c : "anonymous", path: subscriptionPath });
            return failRequest(event.socket, event.data.req_id, "access_denied");
        }
        const callback = async (err, path, currentValue, previousValue, context) => {
            var _a;
            if (!isSubscribed()) {
                // Not subscribed anymore. Cancel sending
                return;
            }
            if (err || !event.data) {
                return;
            }
            if (!(await env.rules(dbName).isOperationAllowed((_a = client.user.get(dbName)) !== null && _a !== void 0 ? _a : {}, path, "get", { value: currentValue, context }))) {
                // 'event', { eventName, subscriptionPath, currentValue, previousValue, context })
                if (!subscriptionPath.includes("*") && !subscriptionPath.includes("$")) {
                    // Could potentially be very many callbacks, so
                    // DISABLED: logRef.push({ action: `access_revoked`, uid: client.user ? client.user.uid : '-', path: subscriptionPath });
                    // Only log when user subscribes again
                    failRequest(event.socket, event.data.req_id, "access_denied");
                }
                return;
            }
            const val = ivipbase_core_1.Transport.serialize({
                current: currentValue,
                previous: previousValue,
            });
            env.debug.verbose(`Sending data event "${eventName}" for path "/${path}" to client ${event.socket_id}`);
            // TODO: let large data events notify the client, then let them download the data manually so it doesn't have to be transmitted through the websocket
            serverManager.send(event.socket, "data-event", {
                subscr_path: subscriptionPath,
                path,
                event: eventName,
                val,
                context,
            });
        };
        let pathSubs = (_d = client.subscriptions[dbName]) === null || _d === void 0 ? void 0 : _d[subscriptionPath];
        if (!pathSubs) {
            if (!client.subscriptions[dbName]) {
                client.subscriptions[dbName] = {};
            }
            pathSubs = client.subscriptions[dbName][subscriptionPath] = [];
        }
        const subscr = { path: subscriptionPath, event: eventName, callback };
        pathSubs.push(subscr);
        env.db(dbName).storage.subscribe(subscriptionPath, eventName, callback);
        acknowledgeRequest(event.socket, event.data.req_id);
    });
    serverManager.on("unsubscribe", (event) => {
        var _a;
        // Client unsubscribes from events on a node
        const client = getClientBySocketId(event.socket_id, "unsubscribe");
        if (!client || !event.data) {
            return;
        }
        const eventName = event.data.event;
        const subscriptionPath = event.data.path;
        const dbName = event.data.dbName;
        env.debug.verbose(`Client ${event.socket_id} is unsubscribing from event "${eventName || "(any)"}" on path "/${subscriptionPath}"`);
        // const client = clients.get(socket.id);
        const pathSubs = (_a = client.subscriptions[dbName]) === null || _a === void 0 ? void 0 : _a[subscriptionPath];
        if (!pathSubs) {
            // We have no knowledge of any active subscriptions on this path
            return acknowledgeRequest(event.socket, event.data.req_id);
        }
        let remove = pathSubs;
        if (eventName) {
            // Unsubscribe from a specific event
            remove = pathSubs.filter((subscr) => subscr.event === eventName);
        }
        remove.forEach((subscr) => {
            if (!event.data) {
                return;
            }
            // Unsubscribe them at db level and remove from our list
            //this.debug.verbose(`   - unsubscribing from event ${subscr.event} with${subscr.callback ? "" : "out"} callback on path "${data.path}"`);
            env.db(dbName).storage.unsubscribe(subscr.path, subscr.event, subscr.callback); //db.api.unsubscribe(data.path, subscr.event, subscr.callback);
            pathSubs.splice(pathSubs.indexOf(subscr), 1);
        });
        if (pathSubs.length === 0 && client.subscriptions[dbName]) {
            // No subscriptions left on this path, remove the path entry
            delete client.subscriptions[dbName][subscriptionPath];
        }
        return acknowledgeRequest(event.socket, event.data.req_id);
    });
    serverManager.on("query-unsubscribe", (event) => {
        // Client unsubscribing from realtime query events
        const client = getClientBySocketId(event.socket_id, "query-unsubscribe");
        if (!client || !event.data) {
            return;
        }
        const dbName = event.data.dbName;
        env.debug.verbose(`Client ${event.socket_id} is unsubscribing from realtime query "${event.data.query_id}"`);
        // const client = clients.get(socket.id);
        if (dbName in client.realtimeQueries && event.data.query_id in client.realtimeQueries[dbName]) {
            delete client.realtimeQueries[dbName][event.data.query_id];
        }
        acknowledgeRequest(event.socket, event.data.req_id);
    });
    return serverManager;
};
exports.addWebsocketServer = addWebsocketServer;
//# sourceMappingURL=index.js.map