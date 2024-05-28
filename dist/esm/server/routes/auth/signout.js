import { sendError, sendUnexpectedError } from "../../shared/error.js";
export const addRoutes = (env) => {
    env.router.post(`/auth/:dbName/signout`, async (req, res) => {
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return sendError(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const LOG_ACTION = "auth.signout";
        const LOG_DETAILS = { ip: req.ip, uid: req.user?.uid ?? null };
        try {
            if (req.user) {
                const client = typeof req.body.client_id === "string" ? env.clients.get(req.body.client_id) : null;
                if (client) {
                    client.user.delete(dbName);
                }
                const signOutEverywhere = typeof req.body === "object" && req.body.everywhere === true;
                if (signOutEverywhere) {
                    env.authCache.remove(req.user.uid ?? "");
                    for (const client of env.clients.values()) {
                        if (client.user.get(dbName)?.uid === req.user.uid) {
                            client.user.delete(dbName);
                        }
                    }
                }
                // Remove token from user's auth node
                await env
                    .authRef(dbName)
                    .child(req.user.uid)
                    .transaction((snap) => {
                    if (!snap.exists()) {
                        return;
                    }
                    const user = snap.val();
                    if (signOutEverywhere) {
                        user.access_token = null;
                    }
                    user.last_signout = new Date();
                    user.last_signout_ip = req.ip;
                    return user;
                });
                // env.log.event(LOG_ACTION, LOG_DETAILS);
            }
            res.send("Bye!");
        }
        catch (err) {
            env.log.error(LOG_ACTION, "unexpected", { ...LOG_DETAILS, message: err instanceof Error ? err.message : err.toString() });
            sendUnexpectedError(res, err);
        }
    });
};
export default addRoutes;
//# sourceMappingURL=signout.js.map