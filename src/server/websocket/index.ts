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
	// TODO: Allow using uWebSockets.js server instead of Socket.IO
	const serverManager = createServer(env);

	const getClientBySocketId = (socket: SocketType, dbName: string, event: string, id?: string | undefined) => {
		let client = env.clients.get(`${dbName}_${socket.id}`);

		if (!client && socket.connected) {
			client = new ConnectedClient(socket, dbName, id);

			env.clients.set(`${client.dbName}_${client.id}`, client);
			env.debug.warn(`New socket connected, total: ${env.clients.size}`);
			serverManager.send(socket, "welcome");

			client = env.clients.get(`${client.dbName}_${socket.id}`);
		}

		if (client?.disconnected) {
			env.clients.delete(`${client.dbName}_${client.id}`);
		}

		return client?.disconnected ? undefined : client;
	};

	serverManager.on("disconnect", (event) => {
		// We lost one
		const client = getClientBySocketId(event.socket, event.dbName, "disconnect", event.socket_id);
		if (!client) {
			return;
		} // Disconnected a client we did not know? Don't crash, just ignore.

		client.disconnected = true;

		const subscribedPaths = Object.keys(client.subscriptions);
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
				remove.push(...client.subscriptions[path]);
			});

			remove.forEach((subscr) => {
				// Unsubscribe them at db level and remove from our list
				env.db(event.dbName).storage.unsubscribe(subscr.path, subscr.event, subscr.callback); //db.ref(subscr.path).off(subscr.event, subscr.callback);
				const pathSubs = client.subscriptions[subscr.path];
				pathSubs.splice(pathSubs.indexOf(subscr), 1);
			});
		}

		env.clients.delete(`${client.dbName}_${client.id}`);
		env.debug.verbose(`Socket disconnected, total: ${env.clients.size}`);
	});

	serverManager.on("signin", (event) => {
		// client sends this request once user has been signed in, binds the user to the socket,
		// deprecated since client v0.9.4, which sends client_id with signin api call
		// const client = clients.get(socket.id);
		const client = getClientBySocketId(event.socket, event.dbName, "signin", event.socket_id);
		if (!client) {
			return;
		}

		try {
			if (!event.data || !event.data.accessToken) {
				throw new SocketRequestError("missing_access_token", "Missing access token");
			}
			if (!env.tokenSalt) {
				throw new SocketRequestError("missing_token_salt", "Missing token salt");
			}

			const uid = decodePublicAccessToken(event.data.accessToken, env.tokenSalt as any).uid;
			client.user = env.authCache.get(uid) ?? undefined;
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
		const client = getClientBySocketId(event.socket, event.dbName, "signout", event.socket_id);
		if (!client) {
			return;
		}
		client.user = undefined;
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
		const client = getClientBySocketId(event.socket, event.dbName, "subscribe", event.socket_id);
		if (!client || !event.data) {
			return;
		}

		const eventName = event.data.event;
		const subscriptionPath = event.data.path;
		env.debug.verbose(`Client ${event.socket_id} subscribes to event "${eventName}" on path "/${subscriptionPath}"`);
		const isSubscribed = () => subscriptionPath in client.subscriptions && client.subscriptions[subscriptionPath].some((s) => s.event === eventName);
		if (isSubscribed()) {
			return acknowledgeRequest(event.socket, event.data.req_id);
		}

		// Get client
		// const client = clients.get(socket.id);

		if (!(await env.rules(event.dbName).isOperationAllowed(client.user ?? ({} as any), subscriptionPath, "get"))) {
			env.log.error("event.subscribe", "access_denied", { uid: client.user?.uid ?? "anonymous", path: subscriptionPath });
			return failRequest(event.socket, event.data.req_id, "access_denied");
		}

		const callback = async (err: any, path: string, currentValue: any, previousValue: any, context: any) => {
			if (!isSubscribed()) {
				// Not subscribed anymore. Cancel sending
				return;
			}
			if (err) {
				return;
			}
			if (!(await env.rules(event.dbName).isOperationAllowed(client.user ?? ({} as any), path, "get", { value: currentValue, context }))) {
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

		let pathSubs = client.subscriptions[subscriptionPath];
		if (!pathSubs) {
			pathSubs = client.subscriptions[subscriptionPath] = [];
		}

		const subscr = { path: subscriptionPath, event: eventName, callback };
		pathSubs.push(subscr);

		env.db(client.dbName).storage.subscribe(subscriptionPath, eventName, callback);

		acknowledgeRequest(event.socket, event.data.req_id);
	});

	serverManager.on("unsubscribe", (event) => {
		// Client unsubscribes from events on a node
		const client = getClientBySocketId(event.socket, event.dbName, "unsubscribe", event.socket_id);
		if (!client || !event.data) {
			return;
		}

		const eventName = event.data.event;
		const subscriptionPath = event.data.path;
		env.debug.verbose(`Client ${event.socket_id} is unsubscribing from event "${eventName || "(any)"}" on path "/${subscriptionPath}"`);

		// const client = clients.get(socket.id);
		const pathSubs = client.subscriptions[subscriptionPath];
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
			// Unsubscribe them at db level and remove from our list
			//this.debug.verbose(`   - unsubscribing from event ${subscr.event} with${subscr.callback ? "" : "out"} callback on path "${data.path}"`);
			env.db(client.dbName).storage.unsubscribe(subscr.path, subscr.event, subscr.callback); //db.api.unsubscribe(data.path, subscr.event, subscr.callback);
			pathSubs.splice(pathSubs.indexOf(subscr), 1);
		});
		if (pathSubs.length === 0) {
			// No subscriptions left on this path, remove the path entry
			delete client.subscriptions[subscriptionPath];
		}
		return acknowledgeRequest(event.socket, event.data.req_id);
	});

	serverManager.on("query-unsubscribe", (event) => {
		// Client unsubscribing from realtime query events
		const client = getClientBySocketId(event.socket, event.dbName, "query-unsubscribe", event.socket_id);
		if (!client || !event.data) {
			return;
		}

		env.debug.verbose(`Client ${event.socket_id} is unsubscribing from realtime query "${event.data.query_id}"`);
		// const client = clients.get(socket.id);
		delete client.realtimeQueries[event.data.query_id];

		acknowledgeRequest(event.socket, event.data.req_id);
	});

	return serverManager;
};
