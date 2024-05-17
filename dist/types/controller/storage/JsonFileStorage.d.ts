import { CustomStorage } from "./CustomStorage";
import { StorageNode, StorageNodeInfo } from "./MDE";
export declare class JsonFileStorageSettings {
    filePath: string;
    constructor(options?: Partial<JsonFileStorageSettings>);
}
export declare class JsonFileStorage extends CustomStorage {
    readonly options: JsonFileStorageSettings;
    private data;
    private timeForSaveFile?;
    constructor(database: string | string[], options?: Partial<JsonFileStorageSettings>);
    getMultiple(database: string, expression: RegExp): Promise<StorageNodeInfo[]>;
    setNode(database: string, path: string, content: StorageNode, node: StorageNodeInfo): Promise<void>;
    removeNode(database: string, path: string, content: StorageNode, node: StorageNodeInfo): Promise<void>;
    saveFile(): void;
}
//# sourceMappingURL=JsonFileStorage.d.ts.map