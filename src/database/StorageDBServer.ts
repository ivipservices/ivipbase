import { Api, PathInfo, Types, Utils } from "ivipbase-core";
import { VALUE_TYPES } from "../controller/storage/MDE";
import type { DataBase } from ".";
import { removeNulls } from "../utils";
import executeQuery from "../controller/executeQuery";
import { isJson } from "ivip-utils";

export class StorageDBServer extends Api {
	public cache: { [path: string]: any } = {};

	constructor(readonly db: DataBase) {
		super();

		this.db.app.storage.ready(() => {
			this.db.emit("ready");
		});
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
		return {
			dbname: this.db.database,
			version: "",
			time: Date.now(),
			process: process.pid,
		};
	}

	async stats(): Promise<{
		writes: number;
		reads: number;
		bytesRead: number;
		bytesWritten: number;
	}> {
		return {
			writes: 0,
			reads: 0,
			bytesRead: 0,
			bytesWritten: 0,
		};
	}

	subscribe(path: string, event: string, callback: Types.EventSubscriptionCallback, settings?: Types.EventSubscriptionSettings) {
		this.db.subscriptions.add(path, event, callback);
	}

	unsubscribe(path: string, event?: string, callback?: Types.EventSubscriptionCallback) {
		this.db.subscriptions.remove(path, event, callback);
	}

	async set(path: string, value: any, options?: any): Promise<{ cursor?: string | undefined }> {
		await this.db.app.storage.set(this.db.database, path, value);
		return {};
	}

	async get(
		path: string,
		options?: {
			include?: string[];
			exclude?: string[];
		},
	): Promise<{ value: any; context: any; cursor?: string }> {
		if (!options) {
			options = {};
		}
		if (typeof options.include !== "undefined" && !(options.include instanceof Array)) {
			throw new TypeError(`options.include must be an array of key names`);
		}
		if (typeof options.exclude !== "undefined" && !(options.exclude instanceof Array)) {
			throw new TypeError(`options.exclude must be an array of key names`);
		}

		const value = await this.db.app.storage.get(this.db.database, path, options);
		return { value, context: { more: false } };
	}

	async update(path: string, updates: any, options?: any): Promise<{ cursor?: string | undefined }> {
		await this.db.app.storage.update(this.db.database, path, updates);
		return {};
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
		const cursor = await this.db.app.storage.transact(this.db.database, path, callback, { suppress_events: options.suppress_events, context: options.context });
		return { ...(cursor && { cursor }) };
	}

	async exists(path: string) {
		return await this.db.app.storage.isPathExists(this.db.database, path);
	}

	async query(
		path: string,
		query: Types.Query,
		options: Types.QueryOptions = { snapshots: false },
	): Promise<{
		results:
			| Array<{
					path: string;
					val: any;
			  }>
			| string[];
		context: any;
		stop(): Promise<void>;
	}> {
		const results = await executeQuery(this.db, path, query, options);
		return results;
	}

	async export(path: string, stream: Types.StreamWriteFunction, options?: { format?: "json"; type_safe?: boolean }): Promise<void> {
		if (options?.format !== "json") {
			throw new Error("Only json output is currently supported");
		}

		const data = await this.get(path);
		const json = JSON.stringify(data.value, null, 4);

		for (let i = 0; i < json.length; i += 1000) {
			await stream(json.slice(i, i + 1000));
		}
	}

