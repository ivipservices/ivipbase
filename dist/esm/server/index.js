import { AbstractLocalServer, ServerSettings } from "./browser.js";
import * as express from "express";
import { addMetadataRoutes } from "./routes/index.js";
import { createServer } from "http";
import { add404Middleware, addCacheMiddleware, addCorsMiddleware } from "./middleware/index.js";
const createExpress = express.default ?? express;
export { ServerSettings };
export const isPossiblyServer = true;
export class LocalServer extends AbstractLocalServer {
    constructor(appName, settings = {}) {
        super(appName, settings);
        this.appName = appName;
        // Setup pause and resume methods
        this.paused = false;
        this.isServer = true;
        this.app = createExpress();
        this.router = this.createRouter();
        this.server = createServer(this.app);
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
            (await import("./routes/docs.js")).addRoute(this);
            (await import("./middleware/swagger.js")).addMiddleware(this);
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
        return createExpress.Router();
    }
    /**
     * Interrompe temporariamente o servidor de lidar com conexões recebidas, mas mantém as conexões existentes abertas
     */
    async pause() {
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
    async resume() {
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
//# sourceMappingURL=index.js.map