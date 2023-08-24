import { IvipBaseApp, IvipBaseOptions, IvipBaseSettings } from "../../types/app";
import { MongoClient, Db, Collection } from "mongodb";
import { StorageNodeInfo } from "../database/Node";

export class MongoDBPreparer {
	private readonly client: MongoClient;

	private _collection_root?: Collection<StorageNodeInfo>;
	private _collection_auth?: Collection<StorageNodeInfo>;
	private _collection_storage?: Collection<StorageNodeInfo>;

	private db!: Db;
	protected _ready = false;

	constructor(readonly app: IvipBaseAppImpl) {
		this.client = new MongoClient(this.app.mongoUri, {});

		this.client.on("connected", () => {
			console.log("Connected to the database");
			this._ready = true;
		});

		this.client.on("error", (err) => {
			console.error("Database connection error:", err);
			this._ready = false;
		});

		this.client.on("disconnected", () => {
			this._ready = false;
			setTimeout(() => {
				this.connect();
			}, 10000);
		});

		this.connect();
	}

	private async connect(): Promise<void> {
		try {
			await this.client.connect();
			this._ready = true;

			this.db = this.client.db(this.app.config.name); // Use the default database

			this._collection_root = await this.getCollectionBy("root");
			this._collection_auth = await this.getCollectionBy("auth");
			this._collection_storage = await this.getCollectionBy("storage");
		} catch (error) {
			this._ready = false;
			throw "Failed to connect to MongoDB:" + String(error);
		}
	}

	private async getCollectionBy(collectionName: string): Promise<Collection<StorageNodeInfo>> {
		const collectionNames = await this.db.listCollections().toArray();
		const collectionExists = collectionNames.some((col) => col.name === collectionName);

		if (!collectionExists) {
			await this.db.createCollection<StorageNodeInfo>(collectionName);
		}

		return this.db.collection<StorageNodeInfo>(collectionName);
	}

	get collectionRoot(): Collection<StorageNodeInfo> | undefined {
		return this._collection_root;
	}

	get collectionAuth(): Collection<StorageNodeInfo> | undefined {
		return this._collection_auth;
	}

	get collectionStorage(): Collection<StorageNodeInfo> | undefined {
		return this._collection_storage;
	}
}

export default class IvipBaseAppImpl implements IvipBaseApp {
	private readonly _options: IvipBaseOptions;
	private readonly _name: string;

	private readonly _config: Required<IvipBaseSettings>;
	private _isDeleted = false;

	private readonly _mongodb: MongoDBPreparer;

	constructor(options: IvipBaseOptions, config: Required<IvipBaseSettings>) {
		this._options = { ...options };
		this._config = { ...config };
		this._name = config.name;
		this._mongodb = new MongoDBPreparer(this);
	}

	get name(): string {
		this.checkDestroyed();
		return this._name;
	}

	get options(): IvipBaseOptions {
		this.checkDestroyed();
		return this._options;
	}

	get config(): Required<IvipBaseSettings> {
		this.checkDestroyed();
		return this._config;
	}

	get mongoUri() {
		this.checkDestroyed();
		const { host, port, username, password, options } = this.options;
		const { name: database } = this.config;

		// Monta a URI de conexão usando as opções fornecidas
		let uri = `mongodb://${host}:${port}`;

		if (username && password) {
			uri = `mongodb://${username}:${password}@${host}:${port}`;
		}

		if (database) {
			uri += `/${database}`;
		}

		if (options) {
			const queryParams = Object.entries(options).map(([key, value]) => `${key}=${encodeURIComponent(JSON.stringify(value))}`);
			uri += `?${queryParams.join("&")}`;
		}

		return uri;
	}

	get mongodb(): MongoDBPreparer {
		this.checkDestroyed();
		return this._mongodb;
	}

	get isDeleted(): boolean {
		return this._isDeleted;
	}

	set isDeleted(val: boolean) {
		this._isDeleted = val;
	}

	private checkDestroyed(): void {
		if (this.isDeleted) {
			//throw ERROR_FACTORY.create(AppError.APP_DELETED, { appName: this._name });
			throw "";
		}
	}
}
