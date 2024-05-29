import { DebugLogger, ID, SimpleEventEmitter } from "ivipbase-core";
import { DataBase } from "../database";

const masterPeerId = "[master]";

export class AIvipBaseIPCPeerExitingError extends Error {
	constructor(message: string) {
		super(`Exiting: ${message}`);
	}
}

export abstract class IvipBaseIPCPeer extends SimpleEventEmitter {
	readonly debug: DebugLogger;
	protected masterPeerId: string = masterPeerId;
	protected ipcType = "ipc";
	public get isMaster() {
		return this.masterPeerId === this.id;
	}

	protected ipcDatabases = new Map<string, DataBase>();

	protected ourSubscriptions: { [dbname: string]: Array<{ path: string; event: IvipBaseEventType; callback: IvipBaseSubscribeCallback }> } = {};
	protected remoteSubscriptions: { [dbname: string]: Array<{ for?: string; path: string; event: IvipBaseEventType; callback: IvipBaseSubscribeCallback }> } = {};
	protected peers: Array<{ id: string; lastSeen: number; dbname: string }> = [];

	protected _exiting = false;
	private _eventsEnabled = true;
	private _requests: Map<string, { resolve: (result: any) => void; reject: (err: Error) => void; request: IRequestMessage }> = new Map();

	constructor(protected id: string, protected name: string) {
		super();

		this.debug = new DebugLogger("verbose", `[${name}]`);
	}

	public addDatabase(db: DataBase) {
		if (this.ipcDatabases.has(db.name)) {
			return;
		}

		const dbname = db.name;

		this.ipcDatabases.set(dbname, db);

		// Setup db event listeners
		db.subscriptions.on("subscribe", (subscription: { path: string; event: string; callback: IvipBaseSubscribeCallback }) => {
			// Subscription was added to db

			db.debug.verbose(`database subscription being added on peer ${this.id}`);

			const remoteSubscription = this.remoteSubscriptions[dbname]?.find((sub) => sub.callback === subscription.callback);
			if (remoteSubscription) {
				// Send ack
				// return sendMessage({ type: 'subscribe_ack', from: tabId, to: remoteSubscription.for, data: { path: subscription.path, event: subscription.event } });
				return;
			}

			const othersAlreadyNotifying = this.ourSubscriptions[dbname]?.some((sub) => sub.event === subscription.event && sub.path === subscription.path);

			// Add subscription
			this.ourSubscriptions[dbname]?.push(subscription);

			if (othersAlreadyNotifying) {
				// Same subscription as other previously added. Others already know we want to be notified
				return;
			}

			// Request other tabs to keep us updated of this event
			const message: ISubscribeMessage = { type: "subscribe", from: this.id, data: { path: subscription.path, event: subscription.event }, dbname };
			this.sendMessage(dbname, message);
		});

		db.subscriptions.on("unsubscribe", (subscription: { path: string; event?: string; callback?: IvipBaseSubscribeCallback }) => {
			// Subscription was removed from db

			const remoteSubscription = this.remoteSubscriptions[dbname]?.find((sub) => sub.callback === subscription.callback);
			if (remoteSubscription) {
				// Remove
				this.remoteSubscriptions[dbname]?.splice(this.remoteSubscriptions[dbname]?.indexOf(remoteSubscription), 1);
				// Send ack
				// return sendMessage({ type: 'unsubscribe_ack', from: tabId, to: remoteSubscription.for, data: { path: subscription.path, event: subscription.event } });
				return;
			}

			this.ourSubscriptions[dbname]
				?.filter((sub) => sub.path === subscription.path && (!subscription.event || sub.event === subscription.event) && (!subscription.callback || sub.callback === subscription.callback))
				.forEach((sub) => {
					// Remove from our subscriptions
					this.ourSubscriptions[dbname]?.splice(this.ourSubscriptions[dbname]?.indexOf(sub), 1);

					// Request other tabs to stop notifying
					const message: IUnsubscribeMessage = { type: "unsubscribe", from: this.id, data: { path: sub.path, event: sub.event }, dbname };
					this.sendMessage(dbname, message);
				});
		});

		// Send hello to other peers
		const helloMsg: IHelloMessage = { type: "hello", from: this.id, data: undefined, dbname };
		this.sendMessage(dbname, helloMsg);
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
		const dbnames = Array.from(this.ipcDatabases.keys());
		for (const dbname of dbnames) {
			this.sayGoodbye(dbname, this.id);
		}

		this.debug.warn(`${this.isMaster ? "Master" : "Worker " + this.id} will now exit`);
		this.emitOnce("exit", code);
	}

	protected sayGoodbye(dbname: string, forPeerId: string) {
		// Send "bye" message on their behalf
		const bye: IByeMessage = { type: "bye", from: forPeerId, data: undefined, dbname };
		this.sendMessage(dbname, bye);
	}

	protected addPeer(dbname: string, id: string, sendReply = true) {
		if (this._exiting) {
			return;
		}
		const peer = this.peers.find((w) => w.id === id && w.dbname === dbname);
		if (!peer) {
			this.peers.push({ id, lastSeen: Date.now(), dbname });
		}

		if (sendReply) {
			// Send hello back to sender
			const helloMessage: IHelloMessage = { type: "hello", from: this.id, to: id, data: undefined, dbname };
			this.sendMessage(dbname, helloMessage);

			// Send our active subscriptions through
			this.ourSubscriptions[dbname]?.forEach((sub) => {
				// Request to keep us updated
				const message: ISubscribeMessage = { type: "subscribe", from: this.id, to: id, data: { path: sub.path, event: sub.event }, dbname };
				this.sendMessage(dbname, message);
			});
		}
	}

