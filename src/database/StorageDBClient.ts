import { Api, ID, SchemaDefinition, Transport, Types } from "ivipbase-core";
import type { DataBase } from ".";
import _request from "../controller/request";
import { NOT_CONNECTED_ERROR_MESSAGE } from "../controller/request/error";
import { IvipBaseApp } from "../app";
import { getAuth } from "../auth";

class PromiseTimeoutError extends Error {}
function promiseTimeout<T = any>(promise: Promise<T>, ms: number, comment?: string) {
	return new Promise<T>((resolve, reject) => {
		const timeout: NodeJS.Timeout = setTimeout(() => reject(new PromiseTimeoutError(`Promise ${comment ? `"${comment}" ` : ""}timed out after ${ms}ms`)), ms);
		function success(result: T) {
			clearTimeout(timeout);
			resolve(result);
		}
		promise.then(success).catch(reject);
	});
}

export class StorageDBClient extends Api {
	private _realtimeQueries: Record<string, { path: string; query: Types.Query; options: Types.QueryOptions; query_id: string; matchedPaths: string[] }> = {};
	readonly url: string;
	private readonly app: IvipBaseApp;

	constructor(readonly db: DataBase) {
		super();
		this.app = db.app;
		this.url = this.app.url.replace(/\/+$/, "");

		this.initialize();

		this.app.onConnect(async (socket) => {
			const subscribePromises = [] as Promise<void>[];

			for (const query_id in this._realtimeQueries) {
				const subscribeQuery = this._realtimeQueries[query_id];
				subscribePromises.push(
					new Promise<void>(async (resolve, reject) => {
						try {
							await this.app.websocketRequest(socket, "query-subscribe", subscribeQuery, this.db.name);
						} catch (err: any) {
							if (err.code === "access_denied" && !this.db.accessToken) {
								this.db.debug.error(
									`Could not subscribe to event "Query-Event" on path "${subscribeQuery.path}" because you are not signed in. If you added this event while offline and have a user access token, you can prevent this by using getAuth().signInWithToken(token) to automatically try signing in after connecting`,
								);
							} else {
								this.db.debug.error(err);
							}
						}
					}),
				);
			}

			this.db.subscriptions.forEach((event, path) => {
				subscribePromises.push(
					new Promise<void>(async (resolve, reject) => {
						try {
							await this.app.websocketRequest(socket, "subscribe", { path: path, event: event }, this.db.name);
						} catch (err: any) {
							if (err.code === "access_denied" && !this.db.accessToken) {
								this.db.debug.error(
									`Could not subscribe to event "${event}" on path "${path}" because you are not signed in. If you added this event while offline and have a user access token, you can prevent this by using getAuth().signInWithToken(token) to automatically try signing in after connecting`,
								);
							} else {
								this.db.debug.error(err);
							}
						}
					}),
				);
			});

			await Promise.all(subscribePromises);
		});

		this.app.ready(() => {
			this.app.socket?.on("data-event", (data: { event: string; path: string; subscr_path: string; val: any; context: any }) => {
				const val = Transport.deserialize(data.val);
				const context = data.context ?? {};
				context.acebase_event_source = "server";

				const isValid = this.db.subscriptions.hasValueSubscribersForPath(data.subscr_path);

				if (!isValid) {
					return;
				}

				this.db.subscriptions.trigger(data.event, data.subscr_path, data.path, val.previous, val.current, context);
			});

			this.app.socket?.on("query-event", (data: any) => {
				data = Transport.deserialize(data);
				const query = this._realtimeQueries[data.query_id];
				if (!query) {
					return;
				}

				let keepMonitoring = true;
				try {
					keepMonitoring = query.options?.eventHandler?.(data) !== false;
				} catch (err) {
					keepMonitoring = false;
				}
				if (keepMonitoring === false) {
					delete this._realtimeQueries[data.query_id];
					this.app.socket?.emit("query-unsubscribe", { dbName: this.db.database, query_id: data.query_id });
				}
			});
		});
	}

