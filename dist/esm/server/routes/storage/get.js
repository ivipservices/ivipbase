import { sendError, sendUnauthorizedError } from "../../shared/error.js";
import fs from "fs";
export const addRoute = (env) => {
    env.router.get(`/storage/:dbName/*`, async (req, res) => {
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
        const dirUpload = path.join(env.settings.localPath, `./${dbName}/storage-uploads`);
        if (!fs.existsSync(dirUpload)) {
            fs.mkdirSync(dirUpload);
        }
        try {
            const ref = env.db(dbName).ref(`__storage__`).child(path);
            const { path: _path, metadata } = await ref
                .get()
                .then((snap) => Promise.resolve(snap.val() ?? {
                path: null,
            }))
                .catch(() => Promise.resolve({
                path: null,
            }));
            if (typeof _path === "string") {
                const storage_path = path.resolve(env.settings.localPath, `./${dbName}`, _path);
                if (fs.existsSync(storage_path)) {
                    res.type(metadata.contentType);
                    return res.sendFile(_path, { root: path.resolve(env.settings.localPath, `./${dbName}`) });
                }
                else {
                    await ref.remove();
                }
            }
            return sendError(res, {
                code: "storage/unknown",
                message: "File not found!",
            });
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err);
        }
    });
};
export default addRoute;
//# sourceMappingURL=get.js.map