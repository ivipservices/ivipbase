import { IvipBaseApp, getApp, getAppsName, getFirstApp } from "../app";
import { hasDatabase } from "../database";
import { Storage } from "./storage";

export function getStorage(): Storage;
export function getStorage(app: string | IvipBaseApp | undefined): Storage;
export function getStorage(database: string): Storage;
export function getStorage(database: string, app: string | IvipBaseApp | undefined): Storage;
export function getStorage(...args: any[]) {
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

	if (!hasDatabase(dbName)) {
		throw new Error(`Database "${dbName}" does not exist`);
	}

	const db = app.databases.get(dbName);
	return new Storage(app, db as any);
}
