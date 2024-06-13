import { sendError } from "../../shared/error.js";
export const addRoute = (env) => {
    env.router.get(`/storage-url/:dbName/*`, async (req, res) => {
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return sendError(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const path = req.params["0"];
        try {
            const url = await env.storageFile(dbName).getDownloadURL(path);
            res.send({ path: `storage/${dbName}/${path}`, isFile: typeof url === "string", url });
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err);
        }
    });
};
export default addRoute;
//# sourceMappingURL=get-download-url.js.map