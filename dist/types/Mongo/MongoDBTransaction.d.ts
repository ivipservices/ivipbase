import { CustomStorageSettings, CustomStorageTransaction } from "acebase";
import { MongoDBPreparer } from "./";
import { SimpleCache } from "../lib/SimpleCache";
import { StorageNode, StorageNodeMetaData } from "../lib/StorageNode";
import { DebugLogger, LoggingLevel } from "../lib/DebugLogger";
export declare const storageSettings: (dbname: string, mongodb: MongoDBPreparer, cache: SimpleCache<string, StorageNode>) => CustomStorageSettings;
export declare class MongoDBTransaction extends CustomStorageTransaction {
    readonly context: {
        logLevel?: LoggingLevel;
        debug: boolean;
        dbname: string;
        mongodb: MongoDBPreparer;
        cache: SimpleCache<string, StorageNode>;
    };
    debug: DebugLogger;
    private mongodb;
    private collection;
    private _storageKeysPrefix;
    private _pending;
    private forceCommitTime;
    constructor(context: {
        logLevel?: LoggingLevel;
        debug: boolean;
        dbname: string;
        mongodb: MongoDBPreparer;
        cache: SimpleCache<string, StorageNode>;
    }, target: {
        path: string;
        write: boolean;
    });
    commit(): Promise<void>;
    forceCommit(): void;
    rollback(err: any): Promise<void>;
    get(path: string): Promise<any>;
    set(path: string, node: StorageNode): Promise<void>;
    remove(path: string): Promise<void>;
    has(path: string): Promise<boolean>;
    /**
     *
     * @param path Parent path to load children of
     * @param include What data to include
     * @param checkCallback callback method to precheck if child needs to be added, perform before loading metadata/value if possible
     * @param addCallback callback method that adds the child node. Returns whether or not to keep calling with more children
     * @returns Returns a promise that resolves when there are no more children to be streamed
     */
    childrenOf(path: string, include: {
        metadata: boolean;
        value: boolean;
    }, checkCallback: (path: string) => boolean, addCallback: (path: string, node: StorageNodeMetaData | StorageNode | any) => boolean): Promise<void>;
    /**
     *
     * @param path Parent path to load descendants of
     * @param include What data to include
     * @param checkCallback callback method to precheck if descendant needs to be added, perform before loading metadata/value if possible. NOTE: if include.metadata === true, you should load and pass the metadata to the checkCallback if doing so has no or small performance impact
     * @param addCallback callback method that adds the descendant node. Returns whether or not to keep calling with more children
     * @returns Returns a promise that resolves when there are no more descendants to be streamed
     */
    descendantsOf(path: string, include: {
        metadata: boolean;
        value: boolean;
    }, checkCallback: (path: string) => boolean, addCallback: (path: string, node: StorageNodeMetaData | StorageNode | any) => boolean): Promise<void>;
    private _getChildrenOf;
    /**
     * Returns the number of children stored in their own records. This implementation uses `childrenOf` to count, override if storage supports a quicker way.
     * Eg: For SQL databases, you can implement this with a single query like `SELECT count(*) FROM nodes WHERE ${CustomStorageHelpers.ChildPathsSql(path)}`
     * @param path
     * @returns Returns a promise that resolves with the number of children
     */
    getChildCount(path: string): Promise<number>;
    /**
     * NOT USED YET
     * Default implementation of getMultiple that executes .get for each given path. Override for custom logic
     * @param paths
     * @returns Returns promise with a Map of paths to nodes
     */
    getMultiple(paths: string[]): Promise<Map<string, StorageNode>>;
    /**
     * NOT USED YET
     * Default implementation of setMultiple that executes .set for each given path. Override for custom logic
     * @param nodes
     */
    setMultiple(nodes: Array<{
        path: string;
        node: StorageNode;
    }>): Promise<void>;
    /**
     * Default implementation of removeMultiple that executes .remove for each given path. Override for custom logic
     * @param paths
     */
    removeMultiple(paths: string[]): Promise<void>;
    /**
     * Moves the transaction path to the parent node. If node locking is used, it will request a new lock
     * Used internally, must not be overridden unless custom locking mechanism is required
     * @param targetPath
     */
    moveToParentPath(targetPath: string): Promise<string>;
    getPathFromStorageKey(key: string): string;
    getStorageKeyForPath(path: string): string;
}
//# sourceMappingURL=MongoDBTransaction.d.ts.map