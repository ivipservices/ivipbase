import { DebugLogger, SimpleEventEmitter } from "ivipbase-core";
import { DataBase } from "../database";
import type { IvipBaseApp } from "../app";
import { DbUserAccountDetails } from "./schema/user";
import { DatabaseSettings, EmailRequest } from "../app/settings/browser";
import type { RulesData } from "../database/services/rules";
import { PathBasedRules } from "../database/services/rules";
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
export declare class DataBaseServerTransactionSettings {
    /**
     * Se deve ativar o log de transações
     */
    log: boolean;
    /**
     * Idade máxima em dias para manter as transações no arquivo de log
     */
    maxAge: number;
    /**
     * Se as operações de gravação do banco de dados não devem esperar até que a transação seja registrada
     */
    noWait: boolean;
    constructor(settings: Partial<DataBaseServerTransactionSettings>);
}
export declare class ServerAuthenticationSettings {
    /**
     * Se autorização deve ser habilitada. Sem autorização, o banco de dados inteiro pode ser lido e gravado por qualquer pessoa (não recomendado 🤷🏼‍♂️)
     */
    enabled: boolean;
    /**
     * Se a criação de novos usuários é permitida para qualquer pessoa ou apenas para o administrador
     */
    allowUserSignup: boolean;
    /**
     * Quantos novos usuários podem se inscrever por hora por endereço IP. Não implementado ainda
     */
    newUserRateLimit: number;
    /**
     * Quantos minutos antes dos tokens de acesso expirarem. 0 para sem expiração.
     */
    tokensExpire: number;
    /**
     * Quando o servidor é executado pela primeira vez, quais padrões usar para gerar o arquivo rules.json. Opções são: 'auth' (acesso apenas autenticado ao banco de dados, padrão), 'deny' (negar acesso a qualquer pessoa, exceto o usuário administrador), 'allow' (permitir acesso a qualquer pessoa)
     */
    defaultAccessRule: AuthAccessDefault;
    /**
     * Quando o servidor é executado pela primeira vez, qual senha usar para o usuário administrador. Se não fornecida, uma senha gerada será usada e mostrada UMA VEZ na saída do console.
     */
    defaultAdminPassword?: string;
    /**
     * Se deve usar um banco de dados separado para autenticação e logs. 'v2' armazenará dados em auth.db, o que AINDA NÃO FOI TESTADO!
     */
    separateDb: boolean | "v2";
    constructor(settings?: Partial<ServerAuthenticationSettings>);
    toJSON(): {
        enabled: boolean;
        allowUserSignup: boolean;
        newUserRateLimit: number;
        tokensExpire: number;
        defaultAccessRule: AuthAccessDefault;
        defaultAdminPassword: string | undefined;
        separateDb: boolean | "v2";
    };
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
    serverVersion: string;
    /**
     * Configurações de registro de transações. Aviso: estágio BETA, NÃO use em produção ainda
     */
    transactions: Partial<DataBaseServerTransactionSettings>;
    defineRules: RulesData;
    localPath: string;
}>;
export declare class ServerSettings<LocalServer = any> {
    logLevel: "verbose" | "log" | "warn" | "error";
    host: string;
    port: number;
    rootPath: string;
    maxPayloadSize: string;
    allowOrigin: string;
    trustProxy: boolean;
    auth: ServerAuthenticationSettings;
    init?: (server: LocalServer) => Promise<void>;
    serverVersion: string;
    transactions: DataBaseServerTransactionSettings;
    defineRules?: RulesData;
    localPath: string;
    dbAuth: {
        [dbName: string]: ServerAuthenticationSettings;
    };
    constructor(options?: Partial<ServerInitialSettings<LocalServer> & {
        database: DatabaseSettings | DatabaseSettings[];
    }>);
}
export declare const isPossiblyServer = false;
export declare abstract class AbstractLocalServer<LocalServer = any> extends SimpleEventEmitter {
    readonly localApp: IvipBaseApp;
    protected _ready: boolean;
    readonly settings: ServerSettings<LocalServer>;
    readonly log: DebugLogger;
    readonly debug: DebugLogger;
    readonly db: (dbName: string) => DataBase;
    readonly hasDatabase: (dbName: string) => boolean;
    readonly rules: (dbName: string) => PathBasedRules;
    readonly securityRef: (dbName: string) => any;
    readonly authRef: (dbName: string) => any;
    readonly send_email: (dbName: string, request: EmailRequest) => Promise<unknown>;
    constructor(localApp: IvipBaseApp, settings?: Partial<ServerSettings>);
    abstract init(): void;
    /**
     * Aguarda o servidor estar pronto antes de executar o seu callback.
     * @param callback (opcional) função de retorno chamada quando o servidor estiver pronto para ser usado. Você também pode usar a promise retornada.
     * @returns retorna uma promise que resolve quando estiver pronto
     */
    ready(callback?: () => void): Promise<void>;
    get isReady(): boolean;
    /**
     * Obtém a URL na qual o servidor está sendo executado
     */
    get url(): string;
    get dbNames(): string[];
    /**
     * Redefine a senha do usuário. Isso também pode ser feito usando o ponto de extremidade da API auth/reset_password
     * @param clientIp endereço IP do usuário
     * @param code código de redefinição que foi enviado para o endereço de e-mail do usuário
     * @param newPassword nova senha escolhida pelo usuário
     */
    resetPassword(dbName: string, clientIp: string, code: string, newPassword: string): Promise<DbUserAccountDetails>;
    /**
     * Marca o endereço de e-mail da conta do usuário como validado. Isso também pode ser feito usando o ponto de extremidade da API auth/verify_email
     * @param clientIp endereço IP do usuário
     * @param code código de verificação enviado para o endereço de e-mail do usuário
     */
    verifyEmailAddress(dbName: string, clientIp: string, code: string): Promise<string>;
    getLogBytesUsage(): Promise<{
        [dbName: string]: {
            request: number;
            response: number;
        };
    }>;
}
export declare class LocalServer extends AbstractLocalServer<LocalServer> {
    readonly isServer: boolean;
    constructor(localApp: IvipBaseApp, settings?: Partial<ServerSettings>);
    init(): void;
}
//# sourceMappingURL=browser.d.ts.map