import { DataBase as DataBaseCore, DataBaseSettings, DebugLogger } from "ivipbase-core";
import { IvipBaseApp, getApp, getFirstApp, getAppsName } from "../app";
import { StorageDBServer } from "./StorageDBServer";
import { StorageDBClient } from "./StorageDBClient";
import { Subscriptions } from "./Subscriptions";

export class DataBase extends DataBaseCore {
	readonly subscriptions = new Subscriptions();
	readonly debug: DebugLogger;

	constructor(readonly database: string, readonly app: IvipBaseApp, options?: Partial<DataBaseSettings>) {
		super(database, options);

		this.storage = app.isServer || !app.settings.isValidClient ? new StorageDBServer(this) : new StorageDBClient(this);

		this.debug = new DebugLogger(app.settings.logLevel, `[${database}]`);

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

		app.storage.ready(() => {
			this.emit("ready");
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
	let app: IvipBaseApp = args.find((a) => a instanceof IvipBaseApp),
		dbName: string | undefined;
	const appNames = getAppsName();

	if (!app) {
		const name = appNames.find((n) => args.includes(n));
		app = name ? getApp(name) : getFirstApp();
	}

	let database: string | string[] = args.find((d) => typeof d === "string" && appNames.includes(d) !== true);

	if (typeof database !== "string") {
		database = app.settings.dbname;
	}

	dbName = (Array.isArray(database) ? database : [database])[0];

	if (dbName && app.databases.has(dbName)) {
		return app.databases.get(dbName);
	}

	const db = new DataBase(
		(Array.isArray(database) ? database : [database])[0],
		app,
		args.find((s) => typeof s === "object" && !(s instanceof IvipBaseApp)),
	);

	app.databases.set(dbName, db);
	return db;
}

export function getDatabasesNames(): string[] {
	return Array.prototype.concat
		.apply(
			[],
			getAppsName().map((name) => {
				const names = getApp(name).settings.dbname;
				return Array.isArray(names) ? names : [names];
			}),
		)
		.filter((v, i, a) => a.indexOf(v) === i);
}

export function hasDatabase(database: string): boolean {
	return getDatabasesNames().includes(database);
}

export class SchemaValidationError extends Error {
	constructor(public reason: string) {
		super(`Schema validation failed: ${reason}`);
	}
}
