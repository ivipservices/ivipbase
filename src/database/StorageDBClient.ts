import { Api } from "ivipbase-core";
import type { DataBase } from ".";

export class StorageDBClient extends Api {
	public cache: { [path: string]: any } = {};

	constructor(readonly db: DataBase) {
		super();
		this.db.emit("ready");
	}
}
