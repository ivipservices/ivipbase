"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const error_1 = require("../../shared/error");
const addRoutes = (env) => {
    env.router.post(`/export/:dbName/*`, async (req, res) => {
        var _a, _b;
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const path = req.params["0"];
        const access = await env.rules(dbName).isOperationAllowed((_a = req.user) !== null && _a !== void 0 ? _a : {}, path, "import", { context: req.context });
        if (!access.allow) {
            return (0, error_1.sendUnauthorizedError)(res, access.code, access.message);
        }
        const format = req.query.format || "json";
        const suppress_events = req.query.suppress_events === "1";
        req.pause(); // Switch to non-flowing mode so we can use .read() upon request
        let eof = false;
        req.once("end", () => {
            eof = true;
        });
        const read = async (length) => {
            let chunk = req.read();
            if (chunk === null && !eof) {
                await new Promise((resolve) => req.once("readable", resolve));
                chunk = req.read();
            }
            // env.debug.verbose(`Received chunk: `, chunk);
            return chunk;
        };
        const ref = env.db(dbName).ref(path);
        try {
            await ref.import(read, { format, suppress_events });
            res.send({ success: true });
        }
        catch (err) {
            env.debug.error(`Error importing data for path "/${path}": `, err);
            if (!res.headersSent) {
                res.statusCode = 500;
                res.send({ success: false, reason: (_b = err === null || err === void 0 ? void 0 : err.message) !== null && _b !== void 0 ? _b : String(err) });
            }
        }
        finally {
            res.end();
        }
    });
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=import.js.map