import { DataBase } from "ivipbase-core";

export default class ServerDataBase extends DataBase {
	constructor(dbname: string, options?: Partial<DataBaseSettings>) {
		super(dbname, options);
		this.storage = new myStorage(this);
	}
}
