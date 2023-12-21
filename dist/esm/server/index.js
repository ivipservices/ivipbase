import { AbstractLocalServer, ServerSettings, ServerNotReadyError } from "./browser.js";
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
            (await import("./routes/docs/index.js")).addRoute(this);
            (await import("./middleware/swagger.js")).addMiddleware(this);
        }
        this.extend = (method, ext_path, handler) => {
            const route = `/ext/${this.db.name}/${ext_path}`;
            this.debug.log(`Extending server: `, method, route);
            this.router[method.toLowerCase()](route, handler);
        };
        // Executar o retorno de chamada de inicialização para permitir que o código do usuário chame `server.extend`, `server.router.[method]`, `server.setRule`, etc., antes de o servidor começar a ouvir
        await this.settings.init?.(this);
        add404Middleware(this);
        // Iniciar escuta
        this.server.listen(this.settings.port, this.settings.host, () => {
            // Ready!!
            this.debug.log(`"${this.db.name}" server running at ${this.url}`);
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
        this.debug.warn(`Paused "${this.db.name}" server at ${this.url}`);
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
                this.debug.warn(`Resumed "${this.db.name}" server at ${this.url}`);
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
    extend(method, ext_path, handler) {
        throw new ServerNotReadyError();
    }
}
//# sourceMappingURL=index.js.map