import { DataBase as DataBaseCore, DataBaseSettings } from "ivipbase-core";
import { IvipBaseApp, getApp, getFirstApp, getAppsName } from "../app";
import { StorageDBServer } from "./StorageDBServer";
import { StorageDBClient } from "./StorageDBClient";
import { Subscriptions } from "./Subscriptions";

export class DataBase extends DataBaseCore {
	readonly subscriptions = new Subscriptions();

	constructor(readonly database: string, readonly app: IvipBaseApp, options?: Partial<DataBaseSettings>) {
		super(database, options);

		this.storage = app.isServer || !app.settings.isValidClient ? new StorageDBServer(this) : new StorageDBClient(this);

		this.emitOnce("ready");

		app.storage.on("add", (e: { name: string; path: string; value: any }) => {
			//console.log(e);
			this.subscriptions.triggerAllEvents(e.path, null, e.value);
		});

		app.storage.on("change", (e: { name: string; path: string; value: any; previous: any }) => {
			//console.log(e);
			this.subscriptions.triggerAllEvents(e.path, e.previous, e.value);
		});

		app.storage.on("remove", (e: { name: string; path: string; value: any }) => {
			this.subscriptions.triggerAllEvents(e.path, e.value, null);
		});
	}
}

export function getDatabase(): DataBase;
export function getDatabase(app: string | IvipBaseApp | undefined): DataBase;
export function getDatabase(app: string | IvipBaseApp | undefined, options: Partial<DataBaseSettings>): DataBase;
export function getDatabase(database: string): DataBase;
export function getDatabase(database: string, app: string | IvipBaseApp | undefined): DataBase;
export function getDatabase(database: string, app: string | IvipBaseApp | undefined, options: Partial<DataBaseSettings>): DataBase;
export function getDatabase(...args: any[]) {
	let app: IvipBaseApp = args.find((a) => a instanceof IvipBaseApp);
	const appNames = getAppsName();

	if (!app) {
		const name = appNames.find((n) => args.includes(n));
		app = name ? getApp(name) : getFirstApp();
	}

	let database: string | string[] = args.find((d) => typeof d === "string" && appNames.includes(d) !== true);

	if (typeof database !== "string") {
		database = app.settings.dbname;
	}

	return new DataBase(
		(Array.isArray(database) ? database : [database])[0],
		app,
		args.find((s) => typeof s === "object" && !(s instanceof IvipBaseApp)),
	);
}
