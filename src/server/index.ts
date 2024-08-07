import { AbstractLocalServer, ServerSettings, ServerInitialSettings, ServerNotReadyError } from "./browser";
import type { Socket } from "socket.io";
import type { Express, Request, Response } from "express";
import * as express from "express";
import { addMetadataRoutes, addDataRoutes, addAuthenticionRoutes, addWebManagerRoutes, addStorageRoutes } from "./routes";
import { Server, createServer } from "http";
import { DbUserAccountDetails } from "./schema/user";
import { add404Middleware, addCacheMiddleware, addCorsMiddleware, addLogBytesMiddleware } from "./middleware";
import type { IvipBaseApp } from "../app";
import { ConnectedClient } from "./shared/clients";
import { setupAuthentication } from "./services/auth";
import { SimpleCache } from "ivipbase-core";
import { addWebsocketServer } from "./websocket";
import formData from "express-form-data";
import path from "path";
import fs from "fs";

const createExpress = (express as any).default ?? express;

export { ServerSettings };
export type { ServerInitialSettings };

export const isPossiblyServer = true;

export type HttpApp = express.Express;
export type HttpRouter = express.Router;
export type HttpSocket = Socket;
export type HttpRequest = express.Request;
export type HttpResponse = express.Response;
export { Express, Request, Response };

type expressRouteMethod = "get" | "put" | "post" | "delete";
type HttpMethod = expressRouteMethod | "GET" | "PUT" | "POST" | "DELETE";

export interface RouteRequestEnvironment {
	/** Se a solicitação tiver um token "Authentication: bearer", o usuário será associado à solicitação recebida */
	user?: DbUserAccountDetails;

	/** Se o contexto for enviado pelo cabeçalho DataBase-Context, será associado à solicitação recebida */
	context: { [key: string]: any };

	database_name?: string;
}

export type RouteRequest<ReqQuery = any, ReqBody = any, ResBody = any> = Request<any, ResBody, ReqBody, ReqQuery> & Partial<RouteRequestEnvironment>;

/**
 * Cria pastas de acordo com um caminho especificado, se não existirem.
 *
 * @param {string} dirPath - O caminho das pastas a serem criadas.
 */
const createDirectories = (dirPath: string) => {
	// Usa path.resolve para garantir um caminho absoluto.
	const absolutePath = path.resolve(dirPath);
	//return fs.mkdirSync(absolutePath, { recursive: true });

	if (!fs.existsSync(path.dirname(absolutePath))) {
		createDirectories(path.dirname(absolutePath));
	}

	if (!fs.existsSync(absolutePath)) {
		return fs.mkdirSync(absolutePath, { recursive: true });
	}
};

export class LocalServer extends AbstractLocalServer<LocalServer> {
	// Setup pause and resume methods
	protected paused: boolean = false;

	readonly isServer: boolean = true;
	readonly app: HttpApp = createExpress();
	readonly router: HttpRouter = this.createRouter();
	readonly server: Server = createServer(this.app);

	readonly clients: Map<string, ConnectedClient> = new Map();

	authCache: SimpleCache<string, DbUserAccountDetails> = new SimpleCache<string, DbUserAccountDetails>({ expirySeconds: 300, cloneValues: false, maxEntries: 1000 });

	readonly metaInfoCache: SimpleCache<
		number,
		{
			users: Record<
				string,
				{
					connections: number;
					disconnections: number;
				}
			>;
			stats: Record<
				string,
				{
					request: number;
					response: number;
				}
			>;
			cpuUsage: number;
			networkStats: {
				sent: number;
				received: number;
			};
			memoryUsage: { total: number; free: number; used: number };
			timestamp: number;
		}
	> = new SimpleCache<number, any>({ expirySeconds: 500, cloneValues: false, maxEntries: 1000 });

	readonly tokenSalt: { [dbName: string]: string } = {};

	constructor(localApp: IvipBaseApp, settings: Partial<ServerSettings> = {}) {
		super(localApp, settings);
		this.init();
	}

	async init() {
		// Quando atrás de um servidor de proxy confiável, req.ip e req.hostname serão definidos corretamente
		this.app.set("trust proxy", this.settings.trustProxy);

		// Analisa os corpos de solicitação JSON
		this.app.use(express.json({ limit: this.settings.maxPayloadSize })); // , extended: true ?

		const dir_temp = path.join(this.settings.localPath, "./temp");
		createDirectories(dir_temp);

		this.app.use(
			formData.parse({
				uploadDir: path.resolve(this.settings.localPath, "./temp"),
				autoClean: true,
			}),
		);

		this.app.use(formData.format());
		this.app.use(formData.stream());
		this.app.use(formData.union());

		this.app.use(`/${this.settings.rootPath}`, this.router);

		// Adiciona middleware de CORS
		addCorsMiddleware(this);

		// Adiciona middleware de cache
		addCacheMiddleware(this);

		if (Object.values(this.settings.dbAuth).findIndex((auth) => auth.enabled) >= 0) {
			// Setup auth database
			await setupAuthentication(this);

			// Add auth endpoints
			const { resetPassword, verifyEmailAddress } = addAuthenticionRoutes(this);
			this.resetPassword = resetPassword;
			this.verifyEmailAddress = verifyEmailAddress;
		}

		// Add metadata endpoints
		addMetadataRoutes(this);

		// If environment is development, add API docs
		if (process.env.NODE_ENV && process.env.NODE_ENV.trim() === "development") {
			this.debug.warn("DEVELOPMENT MODE: adding API docs endpoint at /docs");
			(await import("./routes/docs")).addRoute(this);
			(await import("./middleware/swagger")).addMiddleware(this);
		}

		addWebManagerRoutes(this);

		this.getLogBytesUsage = addLogBytesMiddleware(this);

		addDataRoutes(this);

		addStorageRoutes(this);

		this.extend = (database: string, method: HttpMethod, ext_path: string, handler: (req: HttpRequest, res: HttpResponse) => any) => {
			const route = `/ext/${database}/${ext_path}`;
			this.debug.log(`Extending server: `, method, route);
			this.router[method.toLowerCase() as expressRouteMethod](route, handler);
		};

		// Create websocket server
		addWebsocketServer(this);

		// Executar o retorno de chamada de inicialização para permitir que o código do usuário chame `server.extend`, `server.router.[method]`, `server.setRule`, etc., antes de o servidor começar a ouvir
		await this.settings.init?.(this);

		add404Middleware(this);

		// Iniciar escuta
		this.server.listen(this.settings.port, this.settings.host, () => {
			// Ready!!
			this.debug.log(`Server running at ${this.url} `);
			this.debug.warn(`Web manager running at ${this.url}/webmanager/ `);

			this.localApp.storage.ready(() => {
				this.emit(`ready`);
			});
		});
	}

	/**
	 * Cria um roteador Express
	 * @returns
	 */
	createRouter() {
		return createExpress.Router() as HttpRouter;
	}

	/**
	 * Interrompe temporariamente o servidor de lidar com conexões recebidas, mas mantém as conexões existentes abertas
	 */
	async pause(): Promise<void> {
		if (this.paused) {
			throw new Error("O servidor já está pausado");
		}
		this.server.close();
		this.debug.warn(`Paused server at ${this.url}`);
		this.emit("pause");
		this.paused = true;
	}

	/**
	 * Resumo do tratamento de conexões de entrada
	 */
	async resume(): Promise<void> {
		if (!this.paused) {
			throw new Error("O servidor não está pausado");
		}
		return new Promise((resolve) => {
			this.server.listen(this.settings.port, this.settings.host, () => {
				this.debug.warn(`Resumed server at ${this.url}`);
				this.emit("resume");
				this.paused = false;
				resolve();
			});
		});
	}

	/**
	 * Estende a API do servidor com suas próprias funções personalizadas. Seu manipulador estará ouvindo
	 * no caminho /ext/[nome do banco de dados]/[ext_path].
	 * @example
	 * // Lado do servidor:
	 * const _quotes = [...];
	 * server.extend('get', 'quotes/random', (req, res) => {
	 *      let index = Math.round(Math.random() * _quotes.length);
	 *      res.send(quotes[index]);
	 * })
	 * // Lado do cliente:
	 * client.callExtension('get', 'quotes/random')
	 * .then(quote => {
	 *      console.log(`Got random quote: ${quote}`);
	 * })
	 * @param method Método HTTP para associar
	 * @param ext_path Caminho para associar (anexado a /ext/)
	 * @param handler Seu callback de manipulador de solicitação do Express
	 */
	extend(database: string, method: HttpMethod, ext_path: string, handler: (req: HttpRequest, res: HttpResponse) => void) {
		throw new ServerNotReadyError();
	}
}
