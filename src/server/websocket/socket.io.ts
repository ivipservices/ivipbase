import { Server as SocketIOServer } from "socket.io";
import type { ServerOptions as SocketIOServerOptions } from "socket.io";
const createSocketIOServer = (httpServer: any, options: Partial<SocketIOServerOptions>) => {
	return new SocketIOServer(httpServer, options);
};

import type { Socket } from "socket.io";
import { IncomingMessage } from "http";
import { WebSocketManager } from "./manager";
import { getCorsOptions } from "../middleware/cors";
import { LocalServer } from "..";
import { isJson } from "ivip-utils";

export type SocketType = Socket;
export class SocketIOManager extends WebSocketManager<Socket> {
	constructor() {
		super("Socket.IO");
	}
	disconnect(socket: Socket) {
		socket.disconnect(true);
	}
	send(socket: Socket, event: string, message?: any) {
		socket.emit(event, message);
	}
}

export const createServer = (env: LocalServer) => {
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
		const { protocol, host, port } = (socket.request as IncomingMessage).headers;
		const { query } = socket.handshake;

		let dbNames: string[] = [],
			id: string = socket.id;

		if (query && typeof query.dbNames === "string") {
			try {
				dbNames = JSON.parse(query.dbNames);
			} catch {}
		}

		if (query && typeof query.id === "string") {
			id = query.id;
		}

		manager.emit("connect", { socket, socket_id: socket.id, id, dbNames });

		socket.on("disconnect", (reason: any) => manager.emit("disconnect", { socket, socket_id: socket.id, id, data: reason, dbNames }));
		socket.on("reconnect", (data: any) => manager.emit("connect", { socket, socket_id: socket.id, id, data, dbNames }));

		socket.on("signin", (data: any) => manager.emit("signin", { socket, socket_id: socket.id, id, data, dbNames }));
		socket.on("signout", (data: any) => manager.emit("signout", { socket, socket_id: socket.id, id, data, dbNames }));

		socket.on("subscribe", (data: any) => manager.emit("subscribe", { socket, socket_id: socket.id, id, data, dbNames }));
		socket.on("unsubscribe", (data: any) => manager.emit("unsubscribe", { socket, socket_id: socket.id, id, data, dbNames }));

		socket.on("query-subscribe", (data: any) => manager.emit("query-subscribe", { socket, socket_id: socket.id, id, data, dbNames }));
		socket.on("query_subscribe", (data: any) => manager.emit("query-subscribe", { socket, socket_id: socket.id, id, data, dbNames }));

		socket.on("query-unsubscribe", (data: any) => manager.emit("query-unsubscribe", { socket, socket_id: socket.id, id, data, dbNames }));
		socket.on("query_unsubscribe", (data: any) => manager.emit("query-unsubscribe", { socket, socket_id: socket.id, id, data, dbNames }));
	});

	return manager;
};
