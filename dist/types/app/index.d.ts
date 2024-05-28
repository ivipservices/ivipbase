import { SimpleEventEmitter, Types } from "ivipbase-core";
import { LocalServer } from "../server";
import { CustomStorage } from "./verifyStorage";
import { IvipBaseSettings, IvipBaseSettingsOptions } from "./settings";
import { DataBase } from "../database";
import { Auth } from "../auth";
import { connect as connectSocket } from "socket.io-client";
type IOWebSocket = ReturnType<typeof connectSocket>;
export declare class IvipBaseApp extends SimpleEventEmitter {
    _ready: boolean;
    private id;
    readonly name: string;
    settings: IvipBaseSettings;
    storage: CustomStorage;
    isDeleted: boolean;
    isServer: boolean;
    server?: LocalServer;
    readonly databases: Map<string, DataBase>;
    readonly auth: Map<string, Auth>;
    private _connectionState;
    private _socket;
    constructor(options: Partial<IvipBaseApp>);
    initialize(): Promise<void>;
    /**
     * Aguarda o serviço estar pronto antes de executar o seu callback.
     * @param callback (opcional) função de retorno chamada quando o serviço estiver pronto para ser usado. Você também pode usar a promise retornada.
     * @returns retorna uma promise que resolve quando estiver pronto
     */
    ready(callback?: () => void): Promise<void>;
    get isConnected(): boolean;
    get isConnecting(): boolean;
    get connectionState(): "connected" | "disconnected" | "connecting" | "disconnecting";
    get socket(): import("socket.io-client").Socket<import("@socket.io/component-emitter").DefaultEventsMap, import("@socket.io/component-emitter").DefaultEventsMap> | null;
    onConnect(callback: (socket: IOWebSocket | null) => void, isOnce?: boolean): Promise<{
        stop: () => void;
    }>;
    get isReady(): boolean;
    get url(): string;
    request(options: {
        route: string;
        /**
         * @default 'GET'
         */
        method?: "GET" | "PUT" | "POST" | "DELETE";
        /**
         * Data to post when method is PUT or POST
         */
        data?: any;
        /**
         * Context to add to PUT or POST requests
         */
        context?: any;
        /**
         * A method that overrides the default data receiving handler. Override for streaming.
         */
        dataReceivedCallback?: (chunk: string) => void;
        /**
         * A method that overrides the default data send handler. Override for streaming.
         */
        dataRequestCallback?: (length: number) => string | Types.TypedArrayLike | Promise<string | Types.TypedArrayLike>;
        /**
         * Whether to try the request even if there is no connection
         * @default false
         */
        ignoreConnectionState?: boolean;
        /**
         * NEW Whether the returned object should contain an optionally returned context object.
         * @default false
         */
        includeContext?: boolean;
        /**
         * The access token to use for the request
         * @default undefined
         */
        accessToken?: string;
    }): Promise<any | {
        context: any;
        data: any;
    }>;
    websocketRequest<ResponseType = Record<string, any>>(socket: IOWebSocket | null, event: string, data: any, dbName: string): Promise<ResponseType & {
        req_id: string;
        success: boolean;
        reason?: string | {
            code: string;
            message: string;
        } | undefined;
    }>;
    projects(): Promise<{
        name: string;
        description: string;
        type: string;
    }[]>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    reconnect(): Promise<void>;
    destroy(): Promise<void>;
    reset(options: IvipBaseSettingsOptions): Promise<void>;
}
export declare function initializeApp(options: IvipBaseSettingsOptions): IvipBaseApp;
export declare function appExists(name?: string): boolean;
export declare function getApp(name?: string): IvipBaseApp;
export declare function getApps(): IvipBaseApp[];
export declare function getAppsName(): string[];
export declare function getFirstApp(): IvipBaseApp;
export declare function deleteApp(app: IvipBaseApp): void;
export {};
//# sourceMappingURL=index.d.ts.map