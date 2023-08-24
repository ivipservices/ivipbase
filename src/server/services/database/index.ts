import { DataBase, DataBaseSettings } from "ivipbase-core";
import StorageDB from "./StorageDB";
import { IvipBaseApp } from "../../types/app";
import { getApp, getFirstApp, appExists } from "../app";

export default class ServerDataBase extends DataBase {
	private app: IvipBaseApp;

	constructor(dbname?: string) {
		const app = appExists(dbname) ? getApp(dbname) : getFirstApp();
		super(app.name, app.dbOptions);

		this.app = app;
		this.storage = new StorageDB(this);
	}
}
