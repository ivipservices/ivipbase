import { AceBaseBase, Api, LoggingLevel } from "acebase-core";
import { CustomStorage } from "./MongoDBStorage";
import { Storage, StorageEnv } from "acebase/dist/esm/storage";
import { storageSettings } from "./MongoDBTransaction";
import type { MongoDBPreparer } from ".";
import { SimpleCache } from "../lib/SimpleCache";
import { StorageNode } from "../lib/StorageNode";
import type { ServerConfig } from "../server/settings";

export class LocalApi extends Api {
	// All api methods for local database instance
	public db: AceBaseBase;
	public storage: CustomStorage;
	public logLevel: LoggingLevel;

	private cache: SimpleCache<string, StorageNode>;

	constructor(dbname = "default", init: { mongodb: MongoDBPreparer; db: AceBaseBase; settings: ServerConfig; cacheSeconds?: number }, readyCallback: () => any) {
		super();
		this.db = init.db;

		this.cache = new SimpleCache<string, StorageNode>(typeof init.cacheSeconds === "number" ? init.cacheSeconds : 60);

		const storageEnv: StorageEnv = { logLevel: init.settings.logLevel };

		this.storage = new CustomStorage(dbname, storageSettings(dbname, init.mongodb, this.cache), storageEnv);
		this.logLevel = init.settings.logLevel;
	}
}
