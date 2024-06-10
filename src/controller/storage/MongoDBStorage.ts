import { ID } from "ivipbase-core";
import { AppError, ERROR_FACTORY } from "../erros";
import { CustomStorage, CustomStorageSettings } from "./CustomStorage";
import { StorageNode, StorageNodeInfo, VALUE_TYPES } from "./MDE";
import { MongoClient, Collection, Db, MongoClientOptions } from "mongodb";
import { IvipBaseApp } from "../../app";

export class MongodbSettings {
	host: string = "localhost";
	port: number = 27017;
	database: string[] = ["root"];
	collection: string = "main-database";
	username: string | undefined;
	password: string | undefined;
	options: MongoClientOptions | undefined;
	mdeOptions: Partial<Omit<CustomStorageSettings, "getMultiple" | "setNode" | "removeNode">> = {};

	constructor(options: Partial<Omit<MongodbSettings, "database" | "collection">> = {}) {
		if (typeof options.host === "string") {
			this.host = options.host;
		}

		if (typeof options.port === "number") {
			this.port = options.port;
		}

		if (typeof options.username === "string") {
			this.username = options.username;
		}

		if (typeof options.password === "string") {
			this.password = options.password;
		}

		if (typeof options.options === "object") {
			this.options = options.options;
		}

		if (typeof options.mdeOptions === "object") {
			this.mdeOptions = options.mdeOptions;
		}
	}
}

let timer: NodeJS.Timeout;

export class MongodbStorage extends CustomStorage {
	protected isConnected: boolean = false;
	private options: MongodbSettings;
	private readonly client: MongoClient;
	private database: Record<
		string,
		{
			db: Db;
			collection: Collection<StorageNodeInfo>;
		}
	> = {};
	private pending: Record<string, Map<string, StorageNodeInfo & { refresh?: boolean; type?: "set" | "delete" }>> = {};
	private resolvingPending: boolean = false;

	constructor(database: string | string[], options: Partial<Omit<MongodbSettings, "database">>, app: IvipBaseApp) {
		super(options.mdeOptions, app);
		this.options = new MongodbSettings(options);
		this.options.database = (Array.isArray(database) ? database : [this.database]).filter((name) => typeof name === "string" && name.trim() !== "").filter((a, i, l) => l.indexOf(a) === i) as any;
		this.dbName = "MongoDB";

		this.client = new MongoClient(this.mongoUri, {});

		this.client.on("connected", () => {
			this.isConnected = true;
		});

		this.client.on("error", (err) => {
			this.isConnected = false;
			throw ERROR_FACTORY.create(AppError.DB_CONNECTION_ERROR, { error: String(err) });
		});

		this.client.on("disconnected", () => {
			this.isConnected = false;
			setTimeout(() => {
				this.connect();
			}, 10000);
		});

		this.connect();
	}

	private async connect() {
		try {
			await this.client.connect();
			this.isConnected = true;

			for (let name of this.options.database) {
				this.database[name] = {
					db: this.client.db(name),
				} as any;
				this.database[name].collection = await this.getCollectionBy(name, this.options.collection);
				if (!this.pending[name]) {
					this.pending[name] = new Map();
				}

				const nodeRoot = await this.database[name].collection.findOne({ path: this.settings.prefix });

				if (!nodeRoot) {
					const node: StorageNodeInfo = {
						path: this.settings.prefix,
						content: {
							type: VALUE_TYPES.OBJECT as any,
							value: {},
							created: Date.now(),
							modified: Date.now(),
							revision_nr: 0,
							revision: ID.generate(),
						},
					};

					await this.database[name].collection.updateOne({ path: this.settings.prefix }, { $set: JSON.parse(JSON.stringify(node)) }, { upsert: true });
				}
			}

			this.resolvePending(true);
			this.emit("ready");
		} catch (err) {
			this.isConnected = false;
			console.error(err);
			throw ERROR_FACTORY.create(AppError.DB_CONNECTION_ERROR, { error: String(err) });
		}
	}

