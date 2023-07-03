import { AceBase } from "acebase";
import { AceBaseServerAuthenticationSettings, AceBaseServerConfig } from "./settings";
import { MongodbSettings, MongoDBPreparer } from "../mongodb";
import { AceBaseServerEmailSettings } from "./settings/email";
import { DebugLogger, SimpleEventEmitter } from "acebase-core";
import { HttpApp, HttpRouter, HttpRequest, HttpResponse } from "./shared/http";
import { OAuth2Provider } from "./oauth-providers/oauth-provider";
import { PathRuleFunction, PathRuleType } from "./rules";
import { DbUserAccountDetails } from "./schema/user";
export declare class AceBaseServerNotReadyError extends Error {
    constructor();
}
export declare class AceBaseExternalServerError extends Error {
    constructor();
}
type HttpMethod = 'get' | 'GET' | 'put' | 'PUT' | 'post' | 'POST' | 'delete' | 'DELETE';
export type SyncMongoServerSettings = Partial<{
    host: string;
    port: number;
    maxPayloadSize: string;
    authentication: Partial<AceBaseServerAuthenticationSettings>;
    email: AceBaseServerEmailSettings;
    mongodb: MongodbSettings;
    rulesFilePath: string;
    cacheSeconds: number;
}>;
export declare class SyncMongoServerConfig {
    readonly mongodb: MongoDBPreparer;
    constructor(dbname: string, settings: SyncMongoServerSettings);
}
export declare class SyncMongoServer extends SimpleEventEmitter {
    readonly dbname: string;
    readonly options?: Partial<SyncMongoServerSettings>;
    private mongodb;
    private _ready;
    get isReady(): boolean;
    /**
     * Aguarda o servidor estar pronto para aceitar conexões de entrada
     * @param callback (opcional) função de retorno que é chamada quando estiver pronto. Você também pode usar a promise retornada.
     * @returns retorna uma promise que é resolvida quando estiver pronto
     */
    ready(callback?: () => any): Promise<void>;
    /**
     * Obtém a configuração do servidor ativo
     */
    readonly config: AceBaseServerConfig;
    /**
     * Obtém a URL em que o servidor está sendo executado
     */
    get url(): string;
    readonly debug: DebugLogger;
    /**
     * Obtém acesso direto ao banco de dados, ignorando quaisquer regras de segurança e validadores de esquema.
     * Isso pode ser usado para adicionar manipuladores de eventos personalizados ("funções na nuvem") diretamente ao seu banco de dados.
     * OBSERVAÇÃO: seu código será executado na mesma thread do servidor, certifique-se de que não esteja realizando
     * tarefas pesadas de CPU aqui. Se você precisar fazer tarefas intensivas, crie um aplicativo separado que se conecta
     * ao seu servidor com um AceBaseClient ou execute em uma thread de trabalhador.
     * @example
     * server.db.ref('uploads/images').on('child_added', async snap => {
     *    const image = snap.val();
     *    const resizedImages = await createImageSizes(image); // Alguma função que cria várias versões de imagem em uma thread de trabalhador
     *    const targetRef = await server.db.ref('images').push(resizedImages); // Armazená-las em outro local
     *    await snap.ref.remove(); // Remover o upload original
     * });
     */
    db: AceBase;
    /**
     * Expõe o roteador do framework HTTP usado (atualmente Express) para uso externo.
     */
    router: HttpRouter & {
        [key: string]: any;
    };
    /**
     * Expõe a aplicação do framework http utilizado (atualmente o Express) para uso externo.
     */
    app: HttpApp;
    private readonly authProviders;
    private rulesFilePath;
    private cache;
    constructor(dbname: string, options?: Partial<SyncMongoServerSettings>);
    private init; /**
     * Reset a user's password. This can also be done using the auth/reset_password API endpoint
     * @param clientIp ip address of the user
     * @param code reset code that was sent to the user's email address
     * @param newPassword new password chosen by the user
     */
    resetPassword(clientIp: string, code: string, newPassword: string): Promise<DbUserAccountDetails>;
    /**
     * Marks a user account's email address as validated. This can also be done using the auth/verify_email API endpoint
     * @param clientIp ip address of the user
     * @param code verification code sent to the user's email address
     */
    verifyEmailAddress(clientIp: string, code: string): Promise<void>;
    /**
     * Shuts down the server. Stops listening for incoming connections, breaks current connections and closes the database.
     * Is automatically executed when a "SIGINT" process event is received.
     *
     * Once the shutdown procedure is completed, it emits a "shutdown" event on the server instance, "acebase-server-shutdown" event on the `process`, and sends an 'acebase-server-shutdown' IPC message if Node.js clustering is used.
     * These events can be handled by cluster managing code to `kill` or `exit` the process safely.
     */
    shutdown(): void;
    /**
     * Temporarily stops the server from handling incoming connections, but keeps existing connections open
     */
    pause(): Promise<void>;
    /**
     * Resumes handling incoming connections
     */
    resume(): Promise<void>;
    /**
     * Extend the server API with your own custom functions. Your handler will be listening
     * on path /ext/[db name]/[ext_path].
     * @example
     * // Server side:
     * const _quotes = [...];
     * server.extend('get', 'quotes/random', (req, res) => {
     *      let index = Math.round(Math.random() * _quotes.length);
     *      res.send(quotes[index]);
     * })
     * // Client side:
     * client.callExtension('get', 'quotes/random')
     * .then(quote => {
     *      console.log(`Got random quote: ${quote}`);
     * })
     * @param method http method to bind to
     * @param ext_path path to bind to (appended to /ext/)
     * @param handler your Express request handler callback
     */
    extend(method: HttpMethod, ext_path: string, handler: (req: HttpRequest, res: HttpResponse) => void): void;
    /**
     * Configure an auth provider to allow users to sign in with Facebook, Google, etc
     * @param providerName name of the third party OAuth provider. Eg: "Facebook", "Google", "spotify" etc
     * @param settings API key & secret for the OAuth provider
     * @returns Returns the created auth provider instance, which can be used to call non-user specific methods the provider might support. (example: the Spotify auth provider supports getClientAuthToken, which allows API calls to be made to the core (non-user) spotify service)
     */
    configAuthProvider(providerName: string, settings: any): OAuth2Provider;
    setRule(paths: string | string[], types: PathRuleType | PathRuleType[], callback: PathRuleFunction): void;
}
export {};
//# sourceMappingURL=index.d.ts.map