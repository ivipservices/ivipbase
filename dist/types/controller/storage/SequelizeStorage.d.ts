import { CustomStorage, CustomStorageSettings } from "./CustomStorage";
import { StorageNode, StorageNodeInfo } from "./MDE";
import { Sequelize, Options } from "sequelize";
export declare class SequelizeSettings extends CustomStorageSettings implements Omit<CustomStorageSettings, "getMultiple" | "setNode" | "removeNode"> {
    readonly uri?: string;
    readonly database?: string;
    readonly username?: string;
    readonly password?: string;
    readonly options?: Options;
    readonly sequelize?: Sequelize;
    constructor(options?: Partial<SequelizeSettings>);
}
export declare class SequelizeStorage extends CustomStorage {
    readonly database: string | string[];
    private sequelize;
    private pending;
    constructor(database: string | string[], options?: Partial<SequelizeSettings>);
    initialize(): Promise<void>;
    getMultiple(database: string, { regex }: {
        regex: RegExp;
        query: string[];
    }, simplifyValues?: boolean): Promise<StorageNodeInfo[]>;
    setNode(database: string, path: string, content: StorageNode): Promise<void>;
    removeNode(database: string, path: string): Promise<void>;
}
//# sourceMappingURL=SequelizeStorage.d.ts.map