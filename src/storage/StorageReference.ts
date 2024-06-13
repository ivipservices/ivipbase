import { PathInfo, SimpleEventEmitter, Types } from "ivipbase-core";
import { Storage } from ".";

const _private = Symbol("private");

interface StorageReferencePutReturn {
	pause(): void;
	resume(): void;
	cancel(): void;
	on(event: "state_changed", callback: (snapshot: { bytesTransferred: number; totalBytes?: number; state: string; metadata: any; task: string; ref: StorageReference }) => void): void;
}

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

	on<d = { bytesTransferred: number; totalBytes?: number; state: string; metadata: any; task: string; ref: StorageReference }>(
		event: "state_changed",
		callback: (data: d) => void,
	): Types.SimpleEventEmitterProperty;
	on(event: string, callback: any) {
		return super.on(event, callback);
	}

	emit(event: "state_changed", data: { bytesTransferred: number; totalBytes?: number; state: string; metadata: any; task: string; ref: StorageReference }): this;
	emit(event: string, data?: any) {
		return super.emit(event, data);
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

	put(data: Blob, metadata?: { contentType: string }): StorageReferencePutReturn;
	put(data: Uint8Array, metadata?: { contentType: string }): StorageReferencePutReturn;
	put(data: Buffer, metadata?: { contentType: string }): StorageReferencePutReturn;
	put(data: File, metadata?: { contentType: string }): StorageReferencePutReturn;
	put(data: any, metadata?: { contentType: string }) {
		if (this.isWildcardPath) {
			throw new Error("Cannot put data to a wildcard path");
		}

		const self = this;

		this.storage.put(this, data, metadata, (snapshot) => {
			self.emit("state_changed", snapshot);
		});

		return {
			pause() {},
			resume() {},
			cancel() {},
			on(event: "state_changed", callback: (snapshot: { bytesTransferred: number; totalBytes?: number; state: string; metadata: any; task: string; ref: StorageReference }) => void) {
				return self.on(event, callback);
			},
		};
	}

	putString(data: string, type: "base64" | "base64url" | "data_url" | "raw" | "text" = "text"): StorageReferencePutReturn {
		if (this.isWildcardPath) {
			throw new Error("Cannot put data to a wildcard path");
		}

		const self = this;

		this.storage.putString(this, data, type, (snapshot) => {
			self.emit("state_changed", snapshot);
		});

		return {
			pause() {},
			resume() {},
			cancel() {},
			on(event: "state_changed", callback: (snapshot: { bytesTransferred: number; totalBytes?: number; state: string; metadata: any; task: string; ref: StorageReference }) => void) {
				return self.on(event, callback);
			},
		};
	}

	delete() {
		if (this.isWildcardPath) {
			throw new Error("Cannot delete a wildcard path");
		}

		return this.storage.delete(this);
	}

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
