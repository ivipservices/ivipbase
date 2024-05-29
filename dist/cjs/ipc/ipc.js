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
        const peer = this.peers.find((w) => w.id === id && w.dbname === dbname);
        if (!peer) {
            this.peers.push({ id, lastSeen: Date.now(), dbname });
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
    removePeer(dbname, id, ignoreUnknown = false) {
        var _a;
        if (this._exiting) {
            return;
        }
        const peer = this.peers.find((peer) => peer.id === id && peer.dbname === dbname);
        if (!peer) {
            if (!ignoreUnknown) {
                throw new Error(`We are supposed to know this peer!`);
            }
            return;
        }
        this.peers.splice(this.peers.indexOf(peer), 1);
        const db = this.ipcDatabases.get(dbname);
        // Remove their subscriptions
        const subscriptions = (_a = this.remoteSubscriptions[dbname]) === null || _a === void 0 ? void 0 : _a.filter((sub) => sub.for === id);
        subscriptions.forEach((sub) => {
            if (Array.isArray(this.remoteSubscriptions[dbname])) {
                this.remoteSubscriptions[dbname].splice(this.remoteSubscriptions[dbname].indexOf(sub), 1);
            }
            db === null || db === void 0 ? void 0 : db.subscriptions.remove(sub.path, sub.event, sub.callback);
        });
    }
    addRemoteSubscription(dbname, peerId, details) {
        if (this._exiting) {
            return;
        }
        // this.storage.debug.log(`remote subscription being added`);
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
                return this.removePeer(dbname, message.from, true);
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
//# sourceMappingURL=ipc.js.map