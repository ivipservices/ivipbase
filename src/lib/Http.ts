export type { Express, Request, Response } from "express";
import * as express from "express";
import * as cors from "src/Middleware/cors";
import { ServerConfig } from "src/server/settings";
const createExpress = (express as any).default ?? express; // ESM and CJS compatible approach

import { HttpApp, HttpRouter } from "src/types";

/**
 * Creates an app that handles http requests, adds json body parsing.
 * @param settings
 * @returns
 */
export const createApp = (settings: { trustProxy: boolean; maxPayloadSize: string; config: ServerConfig }) => {
	const app = createExpress();

	// When behind a trusted proxy server, req.ip and req.hostname will be set the right way
	app.set("trust proxy", settings.trustProxy);

	// Parse json request bodies
	app.use(express.json({ limit: settings.maxPayloadSize })); // , extended: true ?

	app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
		const headers = (0, cors.getCorsHeaders)(settings.config.allowOrigin, req.headers.origin);
		for (const name in headers) {
			res.setHeader(name, headers[name]);
		}
		next();
	});

	return app as HttpApp;
};

/**
 * Creates an express router
 * @returns
 */
export const createRouter = () => {
	return createExpress.Router() as HttpRouter;
};
