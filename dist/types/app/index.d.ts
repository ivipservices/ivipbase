import { SimpleEventEmitter } from "ivipbase-core";
import { LocalServer, ServerSettings } from "../server";
import { StorageSettings, CustomStorage } from "./verifyStorage";
declare class IvipBaseSettings {
    name: string;
    dbname: string;
    logLevel: "log" | "warn" | "error";
    storage: StorageSettings;
    server?: Partial<ServerSettings>;
    client?: {
        host: string;
        port: number;
    };
    constructor(options?: Partial<IvipBaseSettings>);
}
export declare class IvipBaseApp extends SimpleEventEmitter {
    protected _ready: boolean;
    readonly name: string;
    readonly settings: IvipBaseSettings;
    readonly storage: CustomStorage;
    isDeleted: boolean;
    readonly isServer: boolean;
    readonly server?: LocalServer;
    constructor(options: Partial<IvipBaseApp>);
    /**
     * Aguarda o serviço estar pronto antes de executar o seu callback.
     * @param callback (opcional) função de retorno chamada quando o serviço estiver pronto para ser usado. Você também pode usar a promise retornada.
     * @returns retorna uma promise que resolve quando estiver pronto
     */
    ready(callback?: () => void): Promise<void>;
    get isReady(): boolean;
}
export declare function initializeApp(options: Partial<IvipBaseSettings>): IvipBaseApp;
export declare function appExists(name?: string): boolean;
export declare function getApp(name?: string): IvipBaseApp;
export declare function getApps(): IvipBaseApp[];
export declare function getFirstApp(): IvipBaseApp;
export declare function deleteApp(app: IvipBaseApp): void;
export {};
//# sourceMappingURL=index.d.ts.map