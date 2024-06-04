"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPCPeer = void 0;
const Cluster = __importStar(require("cluster"));
const ipc_1 = require("../ipc");
const cluster = (_a = Cluster.default) !== null && _a !== void 0 ? _a : Cluster; // ESM and CJS compatible approach
const masterPeerId = "[master]";
class IPCPeer extends ipc_1.IvipBaseIPCPeer {
    constructor(name) {
        var _a, _b;
        const pm2id = ((_a = process.env) === null || _a === void 0 ? void 0 : _a.NODE_APP_INSTANCE) || ((_b = process.env) === null || _b === void 0 ? void 0 : _b.pm_id);
        if (typeof pm2id === "string" && pm2id !== "0") {
            throw new Error(`To use IVIPBASE with pm2 in cluster mode, use an IVIPBASE IPC server to enable interprocess communication.`);
        }
        const peerId = cluster.isMaster ? masterPeerId : cluster.worker.id.toString();
        super(peerId, name);
        this.name = name;
        this.masterPeerId = masterPeerId;
        this.ipcType = "node.cluster";
        /** Adds an event handler to a Node.js EventEmitter that is automatically removed upon IPC exit */
        const bindEventHandler = (target, event, handler) => {
            target.addListener(event, handler);
            this.on("exit", () => target.removeListener(event, handler));
        };
        // Setup process exit handler
        bindEventHandler(process, "SIGINT", () => {
            this.exit();
        });
        if (cluster.isMaster) {
            bindEventHandler(cluster, "online", (worker) => {
                // A new worker is started
                // Do not add yet, wait for "hello" message - a forked process might not use the same db
                bindEventHandler(worker, "error", (err) => {
                    this.debug.error(`Caught worker error:`, err);
                });
            });
            bindEventHandler(cluster, "exit", (worker) => {
                // A worker has shut down
                if (this.peers.find((peer) => peer.id === worker.id.toString())) {
                    const dbs = Array.from(this.ipcDatabases.keys());
                    for (const dbname of dbs) {
                        // Worker apparently did not have time to say goodbye,
                        // remove the peer ourselves
                        this.removePeer(worker.id.toString());
                        // Send "bye" message on their behalf
                        this.sayGoodbye(dbname, worker.id.toString());
                    }
                }
            });
        }
        const handleMessage = (message) => {
            // console.log(message);
            if (typeof message !== "object") {
                // Ignore non-object IPC messages
                return;
            }
            if (message.type === "hello") {
                this.addPeer(message.dbname, message.from, false);
            }
            // if (!this.ipcDatabases.has(message.dbname)) {
            // 	// Ignore, message not meant for this database
            // 	return;
            // }
            if (cluster.isMaster && message.to !== masterPeerId) {
                // Message is meant for others (or all). Forward it
                this.sendMessage(message.dbname, message);
            }
            if (message.to && message.to !== this.id) {
                // Message is for somebody else. Ignore
                return;
            }
            return super.handleMessage(message);
        };
        if (cluster.isMaster) {
            bindEventHandler(cluster, "message", (worker, message) => handleMessage(message));
        }
        else {
            bindEventHandler(cluster.worker, "message", handleMessage);
        }
        // if (!cluster.isMaster) {
        //     // Add master peer. Do we have to?
        //     this.addPeer(masterPeerId, false, false);
        // }
    }
    sendMessage(dbname, message) {
        var _a;
        message.dbname = dbname;
        if (cluster.isMaster) {
            // If we are the master, send the message to the target worker(s)
            this.peers
                .filter((p) => p.id !== message.from && (!message.to || p.id === message.to))
                .forEach((peer) => {
                var _a;
                const worker = (_a = cluster.workers) === null || _a === void 0 ? void 0 : _a[peer.id];
                worker && worker.send(message); // When debugging, worker might have stopped in the meantime
            });
        }
        else {
            // Send the message to the master who will forward it to the target worker(s)
            (_a = process === null || process === void 0 ? void 0 : process.send) === null || _a === void 0 ? void 0 : _a.call(process, message);
        }
    }
    async exit(code = 0) {
        await super.exit(code);
    }
}
exports.IPCPeer = IPCPeer;
//# sourceMappingURL=index.js.map