	private async getCollectionBy(name: string, collectionName: string): Promise<Collection<StorageNodeInfo>> {
		if (!this.isConnected || !this.database[name] || !this.database[name].db) {
			throw ERROR_FACTORY.create(AppError.DB_DISCONNECTED, { dbName: name });
		}

		const collectionNames = await this.database[name].db.listCollections().toArray();
		const collectionExists = collectionNames.some((col) => col.name === collectionName);

		if (!collectionExists) {
			await this.database[name].db.createCollection<StorageNodeInfo>(collectionName);
		}

		return this.database[name].db.collection<StorageNodeInfo>(collectionName);
	}

	get mongoUri() {
		const { host, port, database, username, password, options } = this.options;

		// Monta a URI de conexão usando as opções fornecidas
		let uri = `mongodb://${host}:${port}`;

		if (username && password) {
			uri = `mongodb://${username}:${password}@${host}:${port}`;
		}

		//uri += `/${database}`;

		if (options) {
			const queryParams = Object.entries(options).map(([key, value]) => `${key}=${encodeURIComponent(JSON.stringify(value))}`);
			uri += `?${queryParams.join("&")}`;
		}

		return uri;
	}

	resolvePending(resolveAll = false) {
		if (this.resolvingPending) {
			return;
		}

		clearTimeout(timer);

		timer = setTimeout(async () => {
			this.resolvingPending = true;
			let lengthRefresh = 0;

			for (let name in this.pending) {
				for (let [path, node] of this.pending[name]) {
					if (!node.refresh && !resolveAll) {
						continue;
					}

					if (node.type === "delete") {
						await this.removeNode(name, path, node.content, node);
					} else {
						await this.setNode(name, path, node.content, node);
					}
				}

				const pendingList: StorageNodeInfo[] = Array.from(this.pending[name].values()).filter((node) => node.refresh || resolveAll);

				lengthRefresh += pendingList.length;
			}

			this.resolvingPending = false;

			if (lengthRefresh > 0) {
				this.resolvePending();
			}
		}, 5000);
	}

	async getMultiple(database: string, { regex }: { regex: RegExp; query: string[] }): Promise<StorageNodeInfo[]> {
		if (!this.isConnected || !this.database[database] || !this.database[database].collection) {
			throw ERROR_FACTORY.create(AppError.DB_NOT_FOUND, { dbName: database });
		}

		const query = {
			path: {
				$regex: regex,
			},
		};

		const pendingList: StorageNodeInfo[] = Array.from(this.pending[database].values()).filter((node) => regex.test(node.path));
		const list: StorageNodeInfo[] = await this.database[database].collection.find(query).toArray();

		const result: StorageNodeInfo[] = pendingList
			.concat(list)
			.map((node) => {
				node.path = node.path.replace(/\/+$/g, "");
				return node;
			})
			.filter((node, i, l) => {
				return l.findIndex((r) => r.path === node.path) === i;
			});

		return result;
	}

	async setNode(database: string, path: string, content: StorageNode, node: StorageNodeInfo) {
		if (!this.isConnected || !this.database[database] || !this.database[database].collection) {
			throw ERROR_FACTORY.create(AppError.DB_NOT_FOUND, { dbName: database });
		}

		path = path.replace(/\/+$/g, "");
		node.path = node.path.replace(/\/+$/g, "");

		this.pending[database].set(path, node);

		try {
			await this.database[database].collection.updateOne({ path: path }, { $set: JSON.parse(JSON.stringify(node)) }, { upsert: true });
		} catch {
			this.pending[database].set(path, { ...node, refresh: true, type: "set" });
			return this.resolvePending();
		}

		this.pending[database].delete(path);
		//await this.database[database].collection.replaceOne({ path: path }, JSON.parse(JSON.stringify(node)));
	}

	async removeNode(database: string, path: string, content: StorageNode, node: StorageNodeInfo) {
		if (!this.isConnected || !this.database[database] || !this.database[database].collection) {
			throw ERROR_FACTORY.create(AppError.DB_NOT_FOUND, { dbName: database });
		}

		path = path.replace(/\/+$/g, "");
		node.path = node.path.replace(/\/+$/g, "");

		try {
			const pathRegex = new RegExp(`^${path.replace(/\//g, "\\/")}(\\/.*)?`);
			await this.database[database].collection.deleteMany({ path: pathRegex });
		} catch {
			this.pending[database].set(path, { ...node, refresh: true, type: "delete" });
			return this.resolvePending();
		}
		this.pending[database].delete(path);
	}
}
