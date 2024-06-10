import { CustomStorage } from "./CustomStorage";
import { StorageNode, StorageNodeInfo } from "./MDE";
import { IvipBaseApp } from "../../app";
export declare class JsonFileStorageSettings {
    filePath?: string;
    constructor(options?: Partial<JsonFileStorageSettings>);
}
export declare class JsonFileStorage extends CustomStorage {
    readonly options: JsonFileStorageSettings;
    private data;
    private timeForSaveFile?;
    private filePath;
    constructor(database: string | string[], options: Partial<JsonFileStorageSettings> | undefined, app: IvipBaseApp);
    getMultiple(database: string, { regex }: {
        regex: RegExp;
        query: string[];
    }): Promise<StorageNodeInfo[]>;
    setNode(database: string, path: string, content: StorageNode, node: StorageNodeInfo): Promise<void>;
    removeNode(database: string, path: string, content: StorageNode, node: StorageNodeInfo): Promise<void>;
    saveFile(): void;
}
//# sourceMappingURL=JsonFileStorage.d.ts.map