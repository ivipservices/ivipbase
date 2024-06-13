import { sendError, sendUnauthorizedError } from "../../shared/error.js";
import fs from "fs";
import getRawBody from "raw-body";
export const addRoute = (env) => {
    env.router.put(`/storage/:dbName/*`, async (req, res) => {
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return sendError(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const path = req.params[0];
        if (!req.user) {
            return sendUnauthorizedError(res, "storage/unauthorized", "Você deve estar logado para acessar este recurso");
        }
        const data = await new Promise((resolve, reject) => getRawBody(req, async (err, body) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(body);
            }
        }));
        const format = req.query.format ?? req.body.format;
        const contentType = req.query.contentType ?? req.body.contentType;
        try {
            const storage = env.storageFile(dbName);
            if (typeof format === "string" && ["base64", "base64url", "text", "raw", "data_url"].includes(format)) {
                const p = await storage.putString(path, req.body.data ?? "", format);
                return res.send(p);
            }
            else if (req.body.file && typeof req.body.file.path === "string") {
                const tempData = await new Promise((resolve, reject) => {
                    fs.readFile(req.body.file.path, (err, data) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve(data);
                        }
                    });
                });
                const p = await storage.put(path, tempData, contentType ? { contentType: contentType } : undefined);
                return res.send(p);
            }
            else if (data instanceof Buffer) {
                const p = await storage.put(path, data, contentType ? { contentType: contentType } : undefined);
                return res.send(p);
            }
            else {
                return sendError(res, {
                    code: "storage/unknown",
                    message: "Invalid request",
                });
            }
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err);
        }
    });
};
export default addRoute;
//# sourceMappingURL=put.js.map