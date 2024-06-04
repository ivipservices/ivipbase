"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const user_1 = require("../../schema/user");
const error_1 = require("../../shared/error");
const signin_1 = require("../../shared/signin");
const tokens_1 = require("../../shared/tokens");
const addRoutes = (env) => {
    if (!env.settings.auth.enabled) {
        throw new Error("Authentication not enabled in the server settings");
    }
    env.router.post(`/auth/:dbName/signin`, async (req, res) => {
        var _a;
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "auth/system-error",
                message: `Database '${dbName}' not found`,
            });
        }
        const tokenSalt = env.tokenSalt[dbName];
        if (!tokenSalt) {
            return (0, error_1.sendError)(res, {
                code: "auth/system-error",
                message: "Token salt not ready",
            });
        }
        const details = req.body;
        const clientId = details.client_id || null;
        try {
            const user = await (0, signin_1.signIn)(dbName, details, env, req);
            if (!user || !user.uid || !user.access_token) {
                throw new Error("User not found");
            }
            if (typeof clientId === "string" && env.clients.has(clientId)) {
                const client = env.clients.get(clientId);
                if (!client) {
                    throw new Error(`Client with id ${clientId} not found`);
                }
                client.user.delete(dbName); // Bind user to client socket
            }
            res.send({
                access_token: (0, tokens_1.createPublicAccessToken)(dbName, user.uid, (_a = req.ip) !== null && _a !== void 0 ? _a : "0.0.0.0", user.access_token, tokenSalt),
                user: (0, user_1.getPublicAccountDetails)(user),
            });
        }
        catch (err) {
            if (typeof err.code === "string") {
                // Authentication error
                return (0, error_1.sendNotAuthenticatedError)(res, err.code, err.message);
            }
            // Unexpected error
            return (0, error_1.sendUnexpectedError)(res, err);
        }
    });
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=signin.js.map