	protected removePeer(dbname: string, id: string, ignoreUnknown = false) {
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
		const subscriptions = this.remoteSubscriptions[dbname]?.filter((sub) => sub.for === id);
		subscriptions.forEach((sub) => {
			if (Array.isArray(this.remoteSubscriptions[dbname])) {
				this.remoteSubscriptions[dbname].splice(this.remoteSubscriptions[dbname].indexOf(sub), 1);
			}
			db?.subscriptions.remove(sub.path, sub.event, sub.callback as any);
		});
	}

	protected addRemoteSubscription(dbname: string, peerId: string, details: ISubscriptionData) {
		if (this._exiting) {
			return;
		}
		// this.storage.debug.log(`remote subscription being added`);

		if (Array.isArray(this.remoteSubscriptions[dbname]) && this.remoteSubscriptions[dbname].some((sub) => sub.for === peerId && sub.event === details.event && sub.path === details.path)) {
			// We're already serving this event for the other peer. Ignore
			return;
		}

		// Add remote subscription
		const subscribeCallback = (err: Error | null, path: string, val: any, previous: any, context: any) => {
			// db triggered an event, send notification to remote subscriber
			const eventMessage: IEventMessage = {
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
		db?.subscriptions.add(details.path, details.event, subscribeCallback);
	}

	protected cancelRemoteSubscription(dbname: string, peerId: string, details: ISubscriptionData) {
		// Other tab requests to remove previously subscribed event
		const sub = this.remoteSubscriptions[dbname]?.find((sub) => sub.for === peerId && sub.event === details.event && sub.path === details.event);
		if (!sub) {
			// We don't know this subscription so we weren't notifying in the first place. Ignore
			return;
		}

		// Stop subscription
		const db = this.ipcDatabases.get(dbname);
		db?.subscriptions.remove(details.path, details.event, sub.callback as any);
	}

	protected async handleMessage(message: IMessage) {
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
				const eventMessage = message as IEventMessage;
				const context = eventMessage.data.context || {};
				context.database_ipc = { type: this.ipcType, origin: eventMessage.from }; // Add IPC details

				// Other peer raised an event we are monitoring
				const subscriptions = this.ourSubscriptions[dbname]?.filter((sub) => sub.event === eventMessage.event && sub.path === eventMessage.path);
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
		let resolve: any, reject: any;
		const promise = new Promise((rs, rj) => {
			resolve = (result: any) => {
				this._requests.delete(req.id);
				rs(result);
			};
			reject = (err: Error) => {
				this._requests.delete(req.id);
				rj(err);
			};
		});
		this._requests.set(req.id, { resolve, reject, request: req });
		this.sendMessage(req.dbname, req);
		return promise;
	}

	protected abstract sendMessage(dbname: string, message: IMessage): any;

	/**
	 * Sends a custom request to the IPC master
	 * @param request
	 * @returns
	 */
	public sendRequest(dbname: string, request: any) {
		const req: ICustomRequestMessage = { type: "request", from: this.id, to: this.masterPeerId, id: ID.generate(), data: request, dbname };
		return this.request(req).catch((err) => {
			this.debug.error(err);
			throw err;
		});
	}

	public replyRequest(dbname: string, requestMessage: IRequestMessage, result: any) {
		const reply: IResponseMessage = { type: "result", id: requestMessage.id, ok: true, from: this.id, to: requestMessage.from, data: result, dbname };
		this.sendMessage(dbname, reply);
	}

	/**
	 * Sends a custom notification to all IPC peers
	 * @param notification
	 * @returns
	 */
	public sendNotification(dbname: string, notification: any) {
		const msg: ICustomNotificationMessage = { type: "notification", from: this.id, data: notification, dbname };
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
	set eventsEnabled(enabled: boolean) {
		this.debug.log(`ipc events ${enabled ? "enabled" : "disabled"}`);
		this._eventsEnabled = enabled;
	}
}

export type IvipBaseSubscribeCallback = (error: Error | null, path: string, newValue: any, oldValue: any, eventContext: any) => void;

export interface IMessage {
	/**
	 * name of the target database. Needed when multiple database use the same communication channel
	 */
	dbname: string;
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

export interface IPulseMessage extends IMessage {
	type: "pulse";
	data: void;
}

export interface ICustomNotificationMessage extends IMessage {
	type: "notification";
	data: any;
}

export type IvipBaseEventType = string; //'value' | 'child_added' | 'child_changed' | 'child_removed' | 'mutated' | 'mutations' | 'notify_value' | 'notify_child_added' | 'notify_child_changed' | 'notify_child_removed' | 'notify_mutated' | 'notify_mutations'

export interface ISubscriptionData {
	path: string;
	event: IvipBaseEventType;
}

export interface ISubscribeMessage extends IMessage {
	type: "subscribe";
	data: ISubscriptionData;
}

export interface IUnsubscribeMessage extends IMessage {
	type: "unsubscribe";
	data: ISubscriptionData;
}

export interface IEventMessage extends IMessage {
	type: "event";
	event: IvipBaseEventType;
	/**
	 * Path the subscription is on
	 */
	path: string;
	data: {
		/**
		 * The path the event fires on
		 */
		path: string;
		val?: any;
		previous?: any;
		context: any;
	};
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
