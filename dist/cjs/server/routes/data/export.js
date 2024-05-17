"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const error_1 = require("../../shared/error");
const addRoutes = (env) => {
    env.router.get(`/export/:dbName/*`, async (req, res) => {
        var _a;
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const path = req.params["0"];
        const access = await env.rules(dbName).isOperationAllowed((_a = req.user) !== null && _a !== void 0 ? _a : {}, path, "export", { context: req.context });
        if (!access.allow) {
            return (0, error_1.sendUnauthorizedError)(res, access.code, access.message);
        }
        const format = req.query.format || "json";
        const type_safe = req.query.type_safe !== "0";
        const write = async (chunk) => {
            const ok = res.write(chunk);
            if (!ok) {
                await new Promise((resolve) => res.once("drain", resolve));
            }
        };
        const ref = env.db(dbName).ref(path);
        res.setHeader("Content-Disposition", `attachment; filename=${ref.key || "export"}.json`); // Will be treated as a download in browser
        try {
            await ref.export(write, { format, type_safe });
        }
        catch (err) {
            env.debug.error(`Error exporting data for path "/${path}": `, err);
            if (!res.headersSent) {
                res.statusCode = 500;
                res.send(err);
            }
        }
        finally {
            res.end();
        }
    });
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=export.js.map