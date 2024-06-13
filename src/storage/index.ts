import { IvipBaseApp, getApp, getAppsName, getFirstApp } from "../app";
import { DataBase, hasDatabase } from "../database";
import { StorageClient } from "./StorageClient";
import { StorageReference } from "./StorageReference";
import { StorageServer } from "./StorageServer";

export class Storage {
	private api: StorageServer | StorageClient;

	constructor(readonly app: IvipBaseApp, readonly database: DataBase) {
		this.api = app.isServer ? new StorageServer(this) : new StorageClient(this);
	}

	/**
	 * Creates a reference to a node
	 * @param path
	 * @returns reference to the requested node
	 */
	ref(path: string): StorageReference {
		return new StorageReference(this, path);
	}

	put(
		ref: StorageReference,
		data: Blob | Uint8Array,
		metadata?: { contentType: string },
		onStateChanged?: (event: { bytesTransferred: number; totalBytes?: number; state: string; metadata: any; task: string; ref: StorageReference }) => void,
	): Promise<string>;
	put(
		ref: StorageReference,
		data: Uint8Array | Buffer,
		metadata?: { contentType: string },
		onStateChanged?: (event: { bytesTransferred: number; totalBytes?: number; state: string; metadata: any; task: string; ref: StorageReference }) => void,
	): Promise<string> {
		return this.api.put(ref, data as any, metadata);
	}

	putString(
		ref: StorageReference,
		data: string,
		type?: "base64" | "base64url" | "data_url" | "raw" | "text",
		onStateChanged?: (event: { bytesTransferred: number; totalBytes?: number; state: string; metadata: any; task: string; ref: StorageReference }) => void,
	): Promise<string> {
		return this.api.putString(ref, data, type);
	}

	delete(ref: StorageReference): Promise<void> {
		return this.api.delete(ref);
	}

	getDownloadURL(ref: StorageReference): Promise<string | null> {
		return this.api.getDownloadURL(ref);
	}

	listAll(ref: StorageReference): Promise<{ prefixes: StorageReference[]; items: StorageReference[] }> {
		return this.api.listAll(ref);
	}

	list(ref: StorageReference, config: { maxResults?: number; page?: number }): Promise<{ prefixes: StorageReference[]; items: StorageReference[] }> {
		return this.api.list(ref, config);
	}
}

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

	if (app.storageFile.has(dbName)) {
		return app.storageFile.get(dbName);
	}

	const db = app.databases.get(dbName);
	const storage = new Storage(app, db as any);
	app.storageFile.set(dbName, storage);
	return storage;
}
