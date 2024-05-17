"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMiddleware = void 0;
const error_1 = require("../shared/error");
const signin_1 = require("../shared/signin");
const tokens_1 = require("../shared/tokens");
const addMiddleware = (env) => {
    // Add bearer authentication middleware
    env.router.use(async (req, res, next) => {
        let authorization = req.get("Authorization");
        if (typeof authorization !== "string" && "auth_token" in req.query) {
            // Enables browser calls to be authenticated by adding the access token as auth_token query parameter
            if (req.path.startsWith("/export/") || req.path.startsWith("/logs")) {
                // For now, only allow '/export' or '/logs' api calls
                // In the future, use these prerequisites:
                // - user must be currently authenticated (in cache)
                // - ip address must match the token
                authorization = "Bearer " + req.query.auth_token;
            }
        }
        if (!env.tokenSalt) {
            // Token salt not ready yet, skip authentication
            return next();
        }
        if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
            const token = authorization.slice(7);
            let tokenDetails;
            try {
                tokenDetails = (0, tokens_1.decodePublicAccessToken)(token, env.tokenSalt);
            }
            catch (err) {
                return (0, error_1.sendNotAuthenticatedError)(res, "invalid_token", "The passed token is invalid. Sign in again");
            }
            // Is this token cached?
            let user = env.authCache.get(tokenDetails.uid);
            if (!user) {
                // Query database to get user for this token
                try {
                    user = await (0, signin_1.signIn)({ database: tokenDetails.database, method: "internal", access_token: tokenDetails.access_token }, env, req);
                }
                catch (err) {
                    return (0, error_1.sendNotAuthenticatedError)(res, err.code, err.message);
                }
            }
            req.user = user;
            if (req.user.is_disabled === true) {
                return (0, error_1.sendNotAuthenticatedError)(res, "account_disabled", "Your account has been disabled. Contact your database administrator");
            }
        }
        next();
    });
};
exports.addMiddleware = addMiddleware;
exports.default = exports.addMiddleware;
//# sourceMappingURL=user.js.map