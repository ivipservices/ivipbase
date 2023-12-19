import { CustomStorage, CustomStorageSettings } from "./CustomStorage";
import { StorageNode, StorageNodeInfo } from "./MDE";
import { MongoClient, Collection, Db } from "mongodb";
export declare class MongodbSettings {
    host: string;
    port: number;
    database: string;
    collection: string;
    username: string | undefined;
    password: string | undefined;
    options: Record<string, any> | undefined;
    mdeOptions: Partial<Omit<CustomStorageSettings, "getMultiple" | "setNode" | "removeNode">>;
    constructor(options?: Partial<Omit<MongodbSettings, "database">>);
}
export declare class MongodbStorage extends CustomStorage {
    options: MongodbSettings;
    client: MongoClient;
    db: Db | undefined;
    collection: Collection<StorageNodeInfo> | undefined;
    constructor(database: string, options: Partial<Omit<MongodbSettings, "database">>);
    private connect;
    private getCollectionBy;
    get mongoUri(): string;
    getMultiple(expression: RegExp): Promise<StorageNodeInfo[]>;
    setNode(path: string, content: StorageNode, node: StorageNodeInfo): Promise<void>;
    removeNode(path: string, content: StorageNode, node: StorageNodeInfo): Promise<void>;
}
//# sourceMappingURL=MongoDBStorage.d.ts.map