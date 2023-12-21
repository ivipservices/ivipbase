import { DataBase, DebugLogger, SimpleEventEmitter } from "ivipbase-core";
export declare class ServerNotReadyError extends Error {
    constructor();
}
export declare class ExternalServerError extends Error {
    constructor();
}
export type AuthAccessDefault = "deny" | "allow" | "auth";
export declare const AUTH_ACCESS_DEFAULT: {
    [key: string]: AuthAccessDefault;
};
export declare class ServerAuthenticationSettings {
    /**
     * Se autorização deve ser habilitada. Sem autorização, o banco de dados inteiro pode ser lido e gravado por qualquer pessoa (não recomendado 🤷🏼‍♂️)
     */
    readonly enabled: boolean;
    /**
     * Se a criação de novos usuários é permitida para qualquer pessoa ou apenas para o administrador
     */
    readonly allowUserSignup: boolean;
    /**
     * Quantos novos usuários podem se inscrever por hora por endereço IP. Não implementado ainda
     */
    readonly newUserRateLimit: number;
    /**
     * Quantos minutos antes dos tokens de acesso expirarem. 0 para sem expiração.
     */
    readonly tokensExpire: number;
    /**
     * Quando o servidor é executado pela primeira vez, quais padrões usar para gerar o arquivo rules.json. Opções são: 'auth' (acesso apenas autenticado ao banco de dados, padrão), 'deny' (negar acesso a qualquer pessoa, exceto o usuário administrador), 'allow' (permitir acesso a qualquer pessoa)
     */
    readonly defaultAccessRule: AuthAccessDefault;
    /**
     * Quando o servidor é executado pela primeira vez, qual senha usar para o usuário administrador. Se não fornecida, uma senha gerada será usada e mostrada UMA VEZ na saída do console.
     */
    readonly defaultAdminPassword?: string;
    /**
     * Se deve usar um banco de dados separado para autenticação e logs. 'v2' armazenará dados em auth.db, o que AINDA NÃO FOI TESTADO!
     */
    readonly separateDb: boolean | "v2";
    constructor(settings?: Partial<ServerAuthenticationSettings>);
}
export type ServerInitialSettings<LocalServer = any> = Partial<{
    /**
     * Nível de mensagens registradas no console
     */
    logLevel: "verbose" | "log" | "warn" | "error";
    /**
     * IP ou nome do host para iniciar o servidor
     */
    host: string;
    /**
     * Número da porta em que o servidor estará ouvindo
     */
    port: number;
    /**
     * Caminho raiz para as rotas do iVipBase
     */
    rootPath: string;
    /**
     * Tamanho máximo permitido para dados enviados, por exemplo, para atualizar nós. O padrão é '10mb'
     */
    maxPayloadSize: string;
    /**
     * Valor a ser usado para o cabeçalho CORS Access-Control-Allow-Origin. O padrão é '*'
     */
    allowOrigin: string;
    /**
     * Quando atrás de um servidor de proxy confiável, req.ip e req.hostname serão definidos corretamente
     */
    trustProxy: boolean;
    /**
     * Configurações que definem se e como a autenticação é utilizada.
     */
    authentication: Partial<ServerAuthenticationSettings>;
    /**
     * Função de inicialização que é executada antes do servidor adicionar o middleware 404 e começar a ouvir chamadas recebidas.
     * Utilize esta função de retorno de chamada para estender o servidor com rotas personalizadas, adicionar regras de validação de dados, aguardar eventos externos, etc.
     * @param server Instância do `iVipBaseServer`
     */
    init?: (server: LocalServer) => Promise<void>;
}>;
export declare class ServerSettings<LocalServer = any> {
    readonly logLevel: "verbose" | "log" | "warn" | "error";
    readonly host: string;
    readonly port: number;
    readonly rootPath: string;
    readonly maxPayloadSize: string;
    readonly allowOrigin: string;
    readonly trustProxy: boolean;
    readonly auth: ServerAuthenticationSettings;
    readonly init?: (server: LocalServer) => Promise<void>;
    constructor(options?: ServerInitialSettings<LocalServer>);
}
export declare const isPossiblyServer = false;
export declare abstract class AbstractLocalServer<LocalServer = any> extends SimpleEventEmitter {
    readonly appName: string;
    protected _ready: boolean;
    readonly settings: ServerSettings<LocalServer>;
    readonly debug: DebugLogger;
    readonly db: DataBase;
    constructor(appName: string, settings?: Partial<ServerSettings>);
    abstract init(): void;
    /**
     * Aguarda o servidor estar pronto antes de executar o seu callback.
     * @param callback (opcional) função de retorno chamada quando o servidor estiver pronto para ser usado. Você também pode usar a promise retornada.
     * @returns retorna uma promise que resolve quando estiver pronto
     */
    ready(callback?: () => void): Promise<void>;
    get isReady(): boolean;
    /**
     * Gets the url the server is running at
     */
    get url(): string;
}
export declare class LocalServer extends AbstractLocalServer<LocalServer> {
    readonly appName: string;
    readonly isServer: boolean;
    constructor(appName: string, settings?: Partial<ServerSettings>);
    init(): void;
}
//# sourceMappingURL=browser.d.ts.map