	async import(
		path: string,
		read: Types.StreamReadFunction,
		options?: {
			format?: "json";
			suppress_events?: boolean;
			method?: "set" | "update" | "merge";
		},
	): Promise<void> {
		const chunkSize = 256 * 1024; // 256KB
		const json = await read(chunkSize);
		const method = options?.method ?? "update";
		options = { ...(options || {}), method };

		if (typeof json !== "string" || !isJson(json)) {
			return;
		}

		const value = JSON.parse(json as any);

		if (method === "set") {
			this.db.app.storage.set(this.db.database, path, value, options);
		} else {
			this.db.app.storage.update(this.db.database, path, value, options);
		}

		return;

		const resolveObject = async (path: string, obj: any) => {
			await new Promise((resolve) => setTimeout(resolve, 0));
			const isArray = Array.isArray(obj);

			const oltValue: any = isArray ? [] : {};
			const resolveBy: Array<string | number> = [];

			for (const k in obj) {
				const key = isArray ? parseInt(k) : k;
				if (["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(obj[key]))) {
					resolveBy.push(key);
				}
				oltValue[key] = Array.isArray(obj[key]) ? [] : typeof obj[key] === "object" && obj[key] !== null ? {} : obj[key];
			}

			console.log(path, oltValue);

			if (Object.keys(oltValue).length > 0) {
				if (method === "set") {
					await this.db.app.storage.set(this.db.database, path, oltValue, options);
				} else {
					await this.db.app.storage.update(this.db.database, path, oltValue, options);
				}
			}

			for (const key of resolveBy) {
				const value: any = (obj as any)[key as string | number];
				const newPath = PathInfo.get([path, key]).path;
				await resolveObject(newPath, value);
			}
		};

		if (["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(value))) {
			await resolveObject(path, value);
		} else {
			if (method === "set") {
				await this.db.app.storage.set(this.db.database, path, value, options);
			} else {
				await this.db.app.storage.update(this.db.database, path, value, options);
			}
		}

		return;
	}

	reflect(path: string, type: "children", args: any): Promise<Types.ReflectionChildrenInfo>;
	reflect(path: string, type: "info", args: any): Promise<Types.ReflectionNodeInfo>;
	async reflect(path: string, type: Types.ReflectionType, args: any): Promise<any> {
		args = args || {};

		const getChildren = async (path: string, limit = 50, skip = 0, from: string | null | undefined = null) => {
			if (typeof limit === "string") {
				limit = parseInt(limit);
			}
			if (typeof skip === "string") {
				skip = parseInt(skip);
			}
			if (["null", "undefined", null, undefined].includes(from)) {
				from = null;
			}
			const children = [] as Types.ReflectionChildrenInfo["list"]; // Array<{ key: string | number; type: string; value: any; address?: any }>;
			let n = 0,
				stop = false,
				more = false; //stop = skip + limit,
			await this.db.app.storage
				.getChildren(this.db.database, path)
				.next((childInfo) => {
					if (stop) {
						// Stop 1 child too late on purpose to make sure there's more
						more = true;
						return false; // Stop iterating
					}
					n++;
					const include = from !== null && childInfo.key ? childInfo.key > from : skip === 0 || n > skip;
					if (include) {
						children.push(
							removeNulls({
								key: (typeof childInfo.key === "string" ? childInfo.key : childInfo.index) ?? "",
								type: (childInfo.valueTypeName as any) ?? "unknown",
								value: childInfo.value ?? null,
								// address is now only added when storage is acebase. Not when eg sqlite, mssql
								...(typeof childInfo.address === "object" && {
									address: childInfo.address,
								}),
							}),
						);
					}
					stop = limit > 0 && children.length === limit;
				})
				.catch((err) => {
					throw err;
				});
			return {
				more,
				list: children,
			} as Types.ReflectionChildrenInfo;
		};

		switch (type) {
			case "children": {
				const result: Types.ReflectionChildrenInfo = await getChildren(path, args.limit, args.skip, args.from);
				return result;
			}
			case "info": {
				const info: Types.ReflectionNodeInfo = {
					key: "" as string | number,
					exists: false,
					type: "unknown",
					value: undefined as any,
					address: undefined as any,
					children: {
						count: 0,
						more: false,
						list: [],
					},
				};

				const nodeInfo = await this.db.app.storage.getInfoBy(this.db.database, path, { include_child_count: args.child_count === true });

				info.key = (typeof nodeInfo.key !== "undefined" ? nodeInfo.key : nodeInfo.index) ?? "";
				info.exists = nodeInfo.exists ?? false;
				info.type = (nodeInfo.exists ? (nodeInfo.valueTypeName as any) : undefined) ?? "unknown";
				if (![VALUE_TYPES.OBJECT, VALUE_TYPES.ARRAY].includes(nodeInfo.type ?? 0)) {
					info.value = nodeInfo.value;
				}
				info.address = typeof nodeInfo.address === "object" ? nodeInfo.address : undefined;
				const isObjectOrArray = nodeInfo.exists && ([VALUE_TYPES.OBJECT, VALUE_TYPES.ARRAY] as number[]).includes(nodeInfo.type ?? 0);

				if (args.child_count === true) {
					info.children = { count: isObjectOrArray ? nodeInfo.childCount ?? 0 : 0 };
				} else if (typeof args.child_limit === "number" && args.child_limit > 0) {
					if (isObjectOrArray) {
						info.children = await getChildren(path, args.child_limit, args.child_skip, args.child_from);
					}
				}

				return info;
			}
		}
	}

	setSchema(path: string, schema: Record<string, any> | string, warnOnly?: boolean) {
		return new Promise<void>((resolve, reject) => {
			resolve(this.db.app.storage.setSchema(this.db.database, path, schema, warnOnly));
		});
	}

	getSchema(path: string) {
		return new Promise<Types.SchemaInfo>((resolve, reject) => {
			resolve(this.db.app.storage.getSchema(this.db.database, path));
		});
	}

	async getSchemas() {
		return new Promise<Types.SchemaInfo[]>((resolve, reject) => {
			resolve(this.db.app.storage.getSchemas(this.db.database));
		});
	}

	validateSchema(path: string, value: any, isUpdate: boolean) {
		return new Promise<Types.ISchemaCheckResult>((resolve, reject) => {
			resolve(this.db.app.storage.validateSchema(this.db.database, path, value, { updates: isUpdate }));
		});
	}
}
