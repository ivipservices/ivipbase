"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMiddleware = void 0;
const memory_cache_1 = __importDefault(require("memory-cache"));
const addMiddleware = (env) => {
    env.router.use((req, res, next) => {
        var _a;
        // Desativa o cache para solicitações GET para garantir que os navegadores não usem respostas em cache
        if (req.method === "GET") {
            res.setHeader("Cache-Control", "no-cache");
            const authorization = (_a = req.get("Authorization")) !== null && _a !== void 0 ? _a : "Anonymous";
            const key = `__express__${req.originalUrl || req.url}_${authorization}`;
            const cachedBody = memory_cache_1.default.get(key);
            if (cachedBody) {
                res.send(cachedBody);
                return;
            }
            else {
                res.sendResponse = res.send;
                res.send = (body) => {
                    memory_cache_1.default.put(key, body, 2000); // 2000 milissegundos (2 segundos) de cache
                    res.sendResponse(body);
                };
            }
        }
        next();
    });
};
exports.addMiddleware = addMiddleware;
exports.default = exports.addMiddleware;
//# sourceMappingURL=cache.js.map