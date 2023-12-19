"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMiddleware = void 0;
const addMiddleware = (env) => {
    env.router.use((req, res, next) => {
        // Desativa o cache para solicitações GET para garantir que os navegadores não usem respostas em cache
        if (req.method === "GET") {
            res.setHeader("Cache-Control", "no-cache");
        }
        next();
    });
};
exports.addMiddleware = addMiddleware;
exports.default = exports.addMiddleware;
//# sourceMappingURL=cache.js.map