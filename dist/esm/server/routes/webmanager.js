import { packageRootPath } from "../shared/rootpath.js";
import path from "path";
import fs from "fs";
export const addRoutes = (env) => {
    const webManagerDir = `webmanager`;
    // Add redirect from root to webmanager
    env.router.get("/", (req, res) => {
        res.redirect(`/${webManagerDir}/`);
    });
    // Serve static files from webmanager directory
    env.router.get(`/${webManagerDir}/*`, (req, res) => {
        const filePath = req.path.slice(webManagerDir.length + 2);
        const assetsPath = path.join(packageRootPath, "/webmanager");
        if (filePath.length === 0) {
            // Send default file
            res.sendFile(path.join(assetsPath, "/index.html"));
        }
        else if (filePath.startsWith("settings.js")) {
            res.send(`
                window.settings = {
                    "protocol": (window.location.protocol ?? "http").replace(":", ""),
                    "host": window.location.hostname ?? "${env.settings.host}",
                    "port": parseInt(window.location.port ?? "${env.settings.port}"),
                };
            `);
        }
        else {
            const mainFilePath = path.join(assetsPath, "/", filePath);
            const posiplePath = [mainFilePath, mainFilePath + ".js", mainFilePath + ".jsx", path.join(mainFilePath, "/", "index.js"), path.join(mainFilePath, "/", "index.jsx")];
            for (const p of posiplePath) {
                if (fs.existsSync(p) && fs.statSync(p).isFile()) {
                    res.sendFile(p);
                    return;
                }
            }
            res.status(404).send("File not found");
        }
    });
};
export default addRoutes;
//# sourceMappingURL=webmanager.js.map