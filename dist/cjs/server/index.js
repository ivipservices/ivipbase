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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
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
const auth_1 = require("./services/auth");
const ivipbase_core_1 = require("ivipbase-core");
const websocket_1 = require("./websocket");
const express_form_data_1 = __importDefault(require("express-form-data"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const createExpress = (_a = express.default) !== null && _a !== void 0 ? _a : express;
exports.isPossiblyServer = true;
/**
 * Cria pastas de acordo com um caminho especificado, se não existirem.
 *
 * @param {string} dirPath - O caminho das pastas a serem criadas.
 */
const createDirectories = (dirPath) => {
    // Usa path.resolve para garantir um caminho absoluto.
    const absolutePath = path_1.default.resolve(dirPath);
    if (!fs_1.default.existsSync(path_1.default.basename(absolutePath))) {
        createDirectories(path_1.default.dirname(absolutePath));
    }
    if (!fs_1.default.existsSync(absolutePath)) {
        fs_1.default.mkdirSync(absolutePath, { recursive: true });
    }
};
class LocalServer extends browser_1.AbstractLocalServer {
    constructor(localApp, settings = {}) {
        super(localApp, settings);
        // Setup pause and resume methods
        this.paused = false;
        this.isServer = true;
        this.app = createExpress();
        this.router = this.createRouter();
        this.server = (0, http_1.createServer)(this.app);
        this.clients = new Map();
        this.authCache = new ivipbase_core_1.SimpleCache({ expirySeconds: 300, cloneValues: false, maxEntries: 1000 });
        this.metaInfoCache = new ivipbase_core_1.SimpleCache({ expirySeconds: 500, cloneValues: false, maxEntries: 1000 });
        this.tokenSalt = {};
        this.init();
    }
    async init() {
        var _a, _b;
        // Quando atrás de um servidor de proxy confiável, req.ip e req.hostname serão definidos corretamente
        this.app.set("trust proxy", this.settings.trustProxy);
        // Analisa os corpos de solicitação JSON
        this.app.use(express.json({ limit: this.settings.maxPayloadSize })); // , extended: true ?
        const dir_temp = path_1.default.join(this.settings.localPath, "./temp");
        createDirectories(dir_temp);
        this.app.use(express_form_data_1.default.parse({
            uploadDir: path_1.default.resolve(this.settings.localPath, "./temp"),
            autoClean: true,
        }));
        this.app.use(express_form_data_1.default.format());
        this.app.use(express_form_data_1.default.stream());
        this.app.use(express_form_data_1.default.union());
        this.app.use(`/${this.settings.rootPath}`, this.router);
        // Adiciona middleware de CORS
        (0, middleware_1.addCorsMiddleware)(this);
        // Adiciona middleware de cache
        (0, middleware_1.addCacheMiddleware)(this);
        if (Object.values(this.settings.dbAuth).findIndex((auth) => auth.enabled) >= 0) {
            // Setup auth database
            await (0, auth_1.setupAuthentication)(this);
            // Add auth endpoints
            const { resetPassword, verifyEmailAddress } = (0, routes_1.addAuthenticionRoutes)(this);
            this.resetPassword = resetPassword;
            this.verifyEmailAddress = verifyEmailAddress;
        }
        // Add metadata endpoints
        (0, routes_1.addMetadataRoutes)(this);
        // If environment is development, add API docs
        if (process.env.NODE_ENV && process.env.NODE_ENV.trim() === "development") {
            this.debug.warn("DEVELOPMENT MODE: adding API docs endpoint at /docs");
            (await Promise.resolve().then(() => __importStar(require("./routes/docs")))).addRoute(this);
            (await Promise.resolve().then(() => __importStar(require("./middleware/swagger")))).addMiddleware(this);
        }
        (0, routes_1.addWebManagerRoutes)(this);
        this.getLogBytesUsage = (0, middleware_1.addLogBytesMiddleware)(this);
        (0, routes_1.addDataRoutes)(this);
        (0, routes_1.addStorageRoutes)(this);
        this.extend = (database, method, ext_path, handler) => {
            const route = `/ext/${database}/${ext_path}`;
            this.debug.log(`Extending server: `, method, route);
            this.router[method.toLowerCase()](route, handler);
        };
        // Create websocket server
        (0, websocket_1.addWebsocketServer)(this);
        // Executar o retorno de chamada de inicialização para permitir que o código do usuário chame `server.extend`, `server.router.[method]`, `server.setRule`, etc., antes de o servidor começar a ouvir
        await ((_b = (_a = this.settings).init) === null || _b === void 0 ? void 0 : _b.call(_a, this));
        (0, middleware_1.add404Middleware)(this);
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
        throw new browser_1.ServerNotReadyError();
    }
}
exports.LocalServer = LocalServer;
//# sourceMappingURL=index.js.map