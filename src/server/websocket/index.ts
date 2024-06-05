import { LocalServer } from "..";
import { Transport, Types } from "ivipbase-core";
import { ConnectedClient } from "../shared/clients";
import { decodePublicAccessToken } from "../shared/tokens";
import { createServer, SocketType } from "./socket.io";

export class SocketRequestError extends Error {
	constructor(public code: string, message: string) {
		super(message);
	}
}

export const addWebsocketServer = (env: LocalServer) => {
	env.localApp.ipcReady((ipc) => {
		ipc.on("notification", (message) => {
			if (message.type === "websocket.userConnect") {
				env.emit("userConnect", {
					dbNames: message.dbNames,
					user: message.user,
				});
			} else if (message.type === "websocket.userDisconnect") {
				env.emit("userDisconnect", {
					dbNames: message.dbNames,
					user: message.user,
				});
			}
		});
	});

	// TODO: Allow using uWebSockets.js server instead of Socket.IO
	const serverManager = createServer(env);

	const getClientBySocketId = (id: string, event: string) => {
		const client = env.clients.get(id);
		if (!client) {
			env.debug.error(`Cannot find client "${id}" for socket event "${event}"`);
		}
		return !client || client.disconnected ? undefined : client;
	};

	serverManager.on("connect", (event) => {
		const client = new ConnectedClient(event.socket);
		env.clients.set(client.id, client);

		env.debug.warn(`New socket connected, total: ${env.clients.size}`);
		serverManager.send(event.socket, "welcome");

		env.localApp.ipc?.sendNotification({
			type: "websocket.userConnect",
			dbNames: event.dbNames,
			user: client.id,
		});

		env.emit("userConnect", {
			dbNames: event.dbNames,
			user: client.id,
		});
	});

	serverManager.on("disconnect", (event) => {
		// We lost one
		const client = getClientBySocketId(event.socket_id, "disconnect");
		if (!client) {
			return;
		} // Disconnected a client we did not know? Don't crash, just ignore.

		client.disconnected = true;

		for (const dbName in client.subscriptions) {
			const subscribedPaths = Object.keys(client.subscriptions[dbName]);
			if (subscribedPaths.length > 0) {
				// TODO: Substitute the original callbacks to cache them
				// if the client then reconnects within a certain time,
				// we can send the missed notifications
				//
				// subscribedPaths.forEach(path => {
				//     client.subscriptions[path].forEach(subscr => {
				//         subscr.callback
				//     })
				// });

				const remove: {
					path: string;
					event: string;
					callback: Types.EventSubscriptionCallback;
				}[] = [];

				subscribedPaths.forEach((path) => {
					remove.push(...client.subscriptions[dbName][path]);
				});

				remove.forEach((subscr) => {
					// Unsubscribe them at db level and remove from our list
					env.db(dbName).storage.unsubscribe(subscr.path, subscr.event, subscr.callback); //db.ref(subscr.path).off(subscr.event, subscr.callback);
					const pathSubs = client.subscriptions[dbName][subscr.path];
					if (pathSubs && pathSubs.length > 0 && pathSubs.includes(subscr)) {
						pathSubs.splice(pathSubs.indexOf(subscr), 1);
					}
				});
			}
		}

		env.clients.delete(client.id);
		env.debug.verbose(`Socket disconnected, total: ${env.clients.size}`);

		env.localApp.ipc?.sendNotification({
			type: "websocket.userDisconnect",
			dbNames: event.dbNames,
			user: client.id,
		});

		env.emit("userDisconnect", {
			dbNames: event.dbNames,
			user: client.id,
		});
	});

	serverManager.on("signin", (event) => {
		// client sends this request once user has been signed in, binds the user to the socket,
		// deprecated since client v0.9.4, which sends client_id with signin api call
		// const client = clients.get(socket.id);
		const client = getClientBySocketId(event.socket_id, "signin");
		if (!client) {
			return;
		}

		try {
			if (!event.data) {
				throw new SocketRequestError("missing_data", "Missing data");
			}

			if (!event.data.accessToken) {
				throw new SocketRequestError("missing_access_token", "Missing access token");
			}

			if (!event.data.dbName) {
				throw new SocketRequestError("missing_db_name", "Missing database name");
			}

			const tokenSalt = env.tokenSalt[event.data.dbName];

			if (!tokenSalt) {
				throw new SocketRequestError("missing_token_salt", "Missing token salt");
			}

			const uid = decodePublicAccessToken(event.data.accessToken, tokenSalt).uid;
			const user = env.authCache.get(uid) ?? undefined;
			if (user) {
				client.user.set(event.data.dbName, user);
			} else {
				client.user.delete(event.data.dbName);
			}
		} catch (err) {
			if (event.data && event.data.accessToken) {
				env.debug.error(`websocket: invalid access token passed to signin: ${event.data.accessToken}`);
			} else {
				env.debug.error(`websocket: invalid access token passed to signin (${(err as any).message})`);
			}
		}
	});

	serverManager.on("signout", (event) => {
		// deprecated since client v0.9.4, which sends client_id with signout api call
		// const client = clients.get(socket.id);
		const client = getClientBySocketId(event.socket_id, "signout");
		if (!client || !event.data) {
			return;
		}
		client.user.delete(event.data.dbName);
	});

	const acknowledgeRequest = (socket: SocketType, requestId: string) => {
		// Send acknowledgement
		serverManager.send(socket, "result", {
			success: true,
			req_id: requestId,
		});
	};

	const failRequest = (socket: SocketType, requestId: string, code: string) => {
		// Send error
		serverManager.send(socket, "result", {
			success: false,
			reason: code,
			req_id: requestId,
		});
	};

	serverManager.on("subscribe", async (event) => {
		// Client wants to subscribe to events on a node
		const client = getClientBySocketId(event.socket_id, "subscribe");
		if (!client || !event.data) {
			return;
		}

		const eventName = event.data.event;
		const subscriptionPath = event.data.path;
		const dbName = event.data.dbName;

		env.debug.verbose(`Client ${event.socket_id} subscribes to event "${eventName}" on path "/${subscriptionPath}"`);

		const isSubscribed = () =>
			client.subscriptions[dbName] && subscriptionPath in client.subscriptions[dbName] && client.subscriptions[dbName][subscriptionPath].some((s) => s.event === eventName);

		if (isSubscribed()) {
			return acknowledgeRequest(event.socket, event.data.req_id);
		}

		// Get client
		// const client = clients.get(socket.id);

		if (!(await env.rules(dbName).isOperationAllowed(client.user.get(dbName) ?? ({} as any), subscriptionPath, "get"))) {
			env.log.error("event.subscribe", "access_denied", { uid: client.user.get(dbName)?.uid ?? "anonymous", path: subscriptionPath });
			return failRequest(event.socket, event.data.req_id, "access_denied");
		}

		const callback = async (err: any, path: string, currentValue: any, previousValue: any, context: any) => {
			if (!isSubscribed()) {
				// Not subscribed anymore. Cancel sending
				return;
			}
			if (err || !event.data) {
				return;
			}
			if (!(await env.rules(dbName).isOperationAllowed(client.user.get(dbName) ?? ({} as any), path, "get", { value: currentValue, context }))) {
				// 'event', { eventName, subscriptionPath, currentValue, previousValue, context })
				if (!subscriptionPath.includes("*") && !subscriptionPath.includes("$")) {
					// Could potentially be very many callbacks, so
					// DISABLED: logRef.push({ action: `access_revoked`, uid: client.user ? client.user.uid : '-', path: subscriptionPath });
					// Only log when user subscribes again
					failRequest(event.socket, (event.data as any).req_id, "access_denied");
				}
				return;
			}
			const val = Transport.serialize({
				current: currentValue,
				previous: previousValue,
			});
			env.debug.verbose(`Sending data event "${eventName}" for path "/${path}" to client ${event.socket_id}`);
			// TODO: let large data events notify the client, then let them download the data manually so it doesn't have to be transmitted through the websocket
			serverManager.send(event.socket, "data-event", {
				subscr_path: subscriptionPath,
				path,
				event: eventName,
				val,
				context,
			});
		};

		let pathSubs = client.subscriptions[dbName]?.[subscriptionPath];
		if (!pathSubs) {
			if (!client.subscriptions[dbName]) {
				client.subscriptions[dbName] = {};
			}
			pathSubs = client.subscriptions[dbName][subscriptionPath] = [];
		}

		const subscr = { path: subscriptionPath, event: eventName, callback };
		pathSubs.push(subscr);

		env.db(dbName).storage.subscribe(subscriptionPath, eventName, callback);

		acknowledgeRequest(event.socket, event.data.req_id);
	});

	serverManager.on("unsubscribe", (event) => {
		// Client unsubscribes from events on a node
		const client = getClientBySocketId(event.socket_id, "unsubscribe");
		if (!client || !event.data) {
			return;
		}

		const eventName = event.data.event;
		const subscriptionPath = event.data.path;
		const dbName = event.data.dbName;

		env.debug.verbose(`Client ${event.socket_id} is unsubscribing from event "${eventName || "(any)"}" on path "/${subscriptionPath}"`);

		// const client = clients.get(socket.id);
		const pathSubs = client.subscriptions[dbName]?.[subscriptionPath];
		if (!pathSubs) {
			// We have no knowledge of any active subscriptions on this path
			return acknowledgeRequest(event.socket, event.data.req_id);
		}
		let remove = pathSubs;
		if (eventName) {
			// Unsubscribe from a specific event
			remove = pathSubs.filter((subscr) => subscr.event === eventName);
		}
		remove.forEach((subscr) => {
			if (!event.data) {
				return;
			}
			// Unsubscribe them at db level and remove from our list
			//this.debug.verbose(`   - unsubscribing from event ${subscr.event} with${subscr.callback ? "" : "out"} callback on path "${data.path}"`);
			env.db(dbName).storage.unsubscribe(subscr.path, subscr.event, subscr.callback); //db.api.unsubscribe(data.path, subscr.event, subscr.callback);
			pathSubs.splice(pathSubs.indexOf(subscr), 1);
		});
		if (pathSubs.length === 0 && client.subscriptions[dbName]) {
			// No subscriptions left on this path, remove the path entry
			delete client.subscriptions[dbName][subscriptionPath];
		}
		return acknowledgeRequest(event.socket, event.data.req_id);
	});

	serverManager.on("query-unsubscribe", (event) => {
		// Client unsubscribing from realtime query events
		const client = getClientBySocketId(event.socket_id, "query-unsubscribe");
		if (!client || !event.data) {
			return;
		}

		const dbName = event.data.dbName;

		env.debug.verbose(`Client ${event.socket_id} is unsubscribing from realtime query "${event.data.query_id}"`);
		// const client = clients.get(socket.id);
		if (dbName in client.realtimeQueries && event.data.query_id in client.realtimeQueries[dbName]) {
			delete client.realtimeQueries[dbName][event.data.query_id];
		}

		acknowledgeRequest(event.socket, event.data.req_id);
	});

	return serverManager;
};
