"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = exports.UpdateDataError = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const rules_1 = require("../../services/rules");
const error_1 = require("../../shared/error");
const database_1 = require("../../../database");
class UpdateDataError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.UpdateDataError = UpdateDataError;
const addRoutes = (env) => {
    env.router.post(`/data/:dbName/*`, async (req, res) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const path = req.params["0"];
        const LOG_ACTION = "data.update";
        const LOG_DETAILS = { ip: req.ip, uid: (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : null, path };
        try {
            // Pre-check 'write' access
            let access = await env.rules(dbName).isOperationAllowed((_c = req.user) !== null && _c !== void 0 ? _c : {}, path, "update");
            if (!access.allow) {
                throw new rules_1.AccessRuleValidationError(access);
            }
            const data = req.body;
            if (typeof (data === null || data === void 0 ? void 0 : data.val) === "undefined" || !["string", "object", "undefined"].includes(typeof (data === null || data === void 0 ? void 0 : data.map))) {
                throw new UpdateDataError("invalid_serialized_value", "The sent value is not properly serialized");
            }
            const val = ivipbase_core_1.Transport.deserialize(data);
            if (path === "" && ((_d = req.user) === null || _d === void 0 ? void 0 : _d.uid) !== "admin" && val !== null && typeof val === "object") {
                // Non-admin user: remove any private properties from the update object
                Object.keys(val)
                    .filter((key) => key.startsWith("__"))
                    .forEach((key) => delete val[key]);
            }
            // Check 'update' access
            access = await env.rules(dbName).isOperationAllowed((_e = req.user) !== null && _e !== void 0 ? _e : {}, path, "update", { value: val, context: req.context });
            if (!access.allow) {
                throw new rules_1.AccessRuleValidationError(access);
            }
            // Schema validation moved to storage, no need to check here but an early check won't do no harm!
            const validation = await env.db(dbName).schema.check(path, val, true);
            if (!validation.ok) {
                throw new database_1.SchemaValidationError((_f = validation.reason) !== null && _f !== void 0 ? _f : "Schema validation failed");
            }
            await env.db(dbName).ref(path).context(req.context).update(val);
            // NEW: add cursor to response context, which was added to the request context in `acebase_cursor` if transaction logging is enabled
            const returnContext = { acebase_cursor: (_g = req === null || req === void 0 ? void 0 : req.context) === null || _g === void 0 ? void 0 : _g.acebase_cursor };
            res.setHeader("AceBase-Context", JSON.stringify(returnContext));
            res.send({ success: true });
        }
        catch (err) {
            if (err instanceof rules_1.AccessRuleValidationError) {
                const access = err.result;
                env.log.error(LOG_ACTION, "unauthorized", Object.assign(Object.assign({}, LOG_DETAILS), { rule_code: access.code, rule_path: (_h = access.rulePath) !== null && _h !== void 0 ? _h : null, rule_error: (_k = (_j = access.details) === null || _j === void 0 ? void 0 : _j.message) !== null && _k !== void 0 ? _k : null }));
                return (0, error_1.sendUnauthorizedError)(res, (_l = access.code) !== null && _l !== void 0 ? _l : "access_rule", (_m = access.message) !== null && _m !== void 0 ? _m : "Unauthorized");
            }
            if (err instanceof database_1.SchemaValidationError) {
                env.log.error(LOG_ACTION, "schema_validation_failed", Object.assign(Object.assign({}, LOG_DETAILS), { reason: err.reason }));
                res.status(422).send({ code: "schema_validation_failed", message: err.message });
            }
            else if (err instanceof UpdateDataError) {
                env.log.error(LOG_ACTION, err.code, Object.assign(Object.assign({}, LOG_DETAILS), { message: err.message }));
                (0, error_1.sendBadRequestError)(res, err);
            }
            else {
                env.debug.error(`failed to update "${path}":`, err);
                env.log.error(LOG_ACTION, "unexpected", LOG_DETAILS, err);
                (0, error_1.sendError)(res, err);
            }
        }
    });
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=update.js.map