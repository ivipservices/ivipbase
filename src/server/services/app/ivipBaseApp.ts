import { IvipBaseApp, IvipBaseOptions, IvipBaseSettings } from "../../types/app";
import { MongoClient, Db } from "mongodb";

export class MongoDBPreparer {
	readonly client: MongoClient;
	public db: Db;
	protected _ready = false;

	constructor(readonly app: IvipBaseApp) {
		this.client = new MongoClient(this.app.mongoUri, {});
		this.db = this.client.db(this.app.options.database);

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

	async connect(): Promise<void> {
		try {
			await this.client.connect();
			this._ready = true;
			this.db = this.client.db(this.app.options.database); // Use the default database
		} catch (error) {
			this._ready = false;
			throw "Failed to connect to MongoDB:" + String(error);
		}
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
		const { host, port, database, username, password, options } = this.options;

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
