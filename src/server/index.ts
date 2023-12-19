import { AbstractLocalServer, ServerSettings } from "./browser";
import type { Socket } from "socket.io";
import type { Express, Request, Response } from "express";
import * as express from "express";
import { addMetadataRoutes } from "./routes";
import { Server, createServer } from "http";
import { DbUserAccountDetails } from "./schema/user";
import { add404Middleware, addCacheMiddleware, addCorsMiddleware } from "./middleware";
const createExpress = (express as any).default ?? express;

export { ServerSettings };

export const isPossiblyServer = true;

export type HttpApp = express.Express;
export type HttpRouter = express.Router;
export type HttpSocket = Socket;
export type HttpRequest = express.Request;
export type HttpResponse = express.Response;
export { Express, Request, Response };

export interface RouteRequestEnvironment {
	/** Se a solicitação tiver um token "Authentication: bearer", o usuário será associado à solicitação recebida */
	user?: DbUserAccountDetails;

	/** Se o contexto for enviado pelo cabeçalho iVipBase-Context, será associado à solicitação recebida */
	context: { [key: string]: any };
}

export type RouteRequest<ReqQuery = any, ReqBody = any, ResBody = any> = Request<any, ResBody, ReqBody, ReqQuery> & Partial<RouteRequestEnvironment>;

export class LocalServer extends AbstractLocalServer<LocalServer> {
	// Setup pause and resume methods
	protected paused: boolean = false;

	readonly isServer: boolean = true;
	readonly app: HttpApp = createExpress();
	readonly router: HttpRouter = this.createRouter();
	readonly server: Server = createServer(this.app);

	constructor(readonly appName: string, settings: Partial<ServerSettings> = {}) {
		super(appName, settings);
		this.init();
	}

	async init() {
		// Quando atrás de um servidor de proxy confiável, req.ip e req.hostname serão definidos corretamente
		this.app.set("trust proxy", this.settings.trustProxy);

		// Analisa os corpos de solicitação JSON
		this.app.use(express.json({ limit: this.settings.maxPayloadSize })); // , extended: true ?

		this.app.use(`/${this.settings.rootPath}`, this.router);

		// Adiciona middleware de CORS
		addCorsMiddleware(this);

		// Adiciona middleware de cache
		addCacheMiddleware(this);

		addMetadataRoutes(this);

		// If environment is development, add API docs
		if (process.env.NODE_ENV && process.env.NODE_ENV.trim() === "development") {
			this.debug.warn("DEVELOPMENT MODE: adding API docs endpoint at /docs");
			(await import("./routes/docs")).addRoute(this);
			(await import("./middleware/swagger")).addMiddleware(this);
		}

		// Executar o retorno de chamada de inicialização para permitir que o código do usuário chame `server.extend`, `server.router.[method]`, `server.setRule`, etc., antes de o servidor começar a ouvir
		await this.settings.init?.(this);

		add404Middleware(this);

		// Iniciar escuta
		this.server.listen(this.settings.port, this.settings.host, () => {
			// Ready!!
			this.debug.log(`"${this.settings.serverName}" server running at ${this.url}`);
			this.emitOnce(`ready`);
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
		this.debug.warn(`Paused "${this.settings.serverName}" server at ${this.url}`);
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
				this.debug.warn(`Resumed "${this.settings.serverName}" server at ${this.url}`);
				this.emit("resume");
				this.paused = false;
				resolve();
			});
		});
	}
}
