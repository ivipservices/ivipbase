import { sendError } from "../../shared/error.js";
import fs from "fs";
import path from "path";
export const addRoute = (env) => {
    env.router.get(`/storage/:dbName/*`, async (req, res) => {
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return sendError(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const dirUpload = path.join(env.settings.localPath, `./${dbName}/storage-uploads`);
        if (!fs.existsSync(dirUpload)) {
            fs.mkdirSync(dirUpload);
        }
        try {
            const ref = env.db(dbName).ref(`__storage__`).child(req.params["0"]);
            let { path: _path, isFile, metadata, } = await ref
                .get()
                .then((snap) => Promise.resolve(snap.val() ?? {
                path: null,
            }))
                .catch(() => Promise.resolve({
                path: null,
            }));
            isFile = typeof isFile === "boolean" ? isFile : typeof metadata === "object" && metadata?.contentType ? true : false;
            if (typeof _path === "string" && isFile) {
                const storage_path = path.resolve(env.settings.localPath, `./${dbName}`, _path);
                if (fs.existsSync(storage_path)) {
                    res.type(metadata.contentType);
                    return res.sendFile(_path, { root: path.resolve(env.settings.localPath, `./${dbName}`) });
                }
                else {
                    await ref.remove();
                }
            }
            else if (!isFile) {
                return sendError(res, {
                    code: "storage/unknown",
                    message: "Is not a file!",
                });
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