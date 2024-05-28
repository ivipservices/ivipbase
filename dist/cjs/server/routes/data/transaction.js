"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = exports.DataTransactionError = exports.TRANSACTION_TIMEOUT_MS = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const rules_1 = require("../../../database/services/rules");
const error_1 = require("../../shared/error");
const database_1 = require("../../../database");
exports.TRANSACTION_TIMEOUT_MS = 10000; // 10s to finish a started transaction
class DataTransactionError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.DataTransactionError = DataTransactionError;
const addRoutes = (env) => {
    const _transactions = new Map();
    env.router.post(`/transaction/:dbName/start`, async (req, res) => {
        var _a, _b, _c, _d, _e, _f;
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const data = req.body;
        const LOG_ACTION = "data.transaction.start";
        const LOG_DETAILS = { ip: req.ip, uid: (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : null, path: data.path };
        // Pre-check read/write access
        const access = await env.rules(dbName).isOperationAllowed((_c = req.user) !== null && _c !== void 0 ? _c : {}, data.path, "transact");
        if (!access.allow) {
            env.log.error(LOG_ACTION, "unauthorized", Object.assign(Object.assign({}, LOG_DETAILS), { rule_code: access.code, rule_path: (_d = access.rulePath) !== null && _d !== void 0 ? _d : null }), access.details);
            return (0, error_1.sendUnauthorizedError)(res, access.code, access.message);
        }
        // Start transaction
        const tx = {
            id: ivipbase_core_1.ID.generate(),
            started: Date.now(),
            path: data.path,
            context: req.context,
            finish: undefined,
            timeout: setTimeout(() => {
                var _a;
                _transactions.delete(tx.id);
                (_a = tx.finish) === null || _a === void 0 ? void 0 : _a.call(tx); // Finish without value cancels the transaction
            }, exports.TRANSACTION_TIMEOUT_MS),
        };
        _transactions.set(tx.id, tx);
        try {
            env.debug.verbose(`Transaction ${tx.id} starting...`);
            // const ref = db.ref(tx.path);
            const donePromise = env.db(dbName).storage.transaction(tx.path, async (val) => {
                var _a, _b;
                env.debug.verbose(`Transaction ${tx.id} started with value: `, val);
                const access = await env.rules(dbName).isOperationAllowed((_a = req.user) !== null && _a !== void 0 ? _a : {}, data.path, "get", { value: val, context: req.context });
                if (!access.allow) {
                    env.log.error(LOG_ACTION, "unauthorized", Object.assign(Object.assign({}, LOG_DETAILS), { rule_code: access.code, rule_path: (_b = access.rulePath) !== null && _b !== void 0 ? _b : null }), access.details);
                    (0, error_1.sendUnauthorizedError)(res, access.code, access.message);
                    return; // Return undefined to cancel transaction
                }
                const currentValue = ivipbase_core_1.Transport.serialize(val);
                const promise = new Promise((resolve) => {
                    tx.finish = (val) => {
                        env.debug.verbose(`Transaction ${tx.id} finishing with value: `, val);
                        _transactions.delete(tx.id);
                        resolve(val);
                        return donePromise;
                    };
                });
                res.send({ id: tx.id, value: currentValue });
                return promise;
            }, { context: tx.context });
        }
        catch (err) {
            await ((_e = tx === null || tx === void 0 ? void 0 : tx.finish) === null || _e === void 0 ? void 0 : _e.call(tx)); // Finish without value to cancel the transaction
            env.debug.error(`failed to start transaction on "${tx.path}":`, err);
            env.log.error(LOG_ACTION, (_f = err.code) !== null && _f !== void 0 ? _f : "unexpected", LOG_DETAILS, typeof err.code === "undefined" ? err : null);
            (0, error_1.sendUnexpectedError)(res, err);
        }
    });
    env.router.post(`/transaction/:dbName/finish`, async (req, res) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const data = req.body;
        const LOG_ACTION = "data.transaction.finish";
        const LOG_DETAILS = { ip: req.ip, uid: (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : null, path: data.path };
        const tx = _transactions.get(data.id);
        if (!tx || tx.path !== data.path) {
            env.log.error(LOG_ACTION, tx ? "wrong_path" : "not_found", Object.assign(Object.assign({}, LOG_DETAILS), { id: data.id, tx_path: (_c = tx === null || tx === void 0 ? void 0 : tx.path) !== null && _c !== void 0 ? _c : null }));
            res.statusCode = 410; // Gone
            res.send(`transaction not found`);
            return;
        }
        clearTimeout(tx.timeout);
        _transactions.delete(tx.id);
        // Finish transaction
        try {
            // Check again if a 'write' to this path is allowed by this user
            let access = await env.rules(dbName).isOperationAllowed((_d = req.user) !== null && _d !== void 0 ? _d : {}, tx.path, "set");
            if (!access.allow) {
                throw new rules_1.AccessRuleValidationError(access);
            }
            let cancel = false;
            if (typeof data.value === "object" && (data.value === null || Object.keys(data.value).length === 0)) {
                // Returning undefined from a transaction callback should cancel the transaction
                // acebase-client (Transport.serialize) serializes value undefined as { val: undefined, map: undefined }, which
                // then is sent to the server as an empty object: {}
                cancel = true;
            }
            else if (typeof ((_e = data.value) === null || _e === void 0 ? void 0 : _e.val) === "undefined" || !["string", "object", "undefined"].includes(typeof ((_f = data.value) === null || _f === void 0 ? void 0 : _f.map))) {
                throw new DataTransactionError("invalid_serialized_value", "The sent value is not properly serialized");
            }
            const newValue = cancel ? undefined : ivipbase_core_1.Transport.deserialize(data.value);
            if (tx.path === "" && ((_g = req.user) === null || _g === void 0 ? void 0 : _g.uid) !== "admin" && newValue !== null && typeof newValue === "object") {
                // Non-admin user: remove any private properties from the update object
                Object.keys(newValue)
                    .filter((key) => key.startsWith("__"))
                    .forEach((key) => delete newValue[key]);
            }
            // Check if the value to be written is allowed
            access = await env.rules(dbName).isOperationAllowed((_h = req.user) !== null && _h !== void 0 ? _h : {}, tx.path, "set", { value: newValue, context: tx.context });
            if (!access.allow) {
                throw new rules_1.AccessRuleValidationError(access);
            }
            const result = await ((_j = tx.finish) === null || _j === void 0 ? void 0 : _j.call(tx, newValue));
            // NEW: capture cursor and return it in the response context header
            if (!tx.context) {
                tx.context = {};
            }
            tx.context.database_cursor = result === null || result === void 0 ? void 0 : result.cursor;
            res.setHeader("AceBase-Context", JSON.stringify(tx.context));
            res.send("done");
        }
        catch (err) {
            (_k = tx.finish) === null || _k === void 0 ? void 0 : _k.call(tx); // Finish without value cancels the transaction
            if (err instanceof rules_1.AccessRuleValidationError) {
                const access = err.result;
                env.log.error(LOG_ACTION, "unauthorized", Object.assign(Object.assign({}, LOG_DETAILS), { rule_code: access.code, rule_path: (_l = access.rulePath) !== null && _l !== void 0 ? _l : null }), access.details);
                return (0, error_1.sendUnauthorizedError)(res, (_m = access.code) !== null && _m !== void 0 ? _m : "access_rule", (_o = access.message) !== null && _o !== void 0 ? _o : "Unauthorized");
            }
            else if (err instanceof database_1.SchemaValidationError) {
                env.log.error(LOG_ACTION, "schema_validation_failed", Object.assign(Object.assign({}, LOG_DETAILS), { reason: err.reason }));
                res.status(422).send({ code: "schema_validation_failed", message: err.message });
            }
            else if (err instanceof DataTransactionError) {
                env.log.error(LOG_ACTION, err.code, Object.assign(Object.assign({}, LOG_DETAILS), { message: err.message }));
                (0, error_1.sendBadRequestError)(res, err);
            }
            else {
                env.debug.error(`failed to finish transaction on "${tx.path}":`, err);
                env.log.error(LOG_ACTION, "unexpected", LOG_DETAILS, err);
                (0, error_1.sendError)(res, err);
            }
        }
    });
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=transaction.js.map