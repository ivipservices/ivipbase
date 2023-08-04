import type { AceBase } from "acebase";
import { HttpApp, HttpMethod, HttpRequest, HttpResponse, HttpRouter, RouteInitEnvironment, SyncMongoServerSettings } from "src/types";
import { DataBase, MongoDBPreparer, MongoDBTransaction } from "src/Mongo";
import { SimpleEventEmitter } from "src/lib/SimpleEventEmitter";
import { ServerConfig } from "./settings";
import { DebugLogger } from "src/lib/DebugLogger";
import { SimpleCache } from "src/lib/SimpleCache";
import { StorageNode } from "src/lib/StorageNode";
import { ColorStyle } from "src/lib/Colorize";
import { createApp, createRouter } from "src/lib/Http";
import { createServer } from "http";
import { createServer as createSecureServer } from "https";
import { ConnectedClient } from "src/lib/ConnectedClient";
import { PathBasedRules, PathRuleFunction, PathRuleType } from "src/lib/Rules";
import type { AceBaseBase, Api } from "acebase-core";
import { DatabaseLog } from "src/lib/DatabaseLog";
import { DbUserAccountDetails } from "src/Schema/user";

import addConnectionMiddleware from "src/Middleware/connection";
import addCorsMiddleware from "src/Middleware/cors";
import addCacheMiddleware from "src/Middleware/cache";
import add404Middleware from "src/Middleware/404";

import addAuthenticionRoutes from "src/Routes/auth";
import addMetadataRoutes from "src/Routes/meta";
import addDocsRoutes from "src/Routes/docs";
import addDataRoutes from "src/Routes/data";

export class ServerNotReadyError extends Error {
	constructor() {
		super("Server is not ready yet");
	}
}

export class SyncMongoServerConfig {
	readonly mongodb: MongoDBPreparer;

	constructor(dbname: string, settings: SyncMongoServerSettings) {
		this.mongodb = new MongoDBPreparer({
			database: dbname,
			...settings.mongodb,
		});
	}
}

export class SyncMongoServer extends SimpleEventEmitter {
	private mongodb: MongoDBPreparer;

	private _ready = false;
	get isReady() {
		return this._ready;
	}

	/**
	 * Aguarda o servidor estar pronto para aceitar conexões de entrada
	 * @param callback (opcional) função de retorno que é chamada quando estiver pronto. Você também pode usar a promise retornada.
	 * @returns retorna uma promise que é resolvida quando estiver pronto
	 */
	async ready(callback?: () => any) {
		if (!this._ready) {
			await this.once("ready");
		}
		callback?.();
	}

	/**
	 * Obtém a configuração do servidor ativo
	 */
	readonly config: ServerConfig;

	/**
	 * Obtém a URL em que o servidor está sendo executado
	 */
	get url() {
		return `http${this.config.https.enabled ? "s" : ""}://${this.config.host}:${this.config.port}/${this.config.rootPath}`;
	}

	readonly debug: DebugLogger;

	public db: AceBaseBase;

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

	private rulesFilePath: string;

	constructor(readonly dbname: string, readonly options?: Partial<SyncMongoServerSettings>) {
		super();
		const { mongodb, rulesFilePath, ...serverOptions } = this.options;

		this.rulesFilePath = rulesFilePath;

		this.mongodb = new MongoDBPreparer({
			database: this.dbname,
			...mongodb,
		});

		this.config = new ServerConfig({
			logLevel: "verbose",
			logColors: false,
			sponsor: true,
			...serverOptions,
		});

		this.debug = new DebugLogger(this.config.logLevel, `[${dbname}]`.colorize(ColorStyle.green));

		if (this.config.auth.enabled && !this.config.https.enabled) {
			this.debug.warn(`WARNING: Authentication is enabled, but the server is not using https. Any password and other data transmitted may be intercepted!`.colorize(ColorStyle.red));
		} else if (!this.config.https.enabled) {
			this.debug.warn(`WARNING: Server is not using https, any data transmitted may be intercepted!`.colorize(ColorStyle.red));
		}
		if (!this.config.auth.enabled) {
			this.debug.warn(`WARNING: Authentication is disabled, *anyone* can do *anything* with your data!`.colorize(ColorStyle.red));
		}

		this.mongodb
			.connect()
			.then(() => {
				this.db = new DataBase(this.dbname, {
					mongodb: this.mongodb,
					settings: this.config,
				});

				//.supported = ()=> false;

				// Create Express app
				this.app = createApp({
					trustProxy: true,
					maxPayloadSize: this.config.maxPayloadSize,
					config: this.config,
				});

				this.router = createRouter();

				this.app.use(`/${this.config.rootPath}`, this.router);

				// Initialize and start server
				this.init();
			})
			.catch((e) => {
				this.debug.error(e);
			});
	}

	private async init() {
		const config = this.config;
		const db = this.db as AceBase;

		// Create http server
		this.config.server?.on("request", this.app);

		const server = this.config.server || (config.https.enabled ? createSecureServer(config.https, this.app) : createServer(this.app));
		const clients = new Map<string, ConnectedClient>();

		const securityRef = db.ref("__auth__/security");
		const authRef = db.ref("__auth__/accounts");
		const logRef = db.ref("__log__");
		const logger = new DatabaseLog(logRef);

		// Setup rules
		const rulesFilePath = this.rulesFilePath ? this.rulesFilePath : `${this.config.path}/rules.json`;
		const rules = new PathBasedRules(rulesFilePath, config.auth.defaultAccessRule, {
			db,
			debug: this.debug,
			authEnabled: this.config.auth.enabled,
		});

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
			//authProviders: this.authProviders,
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
			// Add auth endpoints
			const { resetPassword, verifyEmailAddress } = await addAuthenticionRoutes(routeEnv);
			this.resetPassword = resetPassword;
			this.verifyEmailAddress = verifyEmailAddress;
		}

		// Add metadata endpoints
		addMetadataRoutes(routeEnv);

		this.debug.warn("DEVELOPMENT MODE: adding API docs endpoint at /docs");
		addDocsRoutes(routeEnv);

		addDataRoutes(routeEnv);
	}
	/**
	 * Reset a user's password. This can also be done using the auth/reset_password API endpoint
	 * @param clientIp ip address of the user
	 * @param code reset code that was sent to the user's email address
	 * @param newPassword new password chosen by the user
	 */
	resetPassword(clientIp: string, code: string, newPassword: string): Promise<DbUserAccountDetails> {
		throw new ServerNotReadyError();
	}

	/**
	 * Marks a user account's email address as validated. This can also be done using the auth/verify_email API endpoint
	 * @param clientIp ip address of the user
	 * @param code verification code sent to the user's email address
	 */
	verifyEmailAddress(clientIp: string, code: string): Promise<void> {
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
	pause(): Promise<void> {
		throw new ServerNotReadyError();
	}

	/**
	 * Resumes handling incoming connections
	 */
	resume(): Promise<void> {
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
	extend(method: HttpMethod, ext_path: string, handler: (req: HttpRequest, res: HttpResponse) => void) {
		throw new ServerNotReadyError();
	}

	/**
	 * Configure an auth provider to allow users to sign in with Facebook, Google, etc
	 * @param providerName name of the third party OAuth provider. Eg: "Facebook", "Google", "spotify" etc
	 * @param settings API key & secret for the OAuth provider
	 * @returns Returns the created auth provider instance, which can be used to call non-user specific methods the provider might support. (example: the Spotify auth provider supports getClientAuthToken, which allows API calls to be made to the core (non-user) spotify service)
	 */
	configAuthProvider(providerName: string, settings: any) {
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

	setRule(paths: string | string[], types: PathRuleType | PathRuleType[], callback: PathRuleFunction) {
		throw new ServerNotReadyError();
	}
}
