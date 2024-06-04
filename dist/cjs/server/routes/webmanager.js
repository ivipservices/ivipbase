"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const rootpath_1 = require("../shared/rootpath");
const path_1 = __importDefault(require("path"));
const addRoutes = (env) => {
    const webManagerDir = `webmanager`;
    // Add redirect from root to webmanager
    env.router.get("/", (req, res) => {
        res.redirect(`/${webManagerDir}/`);
    });
    // Serve static files from webmanager directory
    env.router.get(`/${webManagerDir}/*`, (req, res) => {
        const filePath = req.path.slice(webManagerDir.length + 2);
        const assetsPath = path_1.default.join(rootpath_1.packageRootPath, "/webmanager");
        if (filePath.length === 0) {
            // Send default file
            res.sendFile(path_1.default.join(assetsPath, "/index.html"));
        }
        else if (filePath.startsWith("settings.js")) {
            res.send(`
                window.settings = {
                    "host": window.location.hostname ?? "${env.settings.host}",
                    "port": ${env.settings.port},
                };
            `);
        }
        else {
            const mainFilePath = path_1.default.join(assetsPath, "/", filePath);
            const posiplePath = [mainFilePath, mainFilePath + ".js", mainFilePath + ".jsx", path_1.default.join(mainFilePath, "/", "index.js"), path_1.default.join(mainFilePath, "/", "index.jsx")];
            for (const p of posiplePath) {
                if (require("fs").existsSync(p) && require("fs").statSync(p).isFile()) {
                    res.sendFile(p);
                    return;
                }
            }
            res.status(404).send("File not found");
        }
    });
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=webmanager.js.map