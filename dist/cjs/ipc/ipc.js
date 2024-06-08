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
        this.peers = [];
        this._exiting = false;
        this._requests = new Map();
        this.debug = new ivipbase_core_1.DebugLogger("verbose", `[${name}]`);
        const helloMsg = { type: "hello", from: this.id, data: undefined };
        this.sendMessage(helloMsg);
    }
    on(event, callback) {
        return super.on(event, callback);
    }
    emit(event, data) {
        super.emit(event, data);
        return this;
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
        this.sayGoodbye(this.id);
        this.debug.warn(`${this.isMaster ? "Master" : "Worker " + this.id} will now exit`);
        this.emitOnce("exit", code);
    }
    sayGoodbye(forPeerId) {
        // Send "bye" message on their behalf
        const bye = { type: "bye", from: forPeerId, data: undefined };
        this.sendMessage(bye);
    }
    addPeer(id, sendReply = true) {
        if (this._exiting) {
            return;
        }
        const peer = this.peers.find((w) => w.id === id);
        if (!peer) {
            this.peers.push({ id, lastSeen: Date.now() });
        }
        if (sendReply) {
            // Send hello back to sender
            const helloMessage = { type: "hello", from: this.id, to: id, data: undefined };
            this.sendMessage(helloMessage);
        }
    }
    removePeer(id, ignoreUnknown = false) {
        if (this._exiting) {
            return;
        }
        const peer = this.peers.find((peer) => peer.id === id);
        if (!peer) {
            if (!ignoreUnknown) {
                throw new Error(`We are supposed to know this peer!`);
            }
            return;
        }
        this.peers.splice(this.peers.indexOf(peer), 1);
    }
    async handleMessage(message) {
        if (message.from === this.id) {
            return;
        }
        switch (message.type) {
            case "hello":
                return this.addPeer(message.from, message.to !== this.id);
            case "bye":
                return this.removePeer(message.from, true);
            case "triggerEvents":
                return this.emit("triggerEvents", message.data);
            case "notification": {
                // Custom notification received - raise event
                return this.emit("notification", message.data);
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
        let resolve, reject, timer;
        const promise = new Promise((rs, rj) => {
            resolve = (result) => {
                if (this._requests.has(req.id) !== true) {
                    return;
                }
                clearTimeout(timer);
                this._requests.delete(req.id);
                rs(result);
            };
            reject = (err) => {
                if (this._requests.has(req.id) !== true) {
                    return;
                }
                clearTimeout(timer);
                this._requests.delete(req.id);
                rj(err);
            };
        });
        this._requests.set(req.id, { resolve, reject, request: req });
        timer = setTimeout(() => {
            reject(new Error("Request timed out"));
        }, 1000 * 60 * 1);
        this.sendMessage(req);
        return promise;
    }
    async sendRequest(request) {
        const req = { type: "request", from: this.id, to: this.masterPeerId, id: ivipbase_core_1.ID.generate(), data: request };
        return await this.request(req).catch((err) => {
            this.debug.error(err);
            throw err;
        });
    }
    replyRequest(requestMessage, result) {
        const reply = { type: "result", id: requestMessage.id, ok: true, from: this.id, to: requestMessage.from, data: result };
        this.sendMessage(reply);
    }
    sendNotification(notification) {
        const msg = { type: "notification", from: this.id, data: notification };
        this.sendMessage(msg);
    }
    sendTriggerEvents(dbname, path, oldValue, newValue, options = {
        suppress_events: false,
        context: undefined,
    }) {
        this.sendMessage({
            type: "triggerEvents",
            from: this.id,
            data: {
                dbName: dbname,
                path,
                oldValue,
                newValue,
                options,
            },
            dbname,
        });
    }
}
exports.IvipBaseIPCPeer = IvipBaseIPCPeer;
//# sourceMappingURL=ipc.js.map