	get serverPingUrl() {
		return `/ping/${this.db.database}`;
	}

	private async initialize() {
		this.app.onConnect(async () => {
			await getAuth(this.db.database).initialize();
			await this.app.request({ route: this.serverPingUrl });
			this.db.emit("ready");
		}, true);
	}

	get isConnected() {
		return this.app.isConnected;
	}
	get isConnecting() {
		return this.app.isConnecting;
	}
	get connectionState() {
		return this.app.connectionState;
	}

	private async _request(options: {
		route: string;
		/**
		 * @default 'GET'
		 */
		method?: "GET" | "PUT" | "POST" | "DELETE";
		/**
		 * Data to post when method is PUT or POST
		 */
		data?: any;
		/**
		 * Context to add to PUT or POST requests
		 */
		context?: any;
		/**
		 * A method that overrides the default data receiving handler. Override for streaming.
		 */
		dataReceivedCallback?: (chunk: string) => void;
		/**
		 * A method that overrides the default data send handler. Override for streaming.
		 */
		dataRequestCallback?: (length: number) => string | Types.TypedArrayLike | Promise<string | Types.TypedArrayLike>;
		/**
		 * Whether to try the request even if there is no connection
		 * @default false
		 */
		ignoreConnectionState?: boolean;
		/**
		 * NEW Whether the returned object should contain an optionally returned context object.
		 * @default false
		 */
		includeContext?: boolean;
	}): Promise<any | { context: any; data: any }> {
		if (this.isConnected || options.ignoreConnectionState === true) {
			const auth = this.app.auth.get(this.db.database);
			try {
				const accessToken = auth?.currentUser?.accessToken;
				return await this.db.app.request({
					...options,
					accessToken,
				});
			} catch (err: any) {
				auth?.currentUser?.reload();
				if (this.isConnected && err.isNetworkError) {
					// This is a network error, but the websocket thinks we are still connected.
					this.db.debug.warn(`A network error occurred loading ${options.route}`);

					// Start reconnection flow
					// this._handleDetectedDisconnect(err);
				}

				// Rethrow the error
				throw err;
			}
		} else {
			// We're not connected. We can wait for the connection to be established,
			// or fail the request now. Because we have now implemented caching, live requests
			// are only executed if they are not allowed to use cached responses. Wait for a
			// connection to be established (max 1s), then retry or fail

			// if (!this.isConnecting || !this.settings.network?.realtime) {
			if (!this.isConnecting) {
				// We're currently not trying to connect, or not using websocket connection (normal connection logic is still used).
				// Fail now
				throw new Error(NOT_CONNECTED_ERROR_MESSAGE);
			}

			const connectPromise = new Promise<void>((resolve) => this.app.socket?.once("connect", resolve));
			await promiseTimeout(connectPromise, 1000, "Waiting for connection").catch((err) => {
				throw new Error(NOT_CONNECTED_ERROR_MESSAGE);
			});
			return this._request(options); // Retry
		}
	}

	public connect(retry = true) {}
	public disconnect() {}

	async subscribe(path: string, event: string, callback: Types.EventSubscriptionCallback, settings?: Types.EventSubscriptionSettings) {
		try {
			this.db.subscriptions.add(path, event, callback);
			await this.app.websocketRequest(this.app.socket, "subscribe", { path: path, event: event }, this.db.name);
		} catch (err: any) {
			this.db.debug.error(err);
		}
	}

	async unsubscribe(path: string, event?: string, callback?: Types.EventSubscriptionCallback) {
		try {
			this.db.subscriptions.remove(path, event, callback);
			await this.app.websocketRequest(this.app.socket, "unsubscribe", { path: path, event: event }, this.db.name);
		} catch (err: any) {
			this.db.debug.error(err);
		}
	}

