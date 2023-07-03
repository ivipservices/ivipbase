import { CustomStorageSettings, CustomStorageTransaction, ICustomStorageNode, ICustomStorageNodeMetaData } from "acebase";
import { MongoDBPreparer } from "./mongodb";
import { SimpleCache } from "acebase-core";
export declare const storageSettings: (dbname: string, mongodb: MongoDBPreparer, cache: SimpleCache<string, ICustomStorageNode>, ipc: Function) => CustomStorageSettings;
export declare class MongoDBTransaction extends CustomStorageTransaction {
    readonly context: {
        debug: boolean;
        dbname: string;
        mongodb: MongoDBPreparer;
        cache: SimpleCache<string, ICustomStorageNode>;
        ipc: any;
    };
    private mongodb;
    private collection;
    private _storageKeysPrefix;
    private _pending;
    constructor(context: {
        debug: boolean;
        dbname: string;
        mongodb: MongoDBPreparer;
        cache: SimpleCache<string, ICustomStorageNode>;
        ipc: any;
    }, target: {
        path: string;
        write: boolean;
    });
    commit(): Promise<void>;
    rollback(err: any): Promise<void>;
    get(path: string): Promise<any>;
    set(path: string, node: ICustomStorageNode): Promise<void>;
    remove(path: string): Promise<void>;
    childrenOf(path: string, include: {
        metadata: boolean;
        value: boolean;
    }, checkCallback: (path: string) => boolean, addCallback: (path: string, node: ICustomStorageNodeMetaData | ICustomStorageNode) => boolean): Promise<void>;
    descendantsOf(path: string, include: {
        metadata: boolean;
        value: boolean;
    }, checkCallback: (path: string) => boolean, addCallback: (path: string, node: ICustomStorageNodeMetaData | ICustomStorageNode) => boolean): Promise<void>;
    _getChildrenOf(path: string, include: {
        metadata: boolean;
        value: boolean;
        descendants: boolean;
    }, checkCallback: (path: string, metadata?: ICustomStorageNodeMetaData) => boolean, addCallback?: (path: string, node?: ICustomStorageNodeMetaData | ICustomStorageNode) => boolean): Promise<void>;
    getPathFromStorageKey(key: string): string;
    getStorageKeyForPath(path: string): string;
}
//# sourceMappingURL=MongoDBTransaction.d.ts.map