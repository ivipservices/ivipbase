import type { Socket } from "socket.io";
import { WebSocketManager } from "./manager";
import { LocalServer } from "..";
export type SocketType = Socket;
export declare class SocketIOManager extends WebSocketManager<Socket> {
    constructor();
    disconnect(socket: Socket): void;
    send(socket: Socket, event: string, message?: any): void;
}
export declare const createServer: (env: LocalServer) => SocketIOManager;
//# sourceMappingURL=socket.io.d.ts.map