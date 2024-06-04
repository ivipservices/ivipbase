import { AbstractLocalServer, ServerSettings, ServerNotReadyError } from "./browser.js";
import * as express from "express";
import { addMetadataRoutes, addDataRoutes, addAuthenticionRoutes, addWebManagerRoutes, addStorageRoutes } from "./routes/index.js";
import { createServer } from "http";
import { add404Middleware, addCacheMiddleware, addCorsMiddleware } from "./middleware/index.js";
import { setupAuthentication } from "./services/auth.js";
import { SimpleCache } from "ivipbase-core";
import { addWebsocketServer } from "./websocket/index.js";
import formData from "express-form-data";
import path from "path";
import fs from "fs";
const createExpress = express.default ?? express;
export { ServerSettings };
export const isPossiblyServer = true;
/**
 * Cria pastas de acordo com um caminho especificado, se não existirem.
 *
 * @param {string} dirPath - O caminho das pastas a serem criadas.
 */
const createDirectories = (dirPath) => {
    // Usa path.resolve para garantir um caminho absoluto.
    const absolutePath = path.resolve(dirPath);
    if (!fs.existsSync(path.basename(absolutePath))) {
        createDirectories(path.dirname(absolutePath));
    }
    if (!fs.existsSync(absolutePath)) {
        fs.mkdirSync(absolutePath, { recursive: true });
    }
};
export class LocalServer extends AbstractLocalServer {
    constructor(localApp, settings = {}) {
        super(localApp, settings);
        // Setup pause and resume methods
        this.paused = false;
        this.isServer = true;
        this.app = createExpress();
        this.router = this.createRouter();
        this.server = createServer(this.app);
        this.clients = new Map();
        this.authCache = new SimpleCache({ expirySeconds: 300, cloneValues: false, maxEntries: 1000 });
        this.metaInfoCache = new SimpleCache({ expirySeconds: 500, cloneValues: false, maxEntries: 1000 });
        this.tokenSalt = {};
        this.init();
    }
    async init() {
        // Quando atrás de um servidor de proxy confiável, req.ip e req.hostname serão definidos corretamente
        this.app.set("trust proxy", this.settings.trustProxy);
        // Analisa os corpos de solicitação JSON
        this.app.use(express.json({ limit: this.settings.maxPayloadSize })); // , extended: true ?
        const dir_temp = path.join(this.settings.localPath, "./temp");
        createDirectories(dir_temp);
        this.app.use(formData.parse({
            uploadDir: path.resolve(this.settings.localPath, "./temp"),
            autoClean: true,
        }));
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
            (await import("./routes/docs/index.js")).addRoute(this);
            (await import("./middleware/swagger.js")).addMiddleware(this);
        }
        addDataRoutes(this);
        addStorageRoutes(this);
        addWebManagerRoutes(this);
        this.extend = (database, method, ext_path, handler) => {
            const route = `/ext/${database}/${ext_path}`;
            this.debug.log(`Extending server: `, method, route);
            this.router[method.toLowerCase()](route, handler);
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
        this.debug.warn(`Paused server at ${this.url}`);
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
    extend(database, method, ext_path, handler) {
        throw new ServerNotReadyError();
    }
}
//# sourceMappingURL=index.js.map