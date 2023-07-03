"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncMongoServer = exports.SyncMongoServerConfig = exports.AceBaseExternalServerError = exports.AceBaseServerNotReadyError = void 0;
const acebase_1 = require("acebase");
const http_1 = require("http");
const https_1 = require("https");
const settings_1 = require("./settings");
const mongodb_1 = require("../mongodb");
const MongoDBTransaction_1 = require("../MongoDBTransaction");
const acebase_core_1 = require("acebase-core");
const http_2 = require("./shared/http");
const logger_1 = require("./logger");
const rules_1 = require("./rules");
const connection_1 = require("./middleware/connection");
const cors_1 = require("./middleware/cors");
const cache_1 = require("./middleware/cache");
const auth_1 = require("./auth");
const auth_2 = require("./routes/auth");
const meta_1 = require("./routes/meta");
const data_1 = require("./routes/data");
const webmanager_1 = require("./routes/webmanager");
const _404_1 = require("./middleware/404");
const websocket_1 = require("./websocket");
const oauth_providers_1 = require("./oauth-providers");
class AceBaseServerNotReadyError extends Error {
    constructor() { super('Server is not ready yet'); }
}
exports.AceBaseServerNotReadyError = AceBaseServerNotReadyError;
class AceBaseExternalServerError extends Error {
    constructor() { super('This method is not available with an external server'); }
}
exports.AceBaseExternalServerError = AceBaseExternalServerError;
class SyncMongoServerConfig {
    constructor(dbname, settings) {
        this.mongodb = new mongodb_1.MongoDBPreparer(Object.assign({ database: dbname }, settings.mongodb));
    }
}
exports.SyncMongoServerConfig = SyncMongoServerConfig;
class SyncMongoServer extends acebase_core_1.SimpleEventEmitter {
    get isReady() { return this._ready; }
    /**
     * Aguarda o servidor estar pronto para aceitar conexões de entrada
     * @param callback (opcional) função de retorno que é chamada quando estiver pronto. Você também pode usar a promise retornada.
     * @returns retorna uma promise que é resolvida quando estiver pronto
     */
    ready(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._ready) {
                yield this.once('ready');
            }
            callback === null || callback === void 0 ? void 0 : callback();
        });
    }
    /**
     * Obtém a URL em que o servidor está sendo executado
     */
    get url() {
        return `http${this.config.https.enabled ? 's' : ''}://${this.config.host}:${this.config.port}/${this.config.rootPath}`;
    }
    constructor(dbname, options) {
        super();
        this.dbname = dbname;
        this.options = options;
        this._ready = false;
        this.authProviders = {};
        const _a = this.options, { mongodb, rulesFilePath } = _a, serverOptions = __rest(_a, ["mongodb", "rulesFilePath"]);
        this.rulesFilePath = rulesFilePath;
        this.mongodb = new mongodb_1.MongoDBPreparer(Object.assign({ database: this.dbname }, mongodb));
        this.config = new settings_1.AceBaseServerConfig(Object.assign({ logLevel: 'verbose', logColors: false, sponsor: true }, serverOptions));
        this.debug = new acebase_core_1.DebugLogger(this.config.logLevel, `[${dbname}]`.colorize(acebase_core_1.ColorStyle.green));
        if (this.config.auth.enabled && !this.config.https.enabled) {
            this.debug.warn(`WARNING: Authentication is enabled, but the server is not using https. Any password and other data transmitted may be intercepted!`.colorize(acebase_core_1.ColorStyle.red));
        }
        else if (!this.config.https.enabled) {
            this.debug.warn(`WARNING: Server is not using https, any data transmitted may be intercepted!`.colorize(acebase_core_1.ColorStyle.red));
        }
        if (!this.config.auth.enabled) {
            this.debug.warn(`WARNING: Authentication is disabled, *anyone* can do *anything* with your data!`.colorize(acebase_core_1.ColorStyle.red));
        }
        this.cache = new acebase_core_1.SimpleCache(typeof serverOptions.cacheSeconds === 'number' ? serverOptions.cacheSeconds : 60);
        this.mongodb.connect().then(() => {
            const getIpc = () => this.db.api.storage.ipc;
            const dbOptions = {
                logLevel: 'verbose',
                logColors: false,
                info: '',
                sponsor: true,
                storage: (0, MongoDBTransaction_1.storageSettings)(this.dbname, this.mongodb, this.cache, getIpc),
                transactions: {
                    log: false,
                    maxAge: 3,
                    noWait: false
                }
            };
            this.db = new acebase_1.AceBase(this.dbname, dbOptions);
            const ipc = this.db.api.storage.ipc;
            this.db.settings.ipcEvents = true;
            ipc.on('notification', (notification) => __awaiter(this, void 0, void 0, function* () {
                const message = notification.data;
                if (typeof message !== 'object') {
                    return;
                }
                if (message.action === 'cache.invalidate') {
                    for (const path of message.paths) {
                        this.cache.remove(path);
                    }
                }
            }));
            //.supported = ()=> false;
            // Create Express app
            this.app = (0, http_2.createApp)({ trustProxy: true, maxPayloadSize: this.config.maxPayloadSize, config: this.config });
            this.router = (0, http_2.createRouter)();
            this.app.use(`/${this.config.rootPath}`, this.router);
            // Initialize and start server
            this.init();
        }).catch(e => {
            this.debug.error(e);
        });
    }
    init() {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            const config = this.config;
            const db = this.db;
            // Wait for databases to be ready to use
            yield db.ready();
            // Create http server
            (_a = this.config.server) === null || _a === void 0 ? void 0 : _a.on('request', this.app);
            const server = this.config.server || (config.https.enabled ? (0, https_1.createServer)(config.https, this.app) : (0, http_1.createServer)(this.app));
            const clients = new Map();
            const securityRef = db.ref('__auth__/security');
            const authRef = db.ref('__auth__/accounts');
            const logRef = db.ref('__log__');
            const logger = new logger_1.DatabaseLog(logRef);
            // Setup rules
            const rulesFilePath = this.rulesFilePath ? this.rulesFilePath : `${this.config.path}/rules.json`;
            const rules = new rules_1.PathBasedRules(rulesFilePath, config.auth.defaultAccessRule, { db, debug: this.debug, authEnabled: this.config.auth.enabled });
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
                authProviders: this.authProviders,
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
                // Setup auth database
                yield (0, auth_1.default)(routeEnv);
                // Add auth endpoints
                const { resetPassword, verifyEmailAddress } = (0, auth_2.default)(routeEnv);
                this.resetPassword = resetPassword;
                this.verifyEmailAddress = verifyEmailAddress;
            }
            // Add metadata endpoints
            (0, meta_1.default)(routeEnv);
            // If environment is development, add API docs
            if (process.env.NODE_ENV && process.env.NODE_ENV.trim() === 'development') {
                this.debug.warn('DEVELOPMENT MODE: adding API docs endpoint at /docs');
                (yield Promise.resolve().then(() => require('./routes/docs'))).addRoute(routeEnv);
                (yield Promise.resolve().then(() => require('./middleware/swagger'))).addMiddleware(routeEnv);
            }
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
            (0, websocket_1.addWebsocketServer)(routeEnv);
            // Run init callback to allow user code to call `server.extend`, `server.router.[method]`, `server.setRule` etc before the server starts listening
            yield ((_c = (_b = this.config).init) === null || _c === void 0 ? void 0 : _c.call(_b, this));
            // If we own the server, add 404 handler
            if (!this.config.server) {
                (0, _404_1.default)(routeEnv);
            }
            // Setup pause and resume methods
            let paused = false;
            this.pause = () => __awaiter(this, void 0, void 0, function* () {
                if (this.config.server) {
                    throw new AceBaseExternalServerError();
                }
                if (paused) {
                    throw new Error('Server is already paused');
                }
                server.close();
                this.debug.warn(`Paused "${db.name}" database server at ${this.url}`);
                this.emit('pause');
                paused = true;
            });
            this.resume = () => __awaiter(this, void 0, void 0, function* () {
                if (this.config.server) {
                    throw new AceBaseExternalServerError();
                }
                if (!paused) {
                    throw new Error('Server is not paused');
                }
                return new Promise(resolve => {
                    server.listen(config.port, config.host, () => {
                        this.debug.warn(`Resumed "${db.name}" database server at ${this.url}`);
                        this.emit('resume');
                        paused = false;
                        resolve();
                    });
                });
            });
            // Handle SIGINT and shutdown requests
            const shutdown = (request) => __awaiter(this, void 0, void 0, function* () {
                this.debug.warn('shutting down server');
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
                const connections = yield getConnectionsCount();
                this.debug.log(`Server has ${connections} connections`);
                yield new Promise((resolve) => {
                    // const interval = setInterval(async () => {
                    //     const connections = await getConnectionsCount();
                    //     this.debug.log(`Server still has ${connections} connections`);
                    // }, 5000);
                    // interval.unref();
                    server.close(err => {
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
                        socket.once('disconnect', reason => {
                            this.debug.log(`Socket ${socket.id} disconnected: ${reason}`);
                        });
                        socket.disconnect(true);
                    });
                });
                this.debug.warn('closing database');
                yield db.close();
                this.debug.warn('shutdown complete');
                // Emit events to let the outside world know we shut down.
                // This is especially important if this instance was running in a Node.js cluster: the process will
                // not exit automatically after this shutdown because Node.js' IPC channel between worker and master is still open.
                // By sending these events, the cluster manager can determine if it should (and when to) execute process.exit()
                // process.emit('acebase-server-shutdown');             // Emit on process
                process.emit('beforeExit', request.sigint ? 130 : 0); // Emit on process
                try {
                    process.send && process.send('acebase-server-shutdown'); // Send to master process when running in a Node.js cluster
                }
                catch (err) {
                    // IPC Channel has apparently been closed already
                }
                this.emit('shutdown'); // Emit on AceBaseServer instance
            });
            this.shutdown = () => __awaiter(this, void 0, void 0, function* () {
                if (this.config.server) {
                    throw new AceBaseExternalServerError();
                }
                yield shutdown({ sigint: false });
            });
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
                if (server.listening) {
                    ready();
                }
                else {
                    server.on('listening', ready);
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
                process.on('SIGINT', () => shutdown({ sigint: true }));
            }
        });
    } /**
     * Reset a user's password. This can also be done using the auth/reset_password API endpoint
     * @param clientIp ip address of the user
     * @param code reset code that was sent to the user's email address
     * @param newPassword new password chosen by the user
     */
    resetPassword(clientIp, code, newPassword) {
        throw new AceBaseServerNotReadyError();
    }
    /**
     * Marks a user account's email address as validated. This can also be done using the auth/verify_email API endpoint
     * @param clientIp ip address of the user
     * @param code verification code sent to the user's email address
     */
    verifyEmailAddress(clientIp, code) {
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
    pause() {
        throw new AceBaseServerNotReadyError();
    }
    /**
     * Resumes handling incoming connections
     */
    resume() {
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
    extend(method, ext_path, handler) {
        throw new AceBaseServerNotReadyError();
    }
    /**
     * Configure an auth provider to allow users to sign in with Facebook, Google, etc
     * @param providerName name of the third party OAuth provider. Eg: "Facebook", "Google", "spotify" etc
     * @param settings API key & secret for the OAuth provider
     * @returns Returns the created auth provider instance, which can be used to call non-user specific methods the provider might support. (example: the Spotify auth provider supports getClientAuthToken, which allows API calls to be made to the core (non-user) spotify service)
     */
    configAuthProvider(providerName, settings) {
        if (!this.config.auth.enabled) {
            throw new Error(`Authentication is not enabled`);
        }
        try {
            const AuthProvider = oauth_providers_1.default[providerName];
            const provider = new AuthProvider(settings);
            this.authProviders[providerName] = provider;
            return provider;
        }
        catch (err) {
            throw new Error(`Failed to configure provider ${providerName}: ${err.message}`);
        }
    }
    setRule(paths, types, callback) {
        throw new AceBaseServerNotReadyError();
    }
}
exports.SyncMongoServer = SyncMongoServer;
//# sourceMappingURL=index.js.map