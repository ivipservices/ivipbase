"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncMongoServer = exports.SyncMongoServerConfig = exports.ExternalServerError = exports.ServerNotReadyError = void 0;
const Mongo_1 = require("../Mongo/index.js");
const SimpleEventEmitter_1 = require("../lib/SimpleEventEmitter.js");
const settings_1 = require("./settings/index.js");
const DebugLogger_1 = require("../lib/DebugLogger.js");
const Colorize_1 = require("../lib/Colorize.js");
const Http_1 = require("../lib/Http.js");
const http_1 = require("http");
const https_1 = require("https");
const Rules_1 = require("../lib/Rules.js");
const DatabaseLog_1 = require("../lib/DatabaseLog.js");
const connection_1 = require("../Middleware/connection.js");
const cors_1 = require("../Middleware/cors.js");
const cache_1 = require("../Middleware/cache.js");
const _404_1 = require("../Middleware/404.js");
const auth_1 = require("../Routes/auth/index.js");
const meta_1 = require("../Routes/meta/index.js");
const docs_1 = require("../Routes/docs/index.js");
const data_1 = require("../Routes/data/index.js");
const webmanager_1 = require("../Routes/webmanager/index.js");
const Websocket_1 = require("../Websocket/index.js");
class ServerNotReadyError extends Error {
    constructor() {
        super("Server is not ready yet");
    }
}
exports.ServerNotReadyError = ServerNotReadyError;
class ExternalServerError extends Error {
    constructor() {
        super("This method is not available with an external server");
    }
}
exports.ExternalServerError = ExternalServerError;
class SyncMongoServerConfig {
    constructor(dbname, settings) {
        this.mongodb = new Mongo_1.MongoDBPreparer({
            database: dbname,
            ...settings.mongodb,
        });
    }
}
exports.SyncMongoServerConfig = SyncMongoServerConfig;
class SyncMongoServer extends SimpleEventEmitter_1.SimpleEventEmitter {
    get isReady() {
        return this._ready;
    }
    /**
     * Aguarda o servidor estar pronto para aceitar conexões de entrada
     * @param callback (opcional) função de retorno que é chamada quando estiver pronto. Você também pode usar a promise retornada.
     * @returns retorna uma promise que é resolvida quando estiver pronto
     */
    async ready(callback) {
        if (!this._ready) {
            await this.once("ready");
        }
        callback?.();
    }
    /**
     * Obtém a URL em que o servidor está sendo executado
     */
    get url() {
        return `http${this.config.https.enabled ? "s" : ""}://${this.config.host}:${this.config.port}/${this.config.rootPath}`;
    }
    constructor(dbname, options) {
        super();
        this.dbname = dbname;
        this.options = options;
        this._ready = false;
        const { mongodb, rulesFilePath, ...serverOptions } = this.options;
        this.rulesFilePath = rulesFilePath;
        this.mongodb = new Mongo_1.MongoDBPreparer({
            database: this.dbname,
            ...mongodb,
        });
        this.config = new settings_1.ServerConfig({
            logLevel: "verbose",
            logColors: false,
            sponsor: true,
            ...serverOptions,
        });
        this.debug = new DebugLogger_1.DebugLogger(this.config.logLevel, `[${dbname}]`.colorize(Colorize_1.ColorStyle.green));
        if (this.config.auth.enabled && !this.config.https.enabled) {
            this.debug.warn(`WARNING: Authentication is enabled, but the server is not using https. Any password and other data transmitted may be intercepted!`.colorize(Colorize_1.ColorStyle.red));
        }
        else if (!this.config.https.enabled) {
            this.debug.warn(`WARNING: Server is not using https, any data transmitted may be intercepted!`.colorize(Colorize_1.ColorStyle.red));
        }
        if (!this.config.auth.enabled) {
            this.debug.warn(`WARNING: Authentication is disabled, *anyone* can do *anything* with your data!`.colorize(Colorize_1.ColorStyle.red));
        }
        this.mongodb
            .connect()
            .then(() => {
            this.db = new Mongo_1.DataBase(this.dbname, {
                mongodb: this.mongodb,
                settings: this.config,
            });
            //.supported = ()=> false;
            // Create Express app
            this.app = (0, Http_1.createApp)({
                trustProxy: true,
                maxPayloadSize: this.config.maxPayloadSize,
                config: this.config,
            });
            this.router = (0, Http_1.createRouter)();
            this.app.use(`/${this.config.rootPath}`, this.router);
            // Initialize and start server
            this.init();
        })
            .catch((e) => {
            this.debug.error(e);
        });
    }
    async init() {
        const config = this.config;
        const db = this.db;
        // Create http server
        this.config.server?.on("request", this.app);
        const server = this.config.server || (config.https.enabled ? (0, https_1.createServer)(config.https, this.app) : (0, http_1.createServer)(this.app));
        const clients = new Map();
        const securityRef = db.ref("__auth__/security");
        const authRef = db.ref("__auth__/accounts");
        const logRef = db.ref("__log__");
        const logger = new DatabaseLog_1.DatabaseLog(logRef);
        // Setup rules
        const rulesFilePath = this.rulesFilePath ? this.rulesFilePath : `${this.config.path}/rules.json`;
        const rules = new Rules_1.PathBasedRules(rulesFilePath, config.auth.defaultAccessRule, {
            db,
            debug: this.debug,
            authEnabled: this.config.auth.enabled,
        });
        this.setRule = (rulePath, PathruleType, callback) => {
            return rules.add(rulePath, PathruleType, callback);
        };
        const routeEnv = {
            config: this.config,
            server,
            db: db,
            authDb: db,
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
            //authProviders: this.authProviders,
            rules,
            instance: this,
        };
        // Add connection middleware
        const killConnections = (0, connection_1.default)(routeEnv);
        // Add CORS middleware
        (0, cors_1.default)(routeEnv);
        // Add cache middleware
        (0, cache_1.default)(routeEnv);
        if (config.auth.enabled) {
            // Add auth endpoints
            const { resetPassword, verifyEmailAddress } = await (0, auth_1.default)(routeEnv);
            this.resetPassword = resetPassword;
            this.verifyEmailAddress = verifyEmailAddress;
        }
        // Add metadata endpoints
        (0, meta_1.default)(routeEnv);
        this.debug.warn("DEVELOPMENT MODE: adding API docs endpoint at /docs");
        (0, docs_1.default)(routeEnv);
        // Add data endpoints
        (0, data_1.default)(routeEnv);
        // Add webmanager endpoints
        (0, webmanager_1.default)(routeEnv);
        // Allow adding custom routes
        this.extend = (method, ext_path, handler) => {
            const route = `/ext/${db.name}/${ext_path}`;
            this.debug.log(`Extending server: `, method, route);
            this.router[method.toLowerCase()](route, handler);
        };
        // Create websocket server
        (0, Websocket_1.addWebsocketServer)(routeEnv);
        // Run init callback to allow user code to call `server.extend`, `server.router.[method]`, `server.setRule` etc before the server starts listening
        await this.config.init?.(this);
        // If we own the server, add 404 handler
        if (!this.config.server) {
            (0, _404_1.default)(routeEnv);
        }
        // Setup pause and resume methods
        let paused = false;
        this.pause = async () => {
            if (this.config.server) {
                throw new ExternalServerError();
            }
            if (paused) {
                throw new Error("Server is already paused");
            }
            server.close();
            this.debug.warn(`Paused "${db.name}" database server at ${this.url}`);
            this.emit("pause");
            paused = true;
        };
        this.resume = async () => {
            if (this.config.server) {
                throw new ExternalServerError();
            }
            if (!paused) {
                throw new Error("Server is not paused");
            }
            return new Promise((resolve) => {
                server.listen(config.port, config.host, () => {
                    this.debug.warn(`Resumed "${db.name}" database server at ${this.url}`);
                    this.emit("resume");
                    paused = false;
                    resolve();
                });
            });
        };
        // Handle SIGINT and shutdown requests
        const shutdown = async (request) => {
            this.debug.warn("shutting down server");
            routeEnv.rules.stop();
            const getConnectionsCount = () => {
                return new Promise((resolve, reject) => {
                    server.getConnections((err, connections) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve(connections);
                        }
                    });
                });
            };
            const connections = await getConnectionsCount();
            this.debug.log(`Server has ${connections} connections`);
            await new Promise((resolve) => {
                // const interval = setInterval(async () => {
                //     const connections = await getConnectionsCount();
                //     this.debug.log(`Server still has ${connections} connections`);
                // }, 5000);
                // interval.unref();
                server.close((err) => {
                    if (err) {
                        this.debug.error(`server.close() error: ${err.message}`);
                    }
                    else {
                        this.debug.log(`server.close() success`);
                    }
                    resolve();
                });
                // If for some reason connection aren't broken in time - do proceed with shutdown sequence
                const timeout = setTimeout(() => {
                    if (clients.size === 0) {
                        return;
                    }
                    this.debug.warn(`server.close() timed out, there are still open connections`);
                    killConnections();
                }, 5000);
                timeout.unref();
                this.debug.log(`Closing ${clients.size} websocket connections`);
                clients.forEach((client, id) => {
                    const socket = client.socket;
                    socket.once("disconnect", (reason) => {
                        this.debug.log(`Socket ${socket.id} disconnected: ${reason}`);
                    });
                    socket.disconnect(true);
                });
            });
            this.debug.warn("closing database");
            await db.close();
            this.debug.warn("shutdown complete");
            // Emit events to let the outside world know we shut down.
            // This is especially important if this instance was running in a Node.js cluster: the process will
            // not exit automatically after this shutdown because Node.js' IPC channel between worker and master is still open.
            // By sending these events, the cluster manager can determine if it should (and when to) execute process.exit()
            // process.emit('acebase-server-shutdown');             // Emit on process
            process.emit("beforeExit", request.sigint ? 130 : 0); // Emit on process
            try {
                process.send && process.send("acebase-server-shutdown"); // Send to master process when running in a Node.js cluster
            }
            catch (err) {
                // IPC Channel has apparently been closed already
            }
            this.emit("shutdown"); // Emit on AceBaseServer instance
        };
        this.shutdown = async () => {
            if (this.config.server) {
                throw new ExternalServerError();
            }
            await shutdown({ sigint: false });
        };
        if (this.config.server) {
            // Offload shutdown control to an external server
            server.on("close", function close() {
                server.off("request", this.app);
                server.off("close", close);
                shutdown({ sigint: false });
            });
            const ready = () => {
                this.debug.log(`"${db.name}" database server running at ${this.url}`);
                this._ready = true;
                this.emitOnce(`ready`);
                server.off("listening", ready);
            };
            if (server.listening) {
                ready();
            }
            else {
                server.on("listening", ready);
            }
        }
        else {
            // Start listening
            server.listen(config.port, config.host, () => {
                // Ready!!
                this.debug.log(`"${db.name}" database server running at ${this.url}`);
                this._ready = true;
                this.emitOnce(`ready`);
            });
            process.on("SIGINT", () => shutdown({ sigint: true }));
        }
    }
    /**
     * Reset a user's password. This can also be done using the auth/reset_password API endpoint
     * @param clientIp ip address of the user
     * @param code reset code that was sent to the user's email address
     * @param newPassword new password chosen by the user
     */
    resetPassword(clientIp, code, newPassword) {
        throw new ServerNotReadyError();
    }
    /**
     * Marks a user account's email address as validated. This can also be done using the auth/verify_email API endpoint
     * @param clientIp ip address of the user
     * @param code verification code sent to the user's email address
     */
    verifyEmailAddress(clientIp, code) {
        throw new ServerNotReadyError();
    }
    /**
     * Shuts down the server. Stops listening for incoming connections, breaks current connections and closes the database.
     * Is automatically executed when a "SIGINT" process event is received.
     *
     * Once the shutdown procedure is completed, it emits a "shutdown" event on the server instance, "acebase-server-shutdown" event on the `process`, and sends an 'acebase-server-shutdown' IPC message if Node.js clustering is used.
     * These events can be handled by cluster managing code to `kill` or `exit` the process safely.
     */
    shutdown() {
        throw new ServerNotReadyError();
    }
    /**
     * Temporarily stops the server from handling incoming connections, but keeps existing connections open
     */
    pause() {
        throw new ServerNotReadyError();
    }
    /**
     * Resumes handling incoming connections
     */
    resume() {
        throw new ServerNotReadyError();
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
    extend(method, ext_path, handler) {
        throw new ServerNotReadyError();
    }
    /**
     * Configure an auth provider to allow users to sign in with Facebook, Google, etc
     * @param providerName name of the third party OAuth provider. Eg: "Facebook", "Google", "spotify" etc
     * @param settings API key & secret for the OAuth provider
     * @returns Returns the created auth provider instance, which can be used to call non-user specific methods the provider might support. (example: the Spotify auth provider supports getClientAuthToken, which allows API calls to be made to the core (non-user) spotify service)
     */
    configAuthProvider(providerName, settings) {
        // if (!this.config.auth.enabled) {
        // 	throw new Error(`Authentication is not enabled`);
        // }
        // try {
        // 	const AuthProvider = oAuth2Providers[providerName];
        // 	const provider = new AuthProvider(settings);
        // 	this.authProviders[providerName] = provider;
        // 	return provider;
        // } catch (err) {
        // 	throw new Error(`Failed to configure provider ${providerName}: ${err.message}`);
        // }
        throw new ServerNotReadyError();
    }
    setRule(paths, types, callback) {
        throw new ServerNotReadyError();
    }
}
exports.SyncMongoServer = SyncMongoServer;
//# sourceMappingURL=index.js.map