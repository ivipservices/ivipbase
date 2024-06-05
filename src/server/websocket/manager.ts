import { SimpleEventEmitter, Types } from "ivipbase-core";

export type WebSocketEventData<SocketType, DataType = undefined> = {
	socket: SocketType;
	socket_id: string;
	data?: DataType;
	dbNames?: string[];
};
export type WebSocketEventCallback<SocketType, DataType = any> = (event: WebSocketEventData<SocketType, DataType>) => void;

export abstract class WebSocketManager<SocketType> extends SimpleEventEmitter {
	constructor(public readonly framework: string) {
		super();
	}

	abstract disconnect(socket: SocketType): any;
	abstract send(socket: SocketType, event: string, message: any): any;

	on(event: "connect", callback: WebSocketEventCallback<SocketType>): void;

	on(event: "disconnect", callback: WebSocketEventCallback<SocketType>): Types.SimpleEventEmitterProperty;

	on(event: "signin", callback: WebSocketEventCallback<SocketType, { dbName: string; accessToken: string }>): Types.SimpleEventEmitterProperty;
	on(event: "signout", callback: WebSocketEventCallback<SocketType, { dbName: string }>): Types.SimpleEventEmitterProperty;

	on(event: "subscribe", callback: WebSocketEventCallback<SocketType, { dbName: string; req_id: string; path: string; event: string }>): Types.SimpleEventEmitterProperty;
	on(event: "unsubscribe", callback: WebSocketEventCallback<SocketType, { dbName: string; req_id: string; path: string; event?: string }>): Types.SimpleEventEmitterProperty;

	on(event: "query-unsubscribe", callback: WebSocketEventCallback<SocketType, { dbName: string; req_id: string; query_id: string }>): Types.SimpleEventEmitterProperty;
	on(event: string, callback: any) {
		return super.on(event, callback as any);
	}

	emit(event: "connect", data: WebSocketEventData<SocketType>): this;
	emit(event: "disconnect", data: WebSocketEventData<SocketType, string>): this;

	emit(event: "signin", data: WebSocketEventData<SocketType, { accessToken: string }>): this;
	emit(event: "signout", data: WebSocketEventData<SocketType>): this;

	emit(event: "subscribe", data: WebSocketEventData<SocketType, { req_id: string; path: string; event: string }>): this;
	emit(event: "unsubscribe", data: WebSocketEventData<SocketType, { req_id: string; path: string; event?: string }>): this;

	emit(event: "query-unsubscribe", data: WebSocketEventData<SocketType, { req_id: string; query_id: string }>): this;

	emit(event: string, data: any) {
		super.emit(event, data);
		return this;
	}
}
