import { AppError, ERROR_FACTORY } from "../erros";
import { CustomStorage, CustomStorageSettings } from "./CustomStorage";
import { StorageNode, StorageNodeInfo } from "./MDE";
import { MongoClient, Collection, Db } from "mongodb";

export class MongodbSettings {
	host: string = "localhost";
	port: number = 27017;
	database: string[] = ["root"];
	collection: string = "main-database";
	username: string | undefined;
	password: string | undefined;
	options: Record<string, any> | undefined;
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

export class MongodbStorage extends CustomStorage {
	protected isConnected: boolean = false;
	private options: MongodbSettings;
	private client: MongoClient;
	private database: Record<
		string,
		{
			db: Db;
			collection: Collection<StorageNodeInfo>;
		}
	> = {};

	constructor(database: string | string[], options: Partial<Omit<MongodbSettings, "database">>) {
		super(options.mdeOptions);
		this.options = new MongodbSettings(options);
		this.options.database = (Array.isArray(database) ? database : [database]).filter((name) => typeof name === "string" && name.trim() !== "");
		this.dbName = "MongoDB";

		this.client = new MongoClient(this.mongoUri, {});

		this.client.on("connected", () => {
			this.emitOnce("ready");
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
				this.database[name].db = this.client.db(name);
				this.database[name].collection = await this.getCollectionBy(name, this.options.collection);
			}
		} catch (err) {
			this.isConnected = false;
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

	async getMultiple(database: string, expression: RegExp): Promise<StorageNodeInfo[]> {
		if (!this.isConnected || !this.database[database] || !this.database[database].collection) {
			throw ERROR_FACTORY.create(AppError.DB_NOT_FOUND, { dbName: database });
		}

		const query = {
			path: {
				$regex: expression,
			},
		};

		return await this.database[database].collection.find(query).toArray();
	}

	async setNode(database: string, path: string, content: StorageNode, node: StorageNodeInfo) {
		if (!this.isConnected || !this.database[database] || !this.database[database].collection) {
			throw ERROR_FACTORY.create(AppError.DB_NOT_FOUND, { dbName: database });
		}

		await this.database[database].collection.updateOne({ path: path }, { $set: JSON.parse(JSON.stringify(node)) }, { upsert: true });
		//await this.database[database].collection.replaceOne({ path: path }, JSON.parse(JSON.stringify(node)));
	}

	async removeNode(database: string, path: string, content: StorageNode, node: StorageNodeInfo) {
		if (!this.isConnected || !this.database[database] || !this.database[database].collection) {
			throw ERROR_FACTORY.create(AppError.DB_NOT_FOUND, { dbName: database });
		}

		await this.database[database].collection.deleteOne({ path: path });
	}
}
