import { DebugLogger, ID, SimpleEventEmitter, Types } from "ivipbase-core";

const masterPeerId = "[master]";

export class AIvipBaseIPCPeerExitingError extends Error {
	constructor(message: string) {
		super(`Exiting: ${message}`);
	}
}

interface TriggerEventsData {
	dbName: string;
	path: string;
	oldValue: any;
	newValue: any;
	options: Partial<{ tid: string | number; suppress_events: boolean; context: any }>;
}

export abstract class IvipBaseIPCPeer extends SimpleEventEmitter {
	readonly debug: DebugLogger;
	protected masterPeerId: string = masterPeerId;
	protected ipcType = "ipc";
	public get isMaster() {
		return this.masterPeerId === this.id;
	}

	protected peers: Array<{ id: string; lastSeen: number }> = [];

	protected _exiting = false;
	private _requests: Map<string, { resolve: (result: any) => void; reject: (err: Error) => void; request: IRequestMessage }> = new Map();

	constructor(protected id: string, protected name: string) {
		super();

		this.debug = new DebugLogger("verbose", `[${name}]`);

		const helloMsg: IHelloMessage = { type: "hello", from: this.id, data: undefined };
		this.sendMessage(helloMsg);
	}

	on<d = TriggerEventsData>(event: "triggerEvents", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
	on<d = undefined>(event: "exit", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
	on<d = any>(event: "notification", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
	on<d = ICustomRequestMessage>(event: "request", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
	on<d = IvipBaseIPCPeer>(event: "connect", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
	on(event: string, callback: any) {
		return super.on(event, callback as any);
	}

	emit(event: "triggerEvents", data: TriggerEventsData): this;
	emit(event: "exit", data: undefined): this;
	emit(event: "notification", data: any): this;
	emit(event: "request", data: IMessage): this;
	emit(event: "connect", data: IvipBaseIPCPeer): this;
	emit(event: string, data: any) {
		super.emit(event, data);
		return this;
	}

	/**
	 * Requests the peer to shut down. Resolves once its locks are cleared and 'exit' event has been emitted.
	 * Has to be overridden by the IPC implementation to perform custom shutdown tasks
	 * @param code optional exit code (eg one provided by SIGINT event)
	 */
	public async exit(code = 0) {
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

	protected sayGoodbye(forPeerId: string) {
		// Send "bye" message on their behalf
		const bye: IByeMessage = { type: "bye", from: forPeerId, data: undefined };
		this.sendMessage(bye);
	}

	protected addPeer(id: string, sendReply = true) {
		if (this._exiting) {
			return;
		}
		const peer = this.peers.find((w) => w.id === id);
		if (!peer) {
			this.peers.push({ id, lastSeen: Date.now() });
		}

		if (sendReply) {
			// Send hello back to sender
			const helloMessage: IHelloMessage = { type: "hello", from: this.id, to: id, data: undefined };
			this.sendMessage(helloMessage);
		}
	}

	protected removePeer(id: string, ignoreUnknown = false) {
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

	protected async handleMessage(message: IMessage) {
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
				const result = message as IResponseMessage;
				const request = this._requests.get(result.id);
				if (typeof request !== "object") {
					throw new Error(`Result of unknown request received`);
				}

				if (result.ok) {
					request.resolve(result.data);
				} else {
					request.reject(new Error(result.reason));
				}
			}
		}
	}

	private async request(req: IRequestMessage): Promise<any> {
		// Send request, return result promise
		let resolve: any, reject: any, timer: NodeJS.Timeout;
		const promise = new Promise((rs, rj) => {
			resolve = (result: any) => {
				if (this._requests.has(req.id) !== true) {
					return;
				}
				clearTimeout(timer);
				this._requests.delete(req.id);
				rs(result);
			};
			reject = (err: Error) => {
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

	protected abstract sendMessage(message: IMessage): any;

	public async sendRequest(request: any) {
		const req: ICustomRequestMessage = { type: "request", from: this.id, to: this.masterPeerId, id: ID.generate(), data: request };
		return await this.request(req).catch((err) => {
			this.debug.error(err);
			throw err;
		});
	}

	public replyRequest(requestMessage: IRequestMessage, result: any) {
		const reply: IResponseMessage = { type: "result", id: requestMessage.id, ok: true, from: this.id, to: requestMessage.from, data: result };
		this.sendMessage(reply);
	}

	public sendNotification(notification: any) {
		const msg: ICustomNotificationMessage = { type: "notification", from: this.id, data: notification };
		this.sendMessage(msg);
	}

	public sendTriggerEvents(
		dbname: string,
		path: string,
		oldValue: any,
		newValue: any,
		options: Partial<{
			tid: string | number;
			suppress_events: boolean;
			context: any;
		}> = {
			suppress_events: false,
			context: undefined,
		},
	) {
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

export interface IMessage {
	/**
	 * name of the target database. Needed when multiple database use the same communication channel
	 */
	dbname?: string;
	/**
	 * Message type, determines how to handle data
	 */
	type: string;
	/**
	 * Who sends this message
	 */
	from: string;
	/**
	 * Who is this message for (not present for broadcast messages)
	 */
	to?: string;
	/**
	 * Optional payload
	 */
	data?: any;
}

export interface IHelloMessage extends IMessage {
	type: "hello";
	data: void;
}

export interface IByeMessage extends IMessage {
	type: "bye";
	data: void;
}

export interface ICustomNotificationMessage extends IMessage {
	type: "notification";
	data: any;
}

export interface IRequestMessage extends IMessage {
	id: string;
}

export interface IResponseMessage extends IMessage {
	id: string;
	ok: boolean;
	reason?: string;
}

export interface ICustomRequestMessage extends IRequestMessage {
	type: "request";
	data?: any;
}