	async getInfo(): Promise<{
		dbname: string;
		version: string;
		time: number;
		process: number;
		platform?: NodeJS.Platform;
		arch?: string;
		release?: string;
		host?: string;
		uptime?: string;
		load?: number[];
		mem?: {
			total: string;
			free: string;
			process: {
				arrayBuffers: string;
				external: string;
				heapTotal: string;
				heapUsed: string;
				residentSet: string;
			};
		};
		cpus?: any;
		network?: any;
		data?: Array<{
			cpuUsage: number;
			networkStats: {
				sent: number;
				received: number;
			};
			memoryUsage: { total: number; free: number; used: number };
			timestamp: number;
		}>;
	}> {
		return await this._request({ route: `/info/${this.db.database}` });
	}

	async stats(): Promise<{
		writes: number;
		reads: number;
		bytesRead: number;
		bytesWritten: number;
	}> {
		return this._request({ route: `/stats/${this.db.database}` });
	}

	async set(
		path: string,
		value: any,
		options: {
			suppress_events?: boolean;
			context?: any;
		} = {
			suppress_events: true,
			context: {},
		},
	): Promise<{ cursor?: string }> {
		const data = JSON.stringify(Transport.serialize(value));
		const { context } = await this._request({ method: "PUT", route: `/data/${this.db.database}/${path}`, data, context: options.context ?? {}, includeContext: true });
		const cursor = context?.database_cursor as string | undefined;
		return { cursor };
	}

	async update(
		path: string,
		updates: Record<string | number, any>,
		options: {
			suppress_events?: boolean;
			context?: any;
		} = {
			suppress_events: true,
			context: {},
		},
	): Promise<{ cursor?: string }> {
		const data = JSON.stringify(Transport.serialize(updates));
		const { context } = await this._request({ method: "POST", route: `/data/${this.db.database}/${path}`, data, context: options.context, includeContext: true });
		const cursor = context?.database_cursor as string | undefined;
		return { cursor };
	}

	async transaction(
		path: string,
		callback: (currentValue: any) => Promise<any>,
		options: {
			suppress_events?: boolean;
			context?: any;
		} = {
			suppress_events: false,
			context: null,
		},
	) {
		const { value, context } = await this.get(path, { child_objects: true });
		const newValue = await Promise.race([callback(value ?? null)]);
		return this.update(path, newValue, { suppress_events: options.suppress_events, context: options.context });
	}

	async get(
		path: string,
		options?: {
			include?: string[];
			exclude?: string[];
			child_objects?: boolean;
		},
	): Promise<{ value: any; context: any; cursor?: string }> {
		let filtered = false,
			url = "";
		if (options) {
			const query = [] as string[];
			if (options.exclude instanceof Array) {
				query.push(`exclude=${options.exclude.join(",")}`);
			}
			if (options.include instanceof Array) {
				query.push(`include=${options.include.join(",")}`);
			}
			if (typeof options.child_objects === "boolean") {
				query.push(`child_objects=${options.child_objects}`);
			}
			if (query.length > 0) {
				filtered = true;
				url += `?${query.join("&")}`;
			}
		}
		const { data, context } = await this._request({ route: `/data/${this.db.database}/${path}${url}`, context: options, includeContext: true });
		return { value: Transport.deserialize(data), context, cursor: context?.database_cursor as string | undefined };
	}

	exists(path: string): Promise<boolean> {
		return this._request({ route: `/exists/${this.db.database}/${path}` });
	}

	async query(path: string, query: Types.Query, options: Types.QueryOptions = { snapshots: false, monitor: { add: false, change: false, remove: false } }): ReturnType<Api["query"]> {
		const request: { query: Types.Query; options: Types.QueryOptions; query_id?: string; client_id?: string } = {
			query,
			options,
		};

		const containsRealtime =
			(options.monitor === true || (typeof options.monitor === "object" && (options.monitor.add || options.monitor.change || options.monitor.remove))) &&
			typeof options.eventHandler === "function";

		if (options.monitor === true || (typeof options.monitor === "object" && (options.monitor.add || options.monitor.change || options.monitor.remove))) {
			console.assert(typeof options.eventHandler === "function", `no eventHandler specified to handle realtime changes`);
			if (!this.app.socket) {
				throw new Error(`Cannot create realtime query because websocket is not connected. Check your AceBaseClient network.realtime setting`);
			}
			request.query_id = ID.generate();
			request.client_id = this.app.id;
			this._realtimeQueries[request.query_id] = { path, query_id: request.query_id as string, query, options: { ...options, eventHandler: undefined }, matchedPaths: [] };
		}

		const reqData = JSON.stringify(Transport.serialize(request));

		try {
			const { data, context } = await this._request({ method: "POST", route: `/query/${this.db.database}/${path}`, data: reqData, includeContext: true });
			const { list, isMore } = Transport.deserialize(data);
			let socketSend: Promise<void> | undefined;

			if (containsRealtime && typeof request.query_id === "string") {
				this._realtimeQueries[request.query_id].matchedPaths = (list as any).map((n: any) => n.path) as any;
				socketSend = this.app.websocketRequest(this.app.socket, "query-subscribe", this._realtimeQueries[request.query_id], this.db.name);
			}

			const stop = async () => {
				if (!containsRealtime && socketSend !== undefined) {
					return;
				}
				await socketSend;
				delete this._realtimeQueries[request.query_id as string];
				await this.app.websocketRequest(this.app.socket, "query-unsubscribe", { query_id: request.query_id as string }, this.db.name);
			};

			return { results: list, context, stop, isMore } as any;
		} catch (err) {
			if (typeof request.query_id === "string" && request.query_id in this._realtimeQueries) {
				delete this._realtimeQueries[request.query_id];
			}
			throw err;
		}
	}

	reflect(path: string, type: "info" | "children", args: any) {
		let route = `/reflect/${this.db.database}/${path}?type=${type}`;
		if (typeof args === "object") {
			const query = Object.keys(args).map((key) => {
				return `${key}=${args[key]}`;
			});
			if (query.length > 0) {
				route += `&${query.join("&")}`;
			}
		}
		return this._request({ route });
	}

	export(
		path: string,
		write: Types.StreamWriteFunction,
		options: {
			format?: "json";
			type_safe?: boolean;
		} = { format: "json", type_safe: true },
	): ReturnType<Api["export"]> {
		options.format = "json";
		options.type_safe = options.type_safe !== false;
		const route = `/export/${this.db.database}/${path}?format=${options.format}&type_safe=${options.type_safe ? 1 : 0}`;
		return this._request({ route, dataReceivedCallback: (chunk) => write(chunk) }) as ReturnType<Api["export"]>;
	}

	import(
		path: string,
		read: Types.StreamReadFunction,
		options: {
			format?: "json";
			suppress_events?: boolean;
			method?: "set" | "update" | "merge";
		} = { format: "json", suppress_events: false },
	) {
		options.format = "json";
		options.suppress_events = options.suppress_events === true;
		const route = `/import/${this.db.database}/${path}?format=${options.format}&suppress_events=${options.suppress_events ? 1 : 0}`;
		return this._request({ method: "POST", route, dataRequestCallback: (length) => read(length) });
	}

	async getServerInfo() {
		const info = await this._request({ route: `/info/${this.db.database}` }).catch((err) => {
			// Prior to acebase-server v0.9.37, info was at /info (no dbname attached)
			if (!err.isNetworkError) {
				this.db.debug.warn(`Could not get server info, update your acebase server version`);
			}
			return { version: "unknown", time: Date.now() };
		});
		return info;
	}

	setSchema(path: string, schema: string | Record<string, any>, warnOnly = false) {
		if (schema !== null) {
			schema = new SchemaDefinition(schema).text;
		}
		const data = JSON.stringify({ action: "set", path, schema, warnOnly });
		return this._request({ method: "POST", route: `/schema/${this.db.database}`, data });
	}

	getSchema(path: string) {
		return this._request({ route: `/schema/${this.db.database}/${path}` });
	}

	getSchemas() {
		return this._request({ route: `/schema/${this.db.database}` });
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async validateSchema(path: string, value: any, isUpdate: boolean): ReturnType<Api["validateSchema"]> {
		throw new Error(`Manual schema validation can only be used on standalone databases`);
	}
}
