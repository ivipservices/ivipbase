import { Server as SocketIOServer } from "socket.io";
const createSocketIOServer = (httpServer, options) => {
    return new SocketIOServer(httpServer, options);
};
import { WebSocketManager } from "./manager.js";
import { getCorsOptions } from "../middleware/cors.js";
export class SocketIOManager extends WebSocketManager {
    constructor() {
        super("Socket.IO");
    }
    disconnect(socket) {
        socket.disconnect(true);
    }
    send(socket, event, message) {
        socket.emit(event, message);
    }
}
export const createServer = (env) => {
    // TODO: determine max socket payload using env.config.maxPayloadSize which is now only used for json POST data
    // const maxPayloadBytes = ((payloadStr) => {
    //     const match = payloadStr.match(/^([0-9]+)(?:mb|kb|b)$/i);
    //     if (!match) { return 10e7; } // Socket.IO 2.x default (100MB), 3.x default is 1MB (1e6)
    //     const nr = +match[0], unit = match[1].toLowerCase();
    //     switch (unit) {
    //         case 'mb': return nr * 1e6;
    //         case 'kb': return nr * 1e3;
    //         case 'b': return nr;
    //     }
    // }, env.config.maxPayloadSize);
    const maxPayloadBytes = 10e7; // Socket is closed if sent message exceeds this. Socket.io 2.x default is 10e7 (100MB)
    const server = createSocketIOServer(env.server, {
        // See https://socket.io/docs/v2/server-initialization/ and https://socket.io/docs/v3/server-initialization/
        pingInterval: 5000, // socket.io 2.x default is 25000
        pingTimeout: 5000, // socket.io 2.x default is 5000, 3.x default = 20000
        maxHttpBufferSize: maxPayloadBytes,
        path: `/socket.io`,
        // Allow socket.io 2.x clients (using engine.io 3.x):
        allowEIO3: true,
        // socket.io 3+ uses cors package:
        cors: getCorsOptions(env.settings.allowOrigin),
    });
    // Setup event emitter for communication with consuming server
    const manager = new SocketIOManager();
    server.sockets.on("connection", (socket) => {
        const { protocol, host, port } = socket.request.headers;
        manager.emit("connect", { socket, socket_id: socket.id });
        socket.on("disconnect", (reason) => manager.emit("disconnect", { socket, socket_id: socket.id, data: reason }));
        socket.on("reconnect", (data) => manager.emit("connect", { socket, socket_id: socket.id, data }));
        socket.on("signin", (data) => manager.emit("signin", { socket, socket_id: socket.id, data }));
        socket.on("signout", (data) => manager.emit("signout", { socket, socket_id: socket.id, data }));
        socket.on("subscribe", (data) => manager.emit("subscribe", { socket, socket_id: socket.id, data }));
        socket.on("unsubscribe", (data) => manager.emit("unsubscribe", { socket, socket_id: socket.id, data }));
        socket.on("query-unsubscribe", (data) => manager.emit("query-unsubscribe", { socket, socket_id: socket.id, data }));
        socket.on("query_unsubscribe", (data) => manager.emit("query-unsubscribe", { socket, socket_id: socket.id, data }));
    });
    return manager;
};
//# sourceMappingURL=socket.io.js.map