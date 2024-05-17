import cache from "memory-cache";
export const addMiddleware = (env) => {
    env.router.use((req, res, next) => {
        // Desativa o cache para solicitações GET para garantir que os navegadores não usem respostas em cache
        if (req.method === "GET") {
            res.setHeader("Cache-Control", "no-cache");
            const authorization = req.get("Authorization") ?? "Anonymous";
            const key = `__express__${req.originalUrl || req.url}_${authorization}`;
            const cachedBody = cache.get(key);
            if (cachedBody) {
                res.send(cachedBody);
                return;
            }
            else {
                res.sendResponse = res.send;
                res.send = (body) => {
                    cache.put(key, body, 2000); // 2000 milissegundos (2 segundos) de cache
                    res.sendResponse(body);
                };
            }
        }
        next();
    });
};
export default addMiddleware;
//# sourceMappingURL=cache.js.map