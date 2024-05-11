import { LocalServer } from "..";
import cache from "memory-cache";
import type { Request, Response, NextFunction } from "express";

export const addMiddleware = (env: LocalServer) => {
	env.router.use((req: Request, res: Response, next: NextFunction) => {
		// Desativa o cache para solicitações GET para garantir que os navegadores não usem respostas em cache
		if (req.method === "GET") {
			res.setHeader("Cache-Control", "no-cache");

			const authorization = req.get("Authorization") ?? "Anonymous";
			const key = `__express__${req.originalUrl || req.url}_${authorization}`;
			const cachedBody = cache.get(key);

			if (cachedBody) {
				res.send(cachedBody);
				return;
			} else {
				(res as any).sendResponse = res.send;
				(res as any).send = (body: any) => {
					cache.put(key, body, 2000); // 2000 milissegundos (2 segundos) de cache
					(res as any).sendResponse(body);
				};
			}
		}
		next();
	});
};

export default addMiddleware;
