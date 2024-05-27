import { Api, SchemaDefinition, Transport, Types } from "ivipbase-core";
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
	public cache: { [path: string]: any } = {};
	readonly url: string;
	private readonly app: IvipBaseApp;
	private readonly auth: () => ReturnType<typeof getAuth> = () => {
		return getAuth(this.db.database);
	};

	constructor(readonly db: DataBase) {
		super();
		this.app = db.app;
		this.url = this.app.url.replace(/\/+$/, "");
		this.initialize();
	}

	get serverPingUrl() {
		return `/ping/${this.db.database}`;
	}

	private async initialize() {
		await getAuth(this.db.database).ready();
		await this.db.app.request({ route: this.serverPingUrl });
		this.db.emit("ready");
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
			try {
				const user = this.auth().currentUser;
				const accessToken = user ? await user.getIdToken() : undefined;
				return await this.db.app.request({
					...options,
					accessToken,
				});
			} catch (err: any) {
				this.auth().currentUser?.reload();
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

	subscribe(path: string, event: string, callback: Types.EventSubscriptionCallback, settings?: Types.EventSubscriptionSettings) {
		this.db.subscriptions.add(path, event, callback);
	}

	unsubscribe(path: string, event?: string, callback?: Types.EventSubscriptionCallback) {
		this.db.subscriptions.remove(path, event, callback);
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
		const { data, context } = await this._request({ route: `/data/${this.db.database}/${path}`, context: options, includeContext: true });
		return { value: Transport.deserialize(data), context, cursor: context?.database_cursor as string | undefined };
	}

	exists(path: string): Promise<boolean> {
		return this._request({ route: `/exists/${this.db.database}/${path}` });
	}

	async query(path: string, query: Types.Query, options: Types.QueryOptions = { snapshots: false }): ReturnType<Api["query"]> {
		const request: { query: Types.Query; options: Types.QueryOptions; query_id?: string; client_id?: string } = {
			query,
			options,
		};
		const reqData = JSON.stringify(Transport.serialize(request));
		const { data, context } = await this._request({ method: "POST", route: `/query/${this.db.database}/${path}`, data: reqData, includeContext: true });
		const results = Transport.deserialize(data);
		const stop = () => Promise.resolve();
		return { results: results.list, context, stop };
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
