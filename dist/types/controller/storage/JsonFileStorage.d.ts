import { CustomStorage } from "./CustomStorage";
import { StorageNode, StorageNodeInfo } from "./MDE";
export declare class JsonFileStorageSettings {
    filePath: string;
    constructor(options?: Partial<JsonFileStorageSettings>);
}
export declare class JsonFileStorage extends CustomStorage {
    readonly options: JsonFileStorageSettings;
    data: Map<string, StorageNode>;
    constructor(options?: Partial<JsonFileStorageSettings>);
    getMultiple(expression: RegExp): Promise<StorageNodeInfo[]>;
    setNode(path: string, content: StorageNode, node: StorageNodeInfo): Promise<void>;
    removeNode(path: string, content: StorageNode, node: StorageNodeInfo): Promise<void>;
    saveFile(): Promise<void>;
}
//# sourceMappingURL=JsonFileStorage.d.ts.map