import { sendError, sendUnauthorizedError } from "../../shared/error.js";
export const addRoute = (env) => {
    env.router.delete(`/storage/:dbName/*`, async (req, res) => {
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return sendError(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const path = req.params["0"];
        if (!req.user) {
            return sendUnauthorizedError(res, "storage/unauthorized", "Você deve estar logado para acessar este recurso");
        }
        try {
            const storage = env.storageFile(dbName);
            await storage.delete(path);
            res.send({ message: "Storage removed successfully." });
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err);
        }
    });
};
export default addRoute;
//# sourceMappingURL=delete.js.map