import { getPublicAccountDetails } from "../../schema/user.js";
import { sendError, sendNotAuthenticatedError, sendUnexpectedError } from "../../shared/error.js";
import { signIn } from "../../shared/signin.js";
import { createPublicAccessToken } from "../../shared/tokens.js";
export const addRoutes = (env) => {
    if (!env.settings.auth.enabled) {
        throw new Error("Authentication not enabled in the server settings");
    }
    env.router.post(`/auth/:dbName/signin`, async (req, res) => {
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return sendError(res, {
                code: "auth/system-error",
                message: `Database '${dbName}' not found`,
            });
        }
        if (!env.tokenSalt) {
            return sendError(res, {
                code: "auth/system-error",
                message: "Token salt not ready",
            });
        }
        const details = req.body;
        const clientId = details.client_id || null;
        try {
            const user = await signIn(dbName, details, env, req);
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
                access_token: createPublicAccessToken(dbName, user.uid, req.ip, user.access_token, env.tokenSalt),
                user: getPublicAccountDetails(user),
            });
        }
        catch (err) {
            if (typeof err.code === "string") {
                // Authentication error
                return sendNotAuthenticatedError(res, err.code, err.message);
            }
            // Unexpected error
            return sendUnexpectedError(res, err);
        }
    });
};
export default addRoutes;
//# sourceMappingURL=signin.js.map