import { CustomStorage, CustomStorageSettings } from "./CustomStorage";
import { StorageNode, StorageNodeInfo } from "./MDE";
import { MongoClientOptions } from "mongodb";
export declare class MongodbSettings {
    host: string;
    port: number;
    database: string[];
    collection: string;
    username: string | undefined;
    password: string | undefined;
    options: MongoClientOptions | undefined;
    mdeOptions: Partial<Omit<CustomStorageSettings, "getMultiple" | "setNode" | "removeNode">>;
    constructor(options?: Partial<Omit<MongodbSettings, "database" | "collection">>);
}
export declare class MongodbStorage extends CustomStorage {
    protected isConnected: boolean;
    private options;
    private readonly client;
    private database;
    private pending;
    private resolvingPending;
    constructor(database: string | string[], options: Partial<Omit<MongodbSettings, "database">>);
    private connect;
    private getCollectionBy;
    get mongoUri(): string;
    resolvePending(resolveAll?: boolean): void;
    getMultiple(database: string, { regex }: {
        regex: RegExp;
        query: string[];
    }): Promise<StorageNodeInfo[]>;
    setNode(database: string, path: string, content: StorageNode, node: StorageNodeInfo): Promise<void>;
    removeNode(database: string, path: string, content: StorageNode, node: StorageNodeInfo): Promise<void>;
}
//# sourceMappingURL=MongoDBStorage.d.ts.map