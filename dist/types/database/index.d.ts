import { DataBase as DataBaseCore, DataBaseSettings, DebugLogger } from "ivipbase-core";
import { IvipBaseApp } from "../app";
import { StorageDBServer } from "./StorageDBServer";
import { StorageDBClient } from "./StorageDBClient";
import { Subscriptions } from "./Subscriptions";
export declare class DataBase extends DataBaseCore {
    readonly database: string;
    readonly app: IvipBaseApp;
    readonly name: string;
    readonly description: string;
    readonly subscriptions: Subscriptions;
    readonly debug: DebugLogger;
    readonly storage: StorageDBServer | StorageDBClient;
    constructor(database: string, app: IvipBaseApp, options?: Partial<DataBaseSettings>);
    connect(retry?: boolean): void;
    disconnect(): void;
}
export declare function getDatabase(): DataBase;
export declare function getDatabase(app: string | IvipBaseApp | undefined): DataBase;
export declare function getDatabase(app: string | IvipBaseApp | undefined, options: Partial<DataBaseSettings>): DataBase;
export declare function getDatabase(database: string): DataBase;
export declare function getDatabase(database: string, app: string | IvipBaseApp | undefined): DataBase;
export declare function getDatabase(database: string, app: string | IvipBaseApp | undefined, options: Partial<DataBaseSettings>): DataBase;
export declare function getDatabasesNames(): string[];
export declare function hasDatabase(database: string): boolean;
export declare class SchemaValidationError extends Error {
    reason: string;
    constructor(reason: string);
}
//# sourceMappingURL=index.d.ts.map