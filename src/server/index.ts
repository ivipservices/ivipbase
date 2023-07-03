import { AceBase, AceBaseLocalSettings, AceBaseStorageSettings, CustomStorageSettings, ICustomStorageNode } from "acebase";
import { createServer } from 'http';
import { createServer as createSecureServer } from 'https';
import { AceBaseServerAuthenticationSettings, AceBaseServerConfig } from "./settings";
import { MongodbSettings, MongoDBPreparer } from "../mongodb";
import { AceBaseServerEmailSettings } from "./settings/email";
import { MongoDBTransaction, storageSettings } from "../MongoDBTransaction";
import { Api, ColorStyle, DebugLogger, SimpleCache, SimpleEventEmitter } from "acebase-core";
import { HttpApp, HttpRouter, createApp, createRouter, HttpRequest, HttpResponse } from "./shared/http";
import { OAuth2Provider } from "./oauth-providers/oauth-provider";
import { ConnectedClient } from './shared/clients';
import { DatabaseLog } from './logger';
import { PathRuleFunction, PathRuleType, PathBasedRules } from "./rules";
import { DbUserAccountDetails } from "./schema/user";
import addConnectionMiddleware from './middleware/connection';
import addCorsMiddleware from './middleware/cors';
import addCacheMiddleware from './middleware/cache';
import setupAuthentication from './auth';
import addAuthenticionRoutes from './routes/auth';
import addMetadataRoutes from './routes/meta';
import addDataRoutes from './routes/data';
import addWebManagerRoutes from './routes/webmanager';
import add404Middleware from './middleware/404';
import { addWebsocketServer } from './websocket';
import oAuth2Providers from './oauth-providers';
import { RouteInitEnvironment } from "./shared/env";

export class AceBaseServerNotReadyError extends Error {
    constructor() { super('Server is not ready yet'); }
}

export class AceBaseExternalServerError extends Error {
    constructor() { super('This method is not available with an external server'); }
}

type PrivateStorageSettings = AceBaseStorageSettings & { info?: string; type?: 'data'|'transaction'|'auth'|'log' };

type HttpMethod = 'get'|'GET'|'put'|'PUT'|'post'|'POST'|'delete'|'DELETE';

export type SyncMongoServerSettings = Partial<{
    host: string,
    port: number,
    maxPayloadSize: string,
    authentication: Partial<AceBaseServerAuthenticationSettings>,
    email: AceBaseServerEmailSettings,
    mongodb: MongodbSettings,
    rulesFilePath: string,
    cacheSeconds: number
}>

export class SyncMongoServerConfig {
    readonly mongodb: MongoDBPreparer;

    constructor(dbname: string, settings: SyncMongoServerSettings){
        this.mongodb = new MongoDBPreparer({database: dbname, ...settings.mongodb});
    }
}

export class SyncMongoServer extends SimpleEventEmitter{
    private mongodb: MongoDBPreparer;

    private _ready = false;
    get isReady() { return this._ready; }

    /**
     * Aguarda o servidor estar pronto para aceitar conexões de entrada
     * @param callback (opcional) função de retorno que é chamada quando estiver pronto. Você também pode usar a promise retornada.
     * @returns retorna uma promise que é resolvida quando estiver pronto
     */
    async ready(callback?: () => any) {
        if (!this._ready) {
            await this.once('ready');
        }
        callback?.();
    }

    /**
     * Obtém a configuração do servidor ativo
     */
    readonly config: AceBaseServerConfig;

    /**
     * Obtém a URL em que o servidor está sendo executado
     */
    get url() {
        return `http${this.config.https.enabled ? 's' : ''}://${this.config.host}:${this.config.port}/${this.config.rootPath}`;
    }

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
    public db: AceBase;

    /**
     * Expõe o roteador do framework HTTP usado (atualmente Express) para uso externo.
     */
    public router: HttpRouter & {
        [key: string]: any;
    };

    /**
     * Expõe a aplicação do framework http utilizado (atualmente o Express) para uso externo.
     */
    public app: HttpApp;

    private readonly authProviders: { [provider: string]: OAuth2Provider } = {};

    private rulesFilePath: string;

    private cache: SimpleCache<string, ICustomStorageNode>;
    
    constructor(readonly dbname : string, readonly options?: Partial<SyncMongoServerSettings>){
        super();
        const { mongodb, rulesFilePath, ...serverOptions } = this.options;

        this.rulesFilePath = rulesFilePath;

        this.mongodb = new MongoDBPreparer({database: this.dbname, ...mongodb});

        this.config = new AceBaseServerConfig({
            logLevel: 'verbose',
            logColors: false, 
            sponsor: true,
            ...serverOptions
        });

        this.debug = new DebugLogger(this.config.logLevel, `[${dbname}]`.colorize(ColorStyle.green));

        if (this.config.auth.enabled && !this.config.https.enabled) {
            this.debug.warn(`WARNING: Authentication is enabled, but the server is not using https. Any password and other data transmitted may be intercepted!`.colorize(ColorStyle.red));
        }
        else if (!this.config.https.enabled) {
            this.debug.warn(`WARNING: Server is not using https, any data transmitted may be intercepted!`.colorize(ColorStyle.red));
        }
        if (!this.config.auth.enabled) {
            this.debug.warn(`WARNING: Authentication is disabled, *anyone* can do *anything* with your data!`.colorize(ColorStyle.red));
        }

        this.cache = new SimpleCache<string, ICustomStorageNode>(typeof serverOptions.cacheSeconds === 'number' ? serverOptions.cacheSeconds : 60);

        this.mongodb.connect().then(()=>{
            const getIpc = ()=> this.db.api.storage.ipc;

            const dbOptions: Partial<AceBaseLocalSettings> = {
                logLevel: 'verbose',
                logColors: false,
                info: '',
                sponsor: true,
                storage:  storageSettings(this.dbname, this.mongodb, this.cache, getIpc),
                transactions: { 
                    log: false,
                    maxAge: 3,
                    noWait: false
                }
            };

            this.db = new AceBase(this.dbname, dbOptions);

            const ipc = this.db.api.storage.ipc;
            this.db.settings.ipcEvents = true;
            ipc.on('notification', async (notification: { data: any }) => {
                const message = notification.data;
                if(typeof message !== 'object'){ return; }
                if(message.action === 'cache.invalidate'){
                    for(const path of message.paths){
                        this.cache.remove(path);
                    }
                }
            });
            
            //.supported = ()=> false;

            // Create Express app
            this.app = createApp({ trustProxy: true, maxPayloadSize: this.config.maxPayloadSize, config: this.config });
            this.router = createRouter();
            this.app.use(`/${this.config.rootPath}`, this.router);

            // Initialize and start server
            this.init();
        }).catch(e => {
            this.debug.error(e);
        });
    }

    private async init() {
        const config = this.config;
        const db = this.db;

        // Wait for databases to be ready to use
        await db.ready();

        // Create http server
        this.config.server?.on('request', this.app);

        const server = this.config.server || (config.https.enabled ? createSecureServer(config.https, this.app) : createServer(this.app));
        const clients = new Map<string, ConnectedClient>();

        const securityRef = db.ref('__auth__/security');
        const authRef = db.ref('__auth__/accounts');
        const logRef = db.ref('__log__');
        const logger = new DatabaseLog(logRef);

        // Setup rules
        const rulesFilePath = this.rulesFilePath ? this.rulesFilePath : `${this.config.path}/rules.json`;
        const rules = new PathBasedRules(rulesFilePath, config.auth.defaultAccessRule, { db, debug: this.debug, authEnabled: this.config.auth.enabled });

        this.setRule = (rulePath, PathruleType, callback) => {
            return rules.add(rulePath, PathruleType, callback);
        };

        const routeEnv: RouteInitEnvironment = {
            config: this.config,
            server,
            db: db as AceBase & { api: Api },
            authDb: db as AceBase & { api: Api },
            app: this.app,
            router: this.router,
            rootPath: this.config.rootPath,
            debug: this.debug,
            securityRef,
            authRef,
            log: logger,
            tokenSalt: null,
            clients,
            authCache: null,
            authProviders: this.authProviders,
            rules,
            instance: this,
        };

        // Add connection middleware
        const killConnections = addConnectionMiddleware(routeEnv);

        // Add CORS middleware
        addCorsMiddleware(routeEnv);

        // Add cache middleware
        addCacheMiddleware(routeEnv);

        if (config.auth.enabled) {
            // Setup auth database
            await setupAuthentication(routeEnv);

            // Add auth endpoints
            const { resetPassword, verifyEmailAddress } = addAuthenticionRoutes(routeEnv);
            this.resetPassword = resetPassword;
            this.verifyEmailAddress = verifyEmailAddress;
        }

        // Add metadata endpoints
        addMetadataRoutes(routeEnv);

        // If environment is development, add API docs
        if (process.env.NODE_ENV && process.env.NODE_ENV.trim() === 'development') {
            this.debug.warn('DEVELOPMENT MODE: adding API docs endpoint at /docs');
            (await import('./routes/docs')).addRoute(routeEnv);
            (await import('./middleware/swagger')).addMiddleware(routeEnv);
        }

        // Add data endpoints
        addDataRoutes(routeEnv);

        // Add webmanager endpoints
        addWebManagerRoutes(routeEnv);

        // Allow adding custom routes
        this.extend = (method: HttpMethod, ext_path: string, handler: (req: HttpRequest, res: HttpResponse) => any) => {
            const route = `/ext/${db.name}/${ext_path}`;
            this.debug.log(`Extending server: `, method, route);
            this.router[method.toLowerCase()](route, handler);
        };

        // Create websocket server
        addWebsocketServer(routeEnv);

        // Run init callback to allow user code to call `server.extend`, `server.router.[method]`, `server.setRule` etc before the server starts listening
        await this.config.init?.(this);

        // If we own the server, add 404 handler
        if (!this.config.server) {
            add404Middleware(routeEnv);
        }

        // Setup pause and resume methods
        let paused = false;
        this.pause = async () => {
            if (this.config.server) { throw new AceBaseExternalServerError(); }
            if (paused) { throw new Error('Server is already paused'); }
            server.close();
            this.debug.warn(`Paused "${db.name}" database server at ${this.url}`);
            this.emit('pause');
            paused = true;
        };
        this.resume = async () => {
            if (this.config.server) { throw new AceBaseExternalServerError(); }
            if (!paused) { throw new Error('Server is not paused'); }
            return new Promise(resolve => {
                server.listen(config.port, config.host, () => {
                    this.debug.warn(`Resumed "${db.name}" database server at ${this.url}`);
                    this.emit('resume');
                    paused = false;
                    resolve();
                });
            });
        };

        // Handle SIGINT and shutdown requests
        const shutdown = async (request: { sigint: boolean }) => {
            this.debug.warn('shutting down server');
            routeEnv.rules.stop();

            const getConnectionsCount = () => {
                return new Promise<number>((resolve, reject) => {
                    server.getConnections((err, connections) => {
                        if (err) { reject(err); }
                        else { resolve(connections); }
                    });
                });
            };
            const connections = await getConnectionsCount();
            this.debug.log(`Server has ${connections} connections`);

            await new Promise<void>((resolve) => {
                // const interval = setInterval(async () => {
                //     const connections = await getConnectionsCount();
                //     this.debug.log(`Server still has ${connections} connections`);
                // }, 5000);
                // interval.unref();

                server.close(err => {
                    if (err) { this.debug.error(`server.close() error: ${err.message}`); }
                    else { this.debug.log(`server.close() success`); }
                    resolve();
                });

                // If for some reason connection aren't broken in time - do proceed with shutdown sequence
                const timeout = setTimeout(() => {
                    if (clients.size === 0) { return; }
                    this.debug.warn(`server.close() timed out, there are still open connections`);
                    killConnections();
                }, 5000);
                timeout.unref();

                this.debug.log(`Closing ${clients.size} websocket connections`);
                clients.forEach((client, id) => {
                    const socket = client.socket;
                    socket.once('disconnect', reason => {
                        this.debug.log(`Socket ${socket.id} disconnected: ${reason}`);
                    });
                    socket.disconnect(true);
                });
            });
            this.debug.warn('closing database');
            await db.close();
            this.debug.warn('shutdown complete');

            // Emit events to let the outside world know we shut down.
            // This is especially important if this instance was running in a Node.js cluster: the process will
            // not exit automatically after this shutdown because Node.js' IPC channel between worker and master is still open.
            // By sending these events, the cluster manager can determine if it should (and when to) execute process.exit()

            // process.emit('acebase-server-shutdown');             // Emit on process
            process.emit('beforeExit', request.sigint ? 130 : 0);   // Emit on process
            try {
                process.send && process.send('acebase-server-shutdown'); // Send to master process when running in a Node.js cluster
            }
            catch(err) {
                // IPC Channel has apparently been closed already
            }
            this.emit('shutdown'); // Emit on AceBaseServer instance
        };
        this.shutdown = async () => {
            if (this.config.server) { throw new AceBaseExternalServerError(); }
            await shutdown({ sigint: false });
        };

        if (this.config.server) {
            // Offload shutdown control to an external server
            server.on('close', function close() {
                server.off('request', this.app);
                server.off('close', close);
                shutdown({ sigint: false });
            });
            const ready = () => {
                this.debug.log(`"${db.name}" database server running at ${this.url}`);
                this._ready = true;
                this.emitOnce(`ready`);
                server.off('listening', ready);
            };
            if (server.listening) { ready(); }
            else {server.on('listening', ready);}
        }
        else {
            // Start listening
            server.listen(config.port, config.host, () => {
                // Ready!!
                this.debug.log(`"${db.name}" database server running at ${this.url}`);
                this._ready = true;
                this.emitOnce(`ready`);
            });

            process.on('SIGINT', () => shutdown({ sigint: true }));
        }
    }/**
     * Reset a user's password. This can also be done using the auth/reset_password API endpoint
     * @param clientIp ip address of the user
     * @param code reset code that was sent to the user's email address
     * @param newPassword new password chosen by the user
     */
    resetPassword (clientIp: string, code: string, newPassword: string): Promise<DbUserAccountDetails> {
        throw new AceBaseServerNotReadyError();
    }

    /**
     * Marks a user account's email address as validated. This can also be done using the auth/verify_email API endpoint
     * @param clientIp ip address of the user
     * @param code verification code sent to the user's email address
     */
    verifyEmailAddress (clientIp: string, code: string): Promise<void> {
        throw new AceBaseServerNotReadyError();
    }

    /**
     * Shuts down the server. Stops listening for incoming connections, breaks current connections and closes the database.
     * Is automatically executed when a "SIGINT" process event is received.
     *
     * Once the shutdown procedure is completed, it emits a "shutdown" event on the server instance, "acebase-server-shutdown" event on the `process`, and sends an 'acebase-server-shutdown' IPC message if Node.js clustering is used.
     * These events can be handled by cluster managing code to `kill` or `exit` the process safely.
     */
    shutdown() {
        throw new AceBaseServerNotReadyError();
    }

    /**
     * Temporarily stops the server from handling incoming connections, but keeps existing connections open
     */
    pause(): Promise<void> {
        throw new AceBaseServerNotReadyError();
    }

    /**
     * Resumes handling incoming connections
     */
    resume(): Promise<void> {
        throw new AceBaseServerNotReadyError();
    }

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
    extend(method: HttpMethod, ext_path: string, handler: (req: HttpRequest, res: HttpResponse) => void) {
        throw new AceBaseServerNotReadyError();
    }

    /**
     * Configure an auth provider to allow users to sign in with Facebook, Google, etc
     * @param providerName name of the third party OAuth provider. Eg: "Facebook", "Google", "spotify" etc
     * @param settings API key & secret for the OAuth provider
     * @returns Returns the created auth provider instance, which can be used to call non-user specific methods the provider might support. (example: the Spotify auth provider supports getClientAuthToken, which allows API calls to be made to the core (non-user) spotify service)
     */
    configAuthProvider(providerName: string, settings: any) {
        if (!this.config.auth.enabled) {
            throw new Error(`Authentication is not enabled`);
        }
        try {
            const AuthProvider = oAuth2Providers[providerName];
            const provider = new AuthProvider(settings);
            this.authProviders[providerName] = provider;
            return provider;
        }
        catch(err) {
            throw new Error(`Failed to configure provider ${providerName}: ${err.message}`);
        }
    }

    setRule(paths: string | string[], types: PathRuleType | PathRuleType[], callback: PathRuleFunction) {
        throw new AceBaseServerNotReadyError();
    }
}