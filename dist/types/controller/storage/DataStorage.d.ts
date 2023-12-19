import { CustomStorage, CustomStorageSettings } from "./CustomStorage";
import { StorageNode, StorageNodeInfo } from "./MDE";
export declare class DataStorageSettings extends CustomStorageSettings implements Omit<CustomStorageSettings, "getMultiple" | "setNode" | "removeNode"> {
    constructor(options?: Partial<Omit<CustomStorageSettings, "getMultiple" | "setNode" | "removeNode">>);
}
export declare class DataStorage extends CustomStorage {
    data: Map<string, StorageNode>;
    constructor(options?: Partial<Omit<CustomStorageSettings, "getMultiple" | "setNode" | "removeNode">>);
    getMultiple(expression: RegExp): Promise<StorageNodeInfo[]>;
    setNode(path: string, content: StorageNode): Promise<void>;
    removeNode(path: string): Promise<void>;
}
//# sourceMappingURL=DataStorage.d.ts.map