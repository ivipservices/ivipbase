import { packageRootPath } from "../shared/rootpath.js";
import path from "path";
export const addRoutes = (env) => {
    const webManagerDir = `webmanager`;
    // Add redirect from root to webmanager
    env.router.get("/", (req, res) => {
        res.redirect(`/${webManagerDir}/`);
    });
    // Serve static files from webmanager directory
    env.router.get(`/${webManagerDir}/*`, (req, res) => {
        const filePath = req.path.slice(webManagerDir.length + 2);
        const assetsPath = path.join(packageRootPath, "/server/webmanager");
        if (filePath.length === 0) {
            // Send default file
            res.sendFile(path.join(assetsPath, "/index.html"));
        }
        else {
            res.sendFile(path.join(assetsPath, "/", filePath));
        }
    });
};
export default addRoutes;
//# sourceMappingURL=webmanager.js.map