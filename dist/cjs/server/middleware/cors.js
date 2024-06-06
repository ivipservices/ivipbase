"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMiddleware = exports.getCorsHeaders = exports.getCorsOptions = void 0;
const cors_1 = __importDefault(require("cors"));
/**
 * Obtém opções de CORS compatíveis com o pacote 'cors' (usado pelo Socket.IO 3+)
 * @param allowedOrigins Origens permitidas
 * @returns Opções de CORS
 */
const getCorsOptions = (allowedOrigins) => {
    return {
        origin: allowedOrigins === "*" ? true : allowedOrigins === "" ? false : allowedOrigins.split(/,\s*/),
        methods: "GET,PUT,POST,DELETE,OPTIONS",
        allowedHeaders: "Content-Type, Authorization, Content-Length, Accept, Origin, X-Requested-With, DataBase-Context",
    };
};
exports.getCorsOptions = getCorsOptions;
/**
 * Obtém cabeçalhos CORS que podem ser enviados em solicitações de preflight (OPTIONS)
 * @param allowedOrigins Origem(s) permitida(s) configurada(s). Exemplos: `'https://meu.servidor.com'` para uma origem permitida específica, `'*'` para qualquer origem (retorna a origem atual), `''` para desativar o CORS (permitindo apenas localhost), ou `'http://servidor1.com,https://servidor1.com,https://servidor2.com'` para várias origens permitidas
 * @param currentOrigin Origem atual dos cabeçalhos da solicitação
 * @returns
 */
const getCorsHeaders = (allowedOrigins, currentOrigin) => {
    const corsOptions = (0, exports.getCorsOptions)(allowedOrigins);
    const origins = typeof corsOptions.origin === "boolean" ? (corsOptions.origin ? currentOrigin !== null && currentOrigin !== void 0 ? currentOrigin : "*" : "") : corsOptions.origin instanceof Array ? corsOptions.origin.join(",") : corsOptions.origin;
    return {
        "Access-Control-Allow-Origin": origins,
        "Access-Control-Allow-Methods": corsOptions.methods,
        "Access-Control-Allow-Headers": corsOptions.allowedHeaders,
        "Access-Control-Expose-Headers": "Date, DataBase-Context",
    };
};
exports.getCorsHeaders = getCorsHeaders;
const addMiddleware = (env) => {
    env.router.use((req, res, next) => {
        const headers = (0, exports.getCorsHeaders)(env.settings.allowOrigin, req.headers.origin);
        for (const name in headers) {
            res.setHeader(name, headers[name]);
        }
        if (req.method === "OPTIONS") {
            // Return 200 OK
            return res.status(200).end();
        }
        next();
    });
    env.router.use((0, cors_1.default)((req, callback) => {
        var _a;
        const headers = (0, exports.getCorsHeaders)(env.settings.allowOrigin, req.headers.origin);
        let corsOptions = { origin: false };
        const whitelist = headers["Access-Control-Allow-Origin"].split(/,\s*/);
        if (whitelist.includes((_a = req.headers.origin) !== null && _a !== void 0 ? _a : "") || whitelist.includes("*")) {
            corsOptions = { origin: true }; // reflect (enable) the requested origin in the CORS response
        }
        else {
            corsOptions = { origin: false }; // disable CORS for this request
        }
        callback(null, corsOptions); // callback expects two parameters: error and options
    }));
};
exports.addMiddleware = addMiddleware;
exports.default = exports.addMiddleware;
//# sourceMappingURL=cors.js.map