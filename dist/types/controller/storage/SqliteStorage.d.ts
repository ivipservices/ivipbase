import { CustomStorage, CustomStorageSettings } from "./CustomStorage";
import { StorageNode, StorageNodeInfo } from "./MDE";
export declare class SqliteSettings extends CustomStorageSettings implements Omit<CustomStorageSettings, "getMultiple" | "setNode" | "removeNode"> {
    readonly memory: string;
    constructor(options?: Partial<SqliteSettings>);
}
export declare class SqliteStorage extends CustomStorage {
    readonly database: string | string[];
    private sqlite;
    private db;
    private pending;
    constructor(database: string | string[], options?: Partial<SqliteSettings>);
    initialize(): Promise<void>;
    private _get;
    private _getOne;
    private _exec;
    private _getByRegex;
    getMultiple(database: string, { regex, query }: {
        regex: RegExp;
        query: string[];
    }, simplifyValues?: boolean): Promise<StorageNodeInfo[]>;
    setNode(database: string, path: string, content: StorageNode): Promise<void>;
    removeNode(database: string, path: string): Promise<void>;
}
//# sourceMappingURL=SqliteStorage.d.ts.map