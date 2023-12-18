import { AppError, ERROR_FACTORY } from "../erros";
import { CustomStorage, CustomStorageSettings } from "./CustomStorage";
import { StorageNode, StorageNodeInfo } from "./MDE";
import { MongoClient, Collection, Db } from "mongodb";

export class MongodbSettings {
	host: string = "localhost";
	port: number = 27017;
	database: string = "root";
	collection: string = "main-database";
	username: string | undefined;
	password: string | undefined;
	options: Record<string, any> | undefined;
	mdeOptions: Partial<Omit<CustomStorageSettings, "getMultiple" | "setNode" | "removeNode">> = {};

	constructor(options: Partial<MongodbSettings> = {}) {
		if (typeof options.host === "string") {
			this.host = options.host;
		}

		if (typeof options.port === "number") {
			this.port = options.port;
		}

		if (typeof options.database === "string") {
			this.database = options.database;
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
	options: MongodbSettings;
	client: MongoClient;
	db: Db | undefined;
	collection: Collection<StorageNodeInfo> | undefined;

	constructor(options: Partial<MongodbSettings>) {
		super(options.mdeOptions);
		this.options = new MongodbSettings(options);
		this.dbName = "MongoDB";
		this.ready = false;

		this.client = new MongoClient(this.mongoUri, {});

		this.client.on("connected", () => {
			this.ready = true;
		});

		this.client.on("error", (err) => {
			this.ready = false;
			throw ERROR_FACTORY.create(AppError.DB_CONNECTION_ERROR, { error: String(err) });
		});

		this.client.on("disconnected", () => {
			this.ready = false;
			setTimeout(() => {
				this.connect();
			}, 10000);
		});

		this.connect();
	}

	private async connect() {
		try {
			await this.client.connect();
			this.ready = true;

			this.db = this.client.db(this.options.database);
			this.collection = await this.getCollectionBy(this.options.collection);
		} catch (err) {
			this.ready = false;
			throw ERROR_FACTORY.create(AppError.DB_CONNECTION_ERROR, { error: String(err) });
		}
	}

	private async getCollectionBy(collectionName: string): Promise<Collection<StorageNodeInfo>> {
		if (!this.ready || !this.db) {
			throw ERROR_FACTORY.create(AppError.DB_DISCONNECTED, { dbName: this.dbName });
		}

		const collectionNames = await this.db.listCollections().toArray();
		const collectionExists = collectionNames.some((col) => col.name === collectionName);

		if (!collectionExists) {
			await this.db.createCollection<StorageNodeInfo>(collectionName);
		}

		return this.db.collection<StorageNodeInfo>(collectionName);
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

	async getMultiple(expression: RegExp): Promise<StorageNodeInfo[]> {
		if (!this.ready || !this.collection) {
			throw ERROR_FACTORY.create(AppError.DB_DISCONNECTED, { dbName: this.dbName });
		}

		const query = {
			path: {
				$regex: expression,
			},
		};

		return await this.collection.find(query).toArray();
	}

	async setNode(path: string, content: StorageNode, node: StorageNodeInfo) {
		if (!this.ready || !this.collection) {
			throw ERROR_FACTORY.create(AppError.DB_DISCONNECTED, { dbName: this.dbName });
		}

		await this.collection.replaceOne({ path: "root/admin" }, JSON.parse(JSON.stringify(node)));
	}

	async removeNode(path: string, content: StorageNode, node: StorageNodeInfo) {
		if (!this.ready || !this.collection) {
			throw ERROR_FACTORY.create(AppError.DB_DISCONNECTED, { dbName: this.dbName });
		}

		await this.collection.deleteOne({ path: "root/admin" });
	}
}
