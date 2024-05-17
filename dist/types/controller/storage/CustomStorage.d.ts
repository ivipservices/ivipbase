import { DebugLogger } from "ivipbase-core";
import MDE, { MDESettings, StorageNode, StorageNodeInfo } from "./MDE";
export declare class CustomStorageSettings extends MDESettings implements Omit<MDESettings, "getMultiple" | "setNode" | "removeNode"> {
    constructor(options?: Partial<Omit<MDESettings, "getMultiple" | "setNode" | "removeNode">>);
}
export declare abstract class CustomStorage extends MDE {
    private _dbName;
    private logLevel;
    private _debug;
    constructor(options?: Partial<Omit<MDESettings, "getMultiple" | "setNode" | "removeNode"> & {
        logLevel: "verbose" | "log" | "warn" | "error";
    }>);
    get dbName(): string;
    set dbName(value: string);
    get debug(): DebugLogger;
    abstract getMultiple(database: string, expression: RegExp): Promise<StorageNodeInfo[]>;
    abstract setNode(database: string, path: string, content: StorageNode, node: StorageNodeInfo): Promise<any>;
    abstract removeNode(database: string, path: string, content: StorageNode, node: StorageNodeInfo): Promise<any>;
}
//# sourceMappingURL=CustomStorage.d.ts.map