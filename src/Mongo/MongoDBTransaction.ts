import { CustomStorageSettings, CustomStorageTransaction } from "acebase";
import { MongoClient, Db, Document, FindCursor } from "mongodb";
import { MongoDBPreparer } from "./";
import { PathInfo } from "src/lib/PathInfo";
import { SimpleCache } from "src/lib/SimpleCache";
import { StorageNode, StorageNodeMetaData } from "src/lib/StorageNode";
import { DebugLogger, LoggingLevel } from "src/lib/DebugLogger";

export const storageSettings = (dbname: string, mongodb: MongoDBPreparer, cache: SimpleCache<string, StorageNode>): CustomStorageSettings =>
	new CustomStorageSettings({
		path: "./",
		name: "MongoDB",
		locking: true, // Let AceBase handle resource locking to prevent multiple simultanious updates to the same data

		removeVoidProperties: true,

		async ready() {},

		async getTransaction(target: { path: string; write: boolean }) {
			const context = { debug: true, dbname, mongodb, cache };
			const transaction = new MongoDBTransaction(context, target);
			return transaction;
		},
	});

export class MongoDBTransaction extends CustomStorageTransaction {
	public debug: DebugLogger;
	private mongodb: MongoDBPreparer;
	private collection: string;

	private _storageKeysPrefix: string;

	private _pending: Array<{
		path: string;
		action: "set" | "update" | "remove";
		node?: StorageNode;
	}>;

	private forceCommitTime: string | number | NodeJS.Timeout;

	constructor(
		readonly context: {
			logLevel?: LoggingLevel;
			debug: boolean;
			dbname: string;
			mongodb: MongoDBPreparer;
			cache: SimpleCache<string, StorageNode>;
		},
		target: { path: string; write: boolean },
	) {
		super(target);

		this.mongodb = this.context.mongodb;
		this.collection = this.context.dbname;

		this._storageKeysPrefix = `${this.context.dbname}::`;

		this._pending = [];

		this.debug = new DebugLogger(this.context.logLevel, `[${this.context.dbname}]`);
	}

	async commit() {
		if (this._pending.length === 0) {
			return;
		}
		const batch = this._pending.splice(0);

		try {
			batch.forEach((op, i) => {
				const path = op.path;
				const key = this.getStorageKeyForPath(path);

				if (op.action === "set") {
					const document = {
						path: key,
						content: op.node,
					};
					this.mongodb.db.collection(this.collection).updateOne({ path: key }, { $set: document }, { upsert: true });
					this.context.cache.set(path, op.node);
				} else if (op.action === "remove") {
					this.mongodb.db.collection(this.collection).deleteOne({ path: key });
					this.context.cache.remove(path);
				}
			});
		} catch (err) {
			this.debug.error(err);
			throw err;
		}
	}

	forceCommit() {
		clearTimeout(this.forceCommitTime);

		this.forceCommitTime = setTimeout(() => {
			this.commit();
		}, 5000);
	}

	async rollback(err: any) {
		this._pending = [];
	}

	async get(path: string): Promise<any> {
		if (this.context.cache.has(path)) {
			const cache = this.context.cache.get(path);
			return cache;
		}

		try {
			const key = this.getStorageKeyForPath(path);
			const document: Document | null = await this.mongodb.db.collection(this.collection).findOne({ path: key });
			if (document) {
				this.context.cache.set(path, document.content);
				return document.content;
			} else {
				return null;
			}
		} catch (err) {
			this.debug.error(`MongoDB get error`, err);
			throw err;
		}
	}

	async set(path: string, node: StorageNode) {
		this.context.cache.set(path, node);
		this._pending.push({ action: "set", path, node });
		this.forceCommit();
	}

	async remove(path: string): Promise<void> {
		this._pending.push({ action: "remove", path });
		this.forceCommit();
	}

	async has(path: string): Promise<boolean> {
		if (this.context.cache.has(path)) {
			return true;
		}

		try {
			const key = this.getStorageKeyForPath(path);
			const count: number = await this.mongodb.db.collection(this.collection).countDocuments({ path: key });
			return count > 0;
		} catch (err) {
			this.debug.error(`MongoDB has error`, err);
			throw err;
		}
	}

	/**
	 *
	 * @param path Parent path to load children of
	 * @param include What data to include
	 * @param checkCallback callback method to precheck if child needs to be added, perform before loading metadata/value if possible
	 * @param addCallback callback method that adds the child node. Returns whether or not to keep calling with more children
	 * @returns Returns a promise that resolves when there are no more children to be streamed
	 */
	childrenOf(path: string, include: { metadata: boolean; value: boolean }, checkCallback: (path: string) => boolean, addCallback: (path: string, node: StorageNodeMetaData | StorageNode) => boolean) {
		return this._getChildrenOf(path, { ...include, descendants: false }, checkCallback, addCallback);
	}

	/**
	 *
	 * @param path Parent path to load descendants of
	 * @param include What data to include
	 * @param checkCallback callback method to precheck if descendant needs to be added, perform before loading metadata/value if possible. NOTE: if include.metadata === true, you should load and pass the metadata to the checkCallback if doing so has no or small performance impact
	 * @param addCallback callback method that adds the descendant node. Returns whether or not to keep calling with more children
	 * @returns Returns a promise that resolves when there are no more descendants to be streamed
	 */
	descendantsOf(path: string, include: { metadata: boolean; value: boolean }, checkCallback: (path: string) => boolean, addCallback: (path: string, node: StorageNodeMetaData | StorageNode) => boolean) {
		return this._getChildrenOf(path, { ...include, descendants: true }, checkCallback, addCallback);
	}

	private _getChildrenOf(
		path: string,
		include: {
			metadata: boolean;
			value: boolean;
			descendants: boolean;
		},
		checkCallback: (path: string, metadata?: StorageNodeMetaData) => boolean,
		addCallback?: (path: string, node?: StorageNodeMetaData | StorageNode) => boolean,
	) {
		return new Promise<void>((resolve, reject) => {
			const pathInfo = PathInfo.get(path);
			const cursor: FindCursor<Document> = this.mongodb.db.collection(this.collection).find({
				path: { $regex: `^${this.getStorageKeyForPath(path)}` },
			});

			cursor
				.forEach((document: Document) => {
					//if (!document.path.startsWith(this._storageKeysPrefix)){ return true; }

					let otherPath = this.getPathFromStorageKey(document.path);

					let keepGoing = true;
					if (!document.path.startsWith(this._storageKeysPrefix)) {
						// No more results
						return true;
					} else if (!pathInfo.isAncestorOf(otherPath)) {
						// Paths are sorted, no more children or ancestors to be expected!
						keepGoing = false;
					} else if (include.descendants || pathInfo.isParentOf(otherPath)) {
						let node: StorageNode | StorageNodeMetaData;

						if (include.metadata || include.value) {
							node = document.content;
							if ((node as StorageNode).value === null) {
								this.context.cache.remove(otherPath);
							} else {
								this.context.cache.set(otherPath, node as StorageNode);
							}
						}

						const shouldAdd = checkCallback(otherPath, node);

						if (shouldAdd) {
							keepGoing = addCallback(otherPath, node);
						}
					}

					if (!keepGoing) {
						//return true;
					}
				})
				.catch(reject)
				.finally(resolve);
		});
	}

	/**
	 * Returns the number of children stored in their own records. This implementation uses `childrenOf` to count, override if storage supports a quicker way.
	 * Eg: For SQL databases, you can implement this with a single query like `SELECT count(*) FROM nodes WHERE ${CustomStorageHelpers.ChildPathsSql(path)}`
	 * @param path
	 * @returns Returns a promise that resolves with the number of children
	 */
	getChildCount(path: string): Promise<number> {
		return Promise.reject();
	}

	/**
	 * NOT USED YET
	 * Default implementation of getMultiple that executes .get for each given path. Override for custom logic
	 * @param paths
	 * @returns Returns promise with a Map of paths to nodes
	 */
	getMultiple(paths: string[]): Promise<Map<string, StorageNode>> {
		return Promise.reject();
	}

	/**
	 * NOT USED YET
	 * Default implementation of setMultiple that executes .set for each given path. Override for custom logic
	 * @param nodes
	 */
	setMultiple(
		nodes: Array<{
			path: string;
			node: StorageNode;
		}>,
	): Promise<void> {
		return Promise.reject();
	}

	/**
	 * Default implementation of removeMultiple that executes .remove for each given path. Override for custom logic
	 * @param paths
	 */
	removeMultiple(paths: string[]): Promise<void> {
		return Promise.reject();
	}

	/**
	 * Moves the transaction path to the parent node. If node locking is used, it will request a new lock
	 * Used internally, must not be overridden unless custom locking mechanism is required
	 * @param targetPath
	 */
	moveToParentPath(targetPath: string): Promise<string> {
		return Promise.reject();
	}

	getPathFromStorageKey(key: string) {
		return key.slice(this._storageKeysPrefix.length);
	}

	getStorageKeyForPath(path: string) {
		return `${this._storageKeysPrefix}${path}`;
	}
}
