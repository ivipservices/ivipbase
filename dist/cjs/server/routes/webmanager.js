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
        const assetsPath = path_1.default.join(rootpath_1.packageRootPath, "/server/webmanager");
        if (filePath.length === 0) {
            // Send default file
            res.sendFile(path_1.default.join(assetsPath, "/index.html"));
        }
        else {
            res.sendFile(path_1.default.join(assetsPath, "/", filePath));
        }
    });
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=webmanager.js.map