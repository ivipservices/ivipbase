"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectedClient = void 0;
class ConnectedClient {
    /**
     *
     * @param socket Socket object used by the framework
     * @param id optional: use if the socket object does not have an `id` property.
     */
    constructor(socket, id) {
        this.socket = socket;
        // get id() { return this.socket.id; };
        this.connectedDate = new Date();
        /** user details if this socket client is signed in */
        this.user = new Map();
        /** Active event subscriptions for this client */
        this.subscriptions = {};
        /** Active realtime query subscriptions for this client */
        this.realtimeQueries = {};
        /** Currently running transactions */
        this.transactions = {};
        this.disconnected = false;
        this.id = id !== null && id !== void 0 ? id : socket.id;
        if (!this.id) {
            throw new Error("Socket has no id");
        }
    }
}
exports.ConnectedClient = ConnectedClient;
//# sourceMappingURL=clients.js.map