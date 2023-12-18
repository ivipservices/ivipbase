import { DataBase as DataBaseCore, DataBaseSettings, Api } from "ivipbase-core";
import { IvipBaseApp, getApp, getFirstApp } from "../app";

class StorageDB extends Api {
	public cache: { [path: string]: any } = {};

	constructor(readonly db: DataBase) {
		super();
		this.db.emit("ready");
	}

	async set(path: string, value: any, options?: any): Promise<{ cursor?: string | undefined }> {
		this.db.app.storage.set(path, value);
		const cursor = value;
		return { ...(cursor ? { cursor } : {}) };
	}

	async get(path: string, options?: any): Promise<{ value: any; context: any; cursor?: string }> {
		const value = this.db.app.storage.get(path);
		return { value, context: { more: false } };
	}
}

export class DataBase extends DataBaseCore {
	readonly app: IvipBaseApp;

	constructor(app: string | IvipBaseApp | undefined = undefined, options?: Partial<DataBaseSettings>) {
		const appNow = typeof app === "string" ? getApp(app) : app instanceof IvipBaseApp ? app : getFirstApp();
		super(appNow.settings.dbname, options);
		this.app = appNow;
		this.storage = new StorageDB(this);
	}
}

export function getDatabase(app: string | IvipBaseApp | undefined = undefined, options?: Partial<DataBaseSettings>) {
	return new DataBase(app, options);
}
