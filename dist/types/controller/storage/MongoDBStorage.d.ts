import { CustomStorage, CustomStorageSettings } from "./CustomStorage";
import { StorageNode, StorageNodeInfo } from "./MDE";
export declare class MongodbSettings {
    host: string;
    port: number;
    database: string[];
    collection: string;
    username: string | undefined;
    password: string | undefined;
    options: Record<string, any> | undefined;
    mdeOptions: Partial<Omit<CustomStorageSettings, "getMultiple" | "setNode" | "removeNode">>;
    constructor(options?: Partial<Omit<MongodbSettings, "database" | "collection">>);
}
export declare class MongodbStorage extends CustomStorage {
    protected isConnected: boolean;
    private options;
    private client;
    private database;
    constructor(database: string | string[], options: Partial<Omit<MongodbSettings, "database">>);
    private connect;
    private getCollectionBy;
    get mongoUri(): string;
    getMultiple(database: string, expression: RegExp): Promise<StorageNodeInfo[]>;
    setNode(database: string, path: string, content: StorageNode, node: StorageNodeInfo): Promise<void>;
    removeNode(database: string, path: string, content: StorageNode, node: StorageNodeInfo): Promise<void>;
}
//# sourceMappingURL=MongoDBStorage.d.ts.map