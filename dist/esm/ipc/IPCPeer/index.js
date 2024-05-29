import * as Cluster from "cluster";
import { IvipBaseIPCPeer } from "../ipc.js";
const cluster = Cluster.default ?? Cluster; // ESM and CJS compatible approach
const masterPeerId = "[master]";
export class IPCPeer extends IvipBaseIPCPeer {
    constructor(name) {
        const pm2id = process.env?.NODE_APP_INSTANCE || process.env?.pm_id;
        if (typeof pm2id === "string" && pm2id !== "0") {
            throw new Error(`To use AceBase with pm2 in cluster mode, use an AceBase IPC server to enable interprocess communication.`);
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
                        this.removePeer(dbname, worker.id.toString());
                        // Send "bye" message on their behalf
                        this.sayGoodbye(dbname, worker.id.toString());
                    }
                }
            });
        }
        const handleMessage = (message) => {
            if (typeof message !== "object") {
                // Ignore non-object IPC messages
                return;
            }
            if (!this.ipcDatabases.has(message.dbname)) {
                // Ignore, message not meant for this database
                return;
            }
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
        message.dbname = dbname;
        if (cluster.isMaster) {
            // If we are the master, send the message to the target worker(s)
            this.peers
                .filter((p) => p.id !== message.from && (!message.to || p.id === message.to))
                .forEach((peer) => {
                const worker = cluster.workers?.[peer.id];
                worker && worker.send(message); // When debugging, worker might have stopped in the meantime
            });
        }
        else {
            // Send the message to the master who will forward it to the target worker(s)
            process?.send?.(message);
        }
    }
    async exit(code = 0) {
        await super.exit(code);
    }
}
//# sourceMappingURL=index.js.map