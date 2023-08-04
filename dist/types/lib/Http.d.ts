export type { Express, Request, Response } from "express";
import * as express from "express";
import { ServerConfig } from "../server/settings";
/**
 * Creates an app that handles http requests, adds json body parsing.
 * @param settings
 * @returns
 */
export declare const createApp: (settings: {
    trustProxy: boolean;
    maxPayloadSize: string;
    config: ServerConfig;
}) => express.Express;
/**
 * Creates an express router
 * @returns
 */
export declare const createRouter: () => express.Router;
//# sourceMappingURL=Http.d.ts.map