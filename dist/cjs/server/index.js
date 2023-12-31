"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalServer = exports.isPossiblyServer = exports.ServerSettings = void 0;
const browser_1 = require("./browser");
Object.defineProperty(exports, "ServerSettings", { enumerable: true, get: function () { return browser_1.ServerSettings; } });
const express = __importStar(require("express"));
const routes_1 = require("./routes");
const http_1 = require("http");
const middleware_1 = require("./middleware");
const createExpress = (_a = express.default) !== null && _a !== void 0 ? _a : express;
exports.isPossiblyServer = true;
class LocalServer extends browser_1.AbstractLocalServer {
    constructor(appName, settings = {}) {
        super(appName, settings);
        this.appName = appName;
        // Setup pause and resume methods
        this.paused = false;
        this.isServer = true;
        this.app = createExpress();
        this.router = this.createRouter();
        this.server = (0, http_1.createServer)(this.app);
        this.init();
    }
    async init() {
        var _a, _b;
        // Quando atrás de um servidor de proxy confiável, req.ip e req.hostname serão definidos corretamente
        this.app.set("trust proxy", this.settings.trustProxy);
        // Analisa os corpos de solicitação JSON
        this.app.use(express.json({ limit: this.settings.maxPayloadSize })); // , extended: true ?
        this.app.use(`/${this.settings.rootPath}`, this.router);
        // Adiciona middleware de CORS
        (0, middleware_1.addCorsMiddleware)(this);
        // Adiciona middleware de cache
        (0, middleware_1.addCacheMiddleware)(this);
        (0, routes_1.addMetadataRoutes)(this);
        // If environment is development, add API docs
        if (process.env.NODE_ENV && process.env.NODE_ENV.trim() === "development") {
            this.debug.warn("DEVELOPMENT MODE: adding API docs endpoint at /docs");
            (await Promise.resolve().then(() => __importStar(require("./routes/docs")))).addRoute(this);
            (await Promise.resolve().then(() => __importStar(require("./middleware/swagger")))).addMiddleware(this);
        }
        this.extend = (method, ext_path, handler) => {
            const route = `/ext/${this.db.name}/${ext_path}`;
            this.debug.log(`Extending server: `, method, route);
            this.router[method.toLowerCase()](route, handler);
        };
        // Executar o retorno de chamada de inicialização para permitir que o código do usuário chame `server.extend`, `server.router.[method]`, `server.setRule`, etc., antes de o servidor começar a ouvir
        await ((_b = (_a = this.settings).init) === null || _b === void 0 ? void 0 : _b.call(_a, this));
        (0, middleware_1.add404Middleware)(this);
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
        throw new browser_1.ServerNotReadyError();
    }
}
exports.LocalServer = LocalServer;
//# sourceMappingURL=index.js.map