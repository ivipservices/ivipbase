import { DataBase, LocalStorage } from "ivipbase-core";

export default class StorageDB extends LocalStorage {
	public cache: { [path: string]: any } = {};

	constructor(db: DataBase) {
		super();
		db.emit("ready");
	}

	async set(path: string, value: any, options?: any): Promise<{ cursor?: string | undefined }> {
		console.log(path, value, options);
		const cursor = (this.cache[path] = value);
		return { ...(cursor ? { cursor } : {}) };
	}

	async get(path: string, options?: any): Promise<{ value: any; context: any; cursor?: string }> {
		return { value: this.cache[path] ?? null, context: { more: false } };
	}
}
