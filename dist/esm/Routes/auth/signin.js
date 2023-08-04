"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const user_1 = require("../../Schema/user.js");
const Errors_1 = require("../../lib/Errors.js");
const Tokens_1 = require("../../lib/Tokens.js");
const Signin_1 = require("../../lib/Signin.js");
const addRoute = (env) => {
    if (!env.config.auth.enabled) {
        throw new Error("Authentication not enabled in the server settings");
    }
    env.router.post(`/auth/${env.db.name}/signin`, async (req, res) => {
        const details = req.body;
        const clientId = details.client_id || null; // NEW in AceBaseClient v0.9.4
        try {
            const user = await (0, Signin_1.signIn)(details, env, req);
            if (typeof clientId === "string" && env.clients.has(clientId)) {
                const client = env.clients.get(clientId);
                client.user = user; // Bind user to client socket
            }
            res.send({
                access_token: (0, Tokens_1.createPublicAccessToken)(user.uid, req.ip, user.access_token, env.tokenSalt),
                user: (0, user_1.getPublicAccountDetails)(user),
            });
        }
        catch (err) {
            if (typeof err.code === "string") {
                // Authentication error
                return (0, Errors_1.sendNotAuthenticatedError)(res, err.code, err.message);
            }
            // Unexpected error
            return (0, Errors_1.sendUnexpectedError)(res, err);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=signin.js.map