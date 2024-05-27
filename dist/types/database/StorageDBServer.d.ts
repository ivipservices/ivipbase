/// <reference types="node" />
import { Api, Types } from "ivipbase-core";
import type { DataBase } from ".";
export declare class StorageDBServer extends Api {
    readonly db: DataBase;
    cache: {
        [path: string]: any;
    };
    constructor(db: DataBase);
    getInfo(): Promise<{
        dbname: string;
        version: string;
        time: number;
        process: number;
        platform?: NodeJS.Platform;
        arch?: string;
        release?: string;
        host?: string;
        uptime?: string;
        load?: number[];
        mem?: {
            total: string;
            free: string;
            process: {
                arrayBuffers: string;
                external: string;
                heapTotal: string;
                heapUsed: string;
                residentSet: string;
            };
        };
        cpus?: any;
        network?: any;
        data?: Array<{
            cpuUsage: number;
            networkStats: {
                sent: number;
                received: number;
            };
            memoryUsage: {
                total: number;
                free: number;
                used: number;
            };
            timestamp: number;
        }>;
    }>;
    stats(): Promise<{
        writes: number;
        reads: number;
        bytesRead: number;
        bytesWritten: number;
    }>;
    subscribe(path: string, event: string, callback: Types.EventSubscriptionCallback, settings?: Types.EventSubscriptionSettings): void;
    unsubscribe(path: string, event?: string, callback?: Types.EventSubscriptionCallback): void;
    set(path: string, value: any, options?: any): Promise<{
        cursor?: string | undefined;
    }>;
    get(path: string, options?: {
        include?: string[];
        exclude?: string[];
    }): Promise<{
        value: any;
        context: any;
        cursor?: string;
    }>;
    update(path: string, updates: any, options?: any): Promise<{
        cursor?: string | undefined;
    }>;
    transaction(path: string, callback: (currentValue: any) => Promise<any>, options?: {
        suppress_events?: boolean;
        context?: any;
    }): Promise<{}>;
    exists(path: string): Promise<boolean>;
    query(path: string, query: Types.Query, options?: Types.QueryOptions): ReturnType<Api["query"]>;
    export(path: string, stream: Types.StreamWriteFunction, options?: {
        format?: "json";
        type_safe?: boolean;
    }): Promise<void>;
    import(path: string, read: Types.StreamReadFunction, options?: {
        format?: "json";
        suppress_events?: boolean;
        method?: "set" | "update" | "merge";
    }): Promise<void>;
    reflect(path: string, type: "children", args: any): Promise<Types.ReflectionChildrenInfo>;
    reflect(path: string, type: "info", args: any): Promise<Types.ReflectionNodeInfo>;
    setSchema(path: string, schema: Record<string, any> | string, warnOnly?: boolean): Promise<void>;
    getSchema(path: string): Promise<Types.SchemaInfo>;
    getSchemas(): Promise<Types.SchemaInfo[]>;
    validateSchema(path: string, value: any, isUpdate: boolean): Promise<Types.ISchemaCheckResult>;
}
//# sourceMappingURL=StorageDBServer.d.ts.map