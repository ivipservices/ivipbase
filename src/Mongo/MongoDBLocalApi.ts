import {
	AceBaseBase,
	IStreamLike,
	Api,
	EventSubscriptionCallback,
	ReflectionType,
	IReflectionNodeInfo,
	IReflectionChildrenInfo,
	StreamReadFunction,
	StreamWriteFunction,
	TransactionLogFilter,
	LoggingLevel,
	Query,
	QueryOptions,
} from "acebase-core";
import { CustomStorage } from "./MongoDBStorage";
import { Storage, StorageEnv } from "acebase/dist/types/storage";
import { storageSettings } from "./MongoDBTransaction";
import type { MongoDBPreparer } from ".";
import { SimpleCache } from "src/lib/SimpleCache";
import { StorageNode } from "src/lib/StorageNode";
import type { ServerConfig } from "src/server/settings";

export class LocalApi extends Api {
	// All api methods for local database instance
	public db: AceBaseBase;
	public storage: Storage;
	public logLevel: LoggingLevel;

	private cache: SimpleCache<string, StorageNode>;

	constructor(
		dbname = "default",
		init: { mongodb: MongoDBPreparer; db: AceBaseBase; settings: ServerConfig; cacheSeconds?: number },
		readyCallback: () => any,
	) {
		super();
		this.db = init.db;

		this.cache = new SimpleCache<string, StorageNode>(typeof init.cacheSeconds === "number" ? init.cacheSeconds : 60);

		const storageEnv: StorageEnv = { logLevel: init.settings.logLevel };

		this.storage = new CustomStorage(dbname, storageSettings(dbname, init.mongodb, this.cache), storageEnv);
	}
}
