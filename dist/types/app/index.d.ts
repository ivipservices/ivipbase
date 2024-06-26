import { SimpleEventEmitter, Types } from "ivipbase-core";
import { LocalServer } from "../server";
import { CustomStorage } from "./verifyStorage";
import { IvipBaseSettings, IvipBaseSettingsOptions } from "./settings";
import { DataBase } from "../database";
import { Auth } from "../auth";
import { connect as connectSocket } from "socket.io-client";
import { IPCPeer } from "../ipc";
import { Storage } from "../storage";
import { AxiosProgressEvent } from "axios";
type IOWebSocket = ReturnType<typeof connectSocket>;
export declare class IvipBaseApp extends SimpleEventEmitter {
    _ready: boolean;
    id: string;
    readonly name: string;
    settings: IvipBaseSettings;
    storage: CustomStorage;
    isDeleted: boolean;
    isServer: boolean;
    server?: LocalServer;
    readonly databases: Map<string, DataBase>;
    readonly auth: Map<string, Auth>;
    readonly storageFile: Map<string, Storage>;
    private _connectionState;
    private _socket;
    private _ipc;
    constructor(options: Partial<IvipBaseApp>);
    on<d = undefined>(event: "ready", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
    on<d = undefined>(event: "connect", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
    on<d = undefined>(event: "disconnect", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
    on<d = undefined>(event: "reconnecting", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
    on<d = undefined>(event: "reconnect", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
    on<d = undefined>(event: "reconnect_failed", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
    on<d = undefined>(event: "reset", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
    on<d = undefined>(event: "destroyed", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
    on<d = IPCPeer>(event: "connectIPC", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
    emit(event: "ready", data?: undefined): this;
    emit(event: "connect", data?: undefined): this;
    emit(event: "disconnect", data?: undefined): this;
    emit(event: "reconnecting", data?: undefined): this;
    emit(event: "reconnect", data?: undefined): this;
    emit(event: "reconnect_failed", data?: undefined): this;
    emit(event: "reset", data?: undefined): this;
    emit(event: "destroyed", data?: undefined): this;
    emit(event: "connectIPC", data: IPCPeer): this;
    initialize(): Promise<void>;
    /**
     * Aguarda o serviço estar pronto antes de executar o seu callback.
     * @param callback (opcional) função de retorno chamada quando o serviço estiver pronto para ser usado. Você também pode usar a promise retornada.
     * @returns retorna uma promise que resolve quando estiver pronto
     */
    ready(callback?: () => void): Promise<void>;
    get isConnected(): boolean;
    get isConnecting(): boolean;
    get connectionState(): "disconnected" | "connecting" | "connected" | "disconnecting";
    get socket(): import("socket.io-client").Socket<import("@socket.io/component-emitter").DefaultEventsMap, import("@socket.io/component-emitter").DefaultEventsMap> | null;
    get ipc(): IPCPeer | undefined;
    ipcReady(callback?: (ipc: IPCPeer) => void): Promise<void>;
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
        onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
        onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void;
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
    reset(options: IvipBaseSettingsOptions): Promise<IvipBaseApp>;
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