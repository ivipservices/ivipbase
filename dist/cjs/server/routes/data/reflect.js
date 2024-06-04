"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const error_1 = require("../../shared/error");
const ivipbase_core_1 = require("ivipbase-core");
const addRoutes = (env) => {
    env.router.get(`/reflect/:dbName/*`, async (req, res) => {
        var _a, _b, _c;
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const path = "/" + req.params["0"];
        const access = await env.rules(dbName).isOperationAllowed((_a = req.user) !== null && _a !== void 0 ? _a : {}, path, "reflect", { context: req.context, type: req.query.type });
        if (!access.allow) {
            return (0, error_1.sendUnauthorizedError)(res, access.code, access.message);
        }
        const impersonatedAccess = {
            uid: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.uid) !== "admin" ? null : req.query.impersonate,
            /**
             * NEW, check all possible operations
             */
            operations: {},
            /** Result of `get` operation */
            read: {
                allow: false,
                error: null,
            },
            /** Result of `set` operation */
            write: {
                allow: false,
                error: null,
            },
        };
        const impersonatedUser = impersonatedAccess.uid === "anonymous" ? null : { uid: impersonatedAccess.uid };
        const impersonatedData = { context: { acebase_reflect: true }, value: "[[reflect]]" }; // TODO: Make configurable
        if (impersonatedAccess.uid) {
            for (const operation of ["transact", "get", "update", "set", "delete", "reflect", "exists", "query", "import", "export"]) {
                const access = await env.rules(dbName).isOperationAllowed(impersonatedUser, path, operation, impersonatedData);
                impersonatedAccess.operations[operation] = access;
            }
            const readAccess = await env.rules(dbName).isOperationAllowed(impersonatedUser, path, "get"); // Use pre-flight 'get' check to mimic legacy 'read' check
            impersonatedAccess.read.allow = readAccess.allow;
            if (!readAccess.allow) {
                impersonatedAccess.read.error = { code: readAccess.code, message: readAccess.message };
            }
            const writeAccess = await env.rules(dbName).isOperationAllowed(impersonatedUser, path, "update"); // Use pre-flight 'update' check to mimic legacy 'write' check
            impersonatedAccess.write.allow = writeAccess.allow;
            if (!writeAccess.allow) {
                impersonatedAccess.write.error = { code: writeAccess.code, message: writeAccess.message };
            }
        }
        const type = (_c = req.query.type) !== null && _c !== void 0 ? _c : "info";
        const args = {};
        Object.keys(req.query).forEach((key) => {
            if (!["type", "impersonate"].includes(key)) {
                let val = req.query[key];
                if (/^(?:true|false|[0-9]+)$/.test(val)) {
                    val = JSON.parse(val);
                }
                args[key] = val;
            }
        });
        try {
            const result = await env.db(dbName).ref(path).reflect(type, args);
            if (impersonatedAccess.uid) {
                result.impersonation = impersonatedAccess;
                let list;
                if (type === "children") {
                    list = result.list;
                }
                else if (type === "info") {
                    list = typeof result.children === "object" && "list" in result.children ? result.children.list : [];
                }
                for (const childInfo of list !== null && list !== void 0 ? list : []) {
                    childInfo.access = {
                        read: (await env.rules(dbName).isOperationAllowed(impersonatedUser, ivipbase_core_1.PathInfo.getChildPath(path, childInfo.key), "get")).allow, // Use pre-flight 'get' check to mimic legacy 'read' check
                        write: (await env.rules(dbName).isOperationAllowed(impersonatedUser, ivipbase_core_1.PathInfo.getChildPath(path, childInfo.key), "update")).allow, // Use pre-flight 'update' check to mimic legacy 'write' check
                    };
                }
            }
            res.send(result);
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err);
        }
    });
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=reflect.js.map