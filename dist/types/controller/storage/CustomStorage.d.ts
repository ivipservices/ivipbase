import MDE, { MDESettings, StorageNode, StorageNodeInfo } from "./MDE";
export declare class CustomStorageSettings extends MDESettings implements Omit<MDESettings, "getMultiple" | "setNode" | "removeNode"> {
    constructor(options?: Partial<Omit<MDESettings, "getMultiple" | "setNode" | "removeNode">>);
}
export declare abstract class CustomStorage extends MDE {
    dbName: string;
    ready: boolean;
    constructor(options?: Partial<Omit<MDESettings, "getMultiple" | "setNode" | "removeNode">>);
    abstract getMultiple(expression: RegExp): Promise<StorageNodeInfo[]>;
    abstract setNode(path: string, content: StorageNode, node: StorageNodeInfo): Promise<any>;
    abstract removeNode(path: string, content: StorageNode, node: StorageNodeInfo): Promise<any>;
}
//# sourceMappingURL=CustomStorage.d.ts.map