import cors from "cors";
/**
 * Obtém opções de CORS compatíveis com o pacote 'cors' (usado pelo Socket.IO 3+)
 * @param allowedOrigins Origens permitidas
 * @returns Opções de CORS
 */
export const getCorsOptions = (allowedOrigins) => {
    return {
        origin: allowedOrigins === "*" ? true : allowedOrigins === "" ? false : allowedOrigins.split(/,\s*/),
        methods: "GET,PUT,POST,DELETE,OPTIONS",
        allowedHeaders: "Content-Type, Authorization, Content-Length, Accept, Origin, X-Requested-With, DataBase-Context",
    };
};
/**
 * Obtém cabeçalhos CORS que podem ser enviados em solicitações de preflight (OPTIONS)
 * @param allowedOrigins Origem(s) permitida(s) configurada(s). Exemplos: `'https://meu.servidor.com'` para uma origem permitida específica, `'*'` para qualquer origem (retorna a origem atual), `''` para desativar o CORS (permitindo apenas localhost), ou `'http://servidor1.com,https://servidor1.com,https://servidor2.com'` para várias origens permitidas
 * @param currentOrigin Origem atual dos cabeçalhos da solicitação
 * @returns
 */
export const getCorsHeaders = (allowedOrigins, currentOrigin) => {
    const corsOptions = getCorsOptions(allowedOrigins);
    const origins = typeof corsOptions.origin === "boolean" ? (corsOptions.origin ? currentOrigin ?? "*" : "") : corsOptions.origin instanceof Array ? corsOptions.origin.join(",") : corsOptions.origin;
    return {
        "Access-Control-Allow-Origin": origins,
        "Access-Control-Allow-Methods": corsOptions.methods,
        "Access-Control-Allow-Headers": corsOptions.allowedHeaders,
        "Access-Control-Expose-Headers": "Date, DataBase-Context",
    };
};
export const addMiddleware = (env) => {
    env.router.use((req, res, next) => {
        const headers = getCorsHeaders(env.settings.allowOrigin, req.headers.origin);
        for (const name in headers) {
            res.setHeader(name, headers[name]);
        }
        if (req.method === "OPTIONS") {
            // Return 200 OK
            return res.status(200).end();
        }
        next();
    });
    env.router.use(cors((req, callback) => {
        const headers = getCorsHeaders(env.settings.allowOrigin, req.headers.origin);
        let corsOptions = { origin: false };
        const whitelist = headers["Access-Control-Allow-Origin"].split(/,\s*/);
        if (whitelist.includes(req.headers.origin ?? "") || whitelist.includes("*")) {
            corsOptions = { origin: true }; // reflect (enable) the requested origin in the CORS response
        }
        else {
            corsOptions = { origin: false }; // disable CORS for this request
        }
        callback(null, corsOptions); // callback expects two parameters: error and options
    }));
};
export default addMiddleware;
//# sourceMappingURL=cors.js.map