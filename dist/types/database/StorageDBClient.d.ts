/// <reference types="node" />
import { Api, Types } from "ivipbase-core";
import type { DataBase } from ".";
export declare class StorageDBClient extends Api {
    readonly db: DataBase;
    private _realtimeQueries;
    readonly url: string;
    private readonly app;
    private readonly auth;
    constructor(db: DataBase);
    get serverPingUrl(): string;
    private initialize;
    get isConnected(): boolean;
    get isConnecting(): boolean;
    get connectionState(): "connected" | "disconnected" | "connecting" | "disconnecting";
    private _request;
    connect(retry?: boolean): void;
    disconnect(): void;
    subscribe(path: string, event: string, callback: Types.EventSubscriptionCallback, settings?: Types.EventSubscriptionSettings): Promise<void>;
    unsubscribe(path: string, event?: string, callback?: Types.EventSubscriptionCallback): Promise<void>;
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
    set(path: string, value: any, options?: {
        suppress_events?: boolean;
        context?: any;
    }): Promise<{
        cursor?: string;
    }>;
    update(path: string, updates: Record<string | number, any>, options?: {
        suppress_events?: boolean;
        context?: any;
    }): Promise<{
        cursor?: string;
    }>;
    transaction(path: string, callback: (currentValue: any) => Promise<any>, options?: {
        suppress_events?: boolean;
        context?: any;
    }): Promise<{
        cursor?: string | undefined;
    }>;
    get(path: string, options?: {
        include?: string[];
        exclude?: string[];
        child_objects?: boolean;
    }): Promise<{
        value: any;
        context: any;
        cursor?: string;
    }>;
    exists(path: string): Promise<boolean>;
    query(path: string, query: Types.Query, options?: Types.QueryOptions): ReturnType<Api["query"]>;
    reflect(path: string, type: "info" | "children", args: any): Promise<any>;
    export(path: string, write: Types.StreamWriteFunction, options?: {
        format?: "json";
        type_safe?: boolean;
    }): ReturnType<Api["export"]>;
    import(path: string, read: Types.StreamReadFunction, options?: {
        format?: "json";
        suppress_events?: boolean;
        method?: "set" | "update" | "merge";
    }): Promise<any>;
    getServerInfo(): Promise<any>;
    setSchema(path: string, schema: string | Record<string, any>, warnOnly?: boolean): Promise<any>;
    getSchema(path: string): Promise<any>;
    getSchemas(): Promise<any>;
    validateSchema(path: string, value: any, isUpdate: boolean): ReturnType<Api["validateSchema"]>;
}
//# sourceMappingURL=StorageDBClient.d.ts.map