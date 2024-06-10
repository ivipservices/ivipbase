import { CustomStorage, CustomStorageSettings } from "./CustomStorage";
import { StorageNode, StorageNodeInfo } from "./MDE";
import { IvipBaseApp } from "../../app";
export declare class DataStorageSettings extends CustomStorageSettings implements Omit<CustomStorageSettings, "getMultiple" | "setNode" | "removeNode"> {
    constructor(options?: Partial<Omit<CustomStorageSettings, "getMultiple" | "setNode" | "removeNode">>);
}
export declare class DataStorage extends CustomStorage {
    private data;
    constructor(database: string | string[], options: Partial<Omit<CustomStorageSettings, "getMultiple" | "setNode" | "removeNode">> | undefined, app: IvipBaseApp);
    getMultiple(database: string, { regex }: {
        regex: RegExp;
        query: string[];
    }): Promise<StorageNodeInfo[]>;
    setNode(database: string, path: string, content: StorageNode): Promise<void>;
    removeNode(database: string, path: string): Promise<void>;
}
//# sourceMappingURL=DataStorage.d.ts.map