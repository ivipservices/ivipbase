import { PathInfo, SimpleEventEmitter } from "ivipbase-core";
import { IvipBaseApp } from "../app";
import { DataBase } from "../database";

const _private = Symbol("private");

export class StorageReference extends SimpleEventEmitter {
	private [_private]: {
		readonly path: string;
		readonly key: string | number;
	};

	constructor(protected storage: Storage, path: string) {
		super();

		if (!path) {
			path = "";
		}
		path = path.replace(/^\/|\/$/g, ""); // Trim slashes
		const pathInfo = PathInfo.get(path);
		const key = pathInfo.key;

		this[_private] = {
			get path() {
				return path;
			},
			get key() {
				return key as any;
			},
		};
	}

	get isWildcardPath() {
		return this.fullPath.indexOf("*") >= 0 || this.fullPath.indexOf("$") >= 0;
	}

	/**
	 * O caminho com o qual esta instância foi criada
	 */
	get fullPath(): string {
		return this[_private].path;
	}

	get name() {
		return PathInfo.get(this.fullPath).key;
	}

	/**
	 * A chave ou índice deste nó
	 */
	get key(): string {
		const key = this[_private].key;
		return typeof key === "number" ? `[${key}]` : key;
	}

	/**
	 * Retorna uma nova referência para o pai deste nó
	 */
	get parent(): StorageReference | null {
		const info = PathInfo.get(this.fullPath);
		if (info.parentPath === null) {
			return null;
		}
		return new StorageReference(this.storage, info.parentPath);
	}

	get root() {
		return new StorageReference(this.storage, "");
	}

	/**
	 * Retorna uma nova referência para um nó filho
	 * @param childPath Chave de filho, índice ou caminho
	 * @returns Referência para o filho
	 */
	child(childPath: string): StorageReference {
		childPath = typeof childPath === "number" ? childPath : childPath.replace(/^\/|\/$/g, "");
		const targetPath = PathInfo.getChildPath(this.fullPath, childPath);
		return new StorageReference(this.storage, targetPath); //  `${this.path}/${childPath}`
	}

	put(data: File | Blob | Uint8Array, metadata?: { contentType: string }) {
		const self = this;

		return {
			pause() {},
			resume() {},
			cancel() {},
			on(event: "state_changed", callback: (snapshot: any) => void) {
				self.on(event, callback);
			},
		};
	}

	putString(data: string, type: "base64" | "base64url" | "data_url" | "raw" | "text" = "text") {
		const self = this;

		return {
			pause() {},
			resume() {},
			cancel() {},
			on(event: "state_changed", callback: (snapshot: any) => void) {
				self.on(event, callback);
			},
		};
	}

	delete() {}

	getDownloadURL() {
		return this.storage.getDownloadURL(this);
	}

	getBlob() {}
	getBytes() {}
	getStream() {}

	listAll() {
		return this.storage.listAll(this);
	}
	list(config: { maxResults?: number; page?: number }) {
		return this.storage.list(this, config);
	}
}

export class Storage {
	constructor(protected app: IvipBaseApp, protected database: DataBase) {}

	/**
	 * Creates a reference to a node
	 * @param path
	 * @returns reference to the requested node
	 */
	ref(path: string): StorageReference {
		return new StorageReference(this, path);
	}

	put(ref: StorageReference, data: File | Blob | Uint8Array, metadata?: { contentType: string }): Promise<string> {
		return Promise.resolve("");
	}

	putString(ref: StorageReference, data: string, type?: "base64" | "base64url" | "data_url" | "raw" | "text"): Promise<string> {
		return Promise.resolve("");
	}

	delete(ef: StorageReference): Promise<void> {
		return Promise.resolve();
	}

	async getDownloadURL(ref: StorageReference): Promise<string | null> {
		const { path, isFile } = await this.database
			.ref(`__storage__`)
			.child(ref.fullPath)
			.get({
				include: ["path", "isFile"],
			})
			.then((snap) =>
				Promise.resolve(
					snap.val() ?? {
						path: null,
						isFile: false,
					},
				),
			)
			.catch(() =>
				Promise.resolve({
					path: null,
					isFile: false,
				}),
			);

		return typeof path === "string" && isFile ? `${this.app.url}/storage/${ref.fullPath}` : null;
	}

	async listAll(ref: StorageReference): Promise<{
		prefixes: StorageReference[];
		items: StorageReference[];
	}> {
		const snaps = await this.database.query(`__storage__/${ref.fullPath}`).get({
			include: ["path", "isFile"],
		});

		const items: string[] = [];
		const prefixes: string[] = [];

		snaps.forEach((snap) => {
			const { path, isFile } = snap.val();
			if (typeof path === "string" && isFile) {
				items.push(snap.ref.path.replace(`__storage__/${ref.fullPath}/`, ""));
			} else {
				prefixes.push(path.ref.path.replace(`__storage__/${ref.fullPath}/`, ""));
			}
		});

		return {
			items: items.map((child) => {
				return ref.child(child);
			}),
			prefixes: prefixes.map((child) => {
				return ref.child(child);
			}),
		};
	}

	async list(
		ref: StorageReference,
		config: {
			maxResults?: number;
			page?: number;
		},
	): Promise<{
		more: boolean;
		page: number;
		items: StorageReference[];
		prefixes: StorageReference[];
	}> {
		const maxResults = config.maxResults ?? 10;
		const skip = (config.page ?? 0) * maxResults;

		const snaps = await this.database
			.query(`__storage__/${ref.fullPath}`)
			.take(maxResults)
			.skip(skip)
			.get({
				include: ["path", "isFile"],
			});

		const items: string[] = [];
		const prefixes: string[] = [];

		snaps.forEach((snap) => {
			const { path, isFile } = snap.val();
			if (typeof path === "string" && isFile) {
				items.push(snap.ref.path.replace(`__storage__/${ref.fullPath}/`, ""));
			} else {
				prefixes.push(path.ref.path.replace(`__storage__/${ref.fullPath}/`, ""));
			}
		});

		return {
			more: items.length === maxResults,
			page: config.page ?? 0,
			items: items.map((child) => {
				return ref.child(child);
			}),
			prefixes: prefixes.map((child) => {
				return ref.child(child);
			}),
		};
	}
}
