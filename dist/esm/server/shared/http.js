"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRouter = exports.createApp = void 0;
const express = require("express");
const cors = require("../middleware/cors.js");
const createExpress = express.default ?? express; // ESM and CJS compatible approach
/**
 * Creates an app that handles http requests, adds json body parsing.
 * @param settings
 * @returns
 */
const createApp = (settings) => {
    const app = createExpress();
    // When behind a trusted proxy server, req.ip and req.hostname will be set the right way
    app.set('trust proxy', settings.trustProxy);
    // Parse json request bodies
    app.use(express.json({ limit: settings.maxPayloadSize })); // , extended: true ?
    app.use((req, res, next) => {
        const headers = (0, cors.getCorsHeaders)(settings.config.allowOrigin, req.headers.origin);
        for (const name in headers) {
            res.setHeader(name, headers[name]);
        }
        next();
    });
    return app;
};
exports.createApp = createApp;
/**
 * Creates an express router
 * @returns
 */
const createRouter = () => {
    return createExpress.Router();
};
exports.createRouter = createRouter;
//# sourceMappingURL=http.js.map