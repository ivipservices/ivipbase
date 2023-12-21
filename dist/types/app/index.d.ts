import { SimpleEventEmitter } from "ivipbase-core";
import { LocalServer } from "../server";
import { CustomStorage } from "./verifyStorage";
import { IvipBaseSettings } from "./settings";
export declare class IvipBaseApp extends SimpleEventEmitter {
    protected _ready: boolean;
    readonly name: string;
    readonly settings: IvipBaseSettings;
    readonly storage: CustomStorage;
    isDeleted: boolean;
    readonly isServer: boolean;
    server?: LocalServer;
    constructor(options: Partial<IvipBaseApp>);
    init(): void;
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
//# sourceMappingURL=index.d.ts.map