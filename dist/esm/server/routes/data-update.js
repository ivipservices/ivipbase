"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = exports.UpdateDataError = void 0;
const acebase_1 = require("acebase");
const acebase_core_1 = require("acebase-core");
const rules_1 = require("../rules.js");
const error_1 = require("../shared/error.js");
class UpdateDataError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.UpdateDataError = UpdateDataError;
const addRoute = (env) => {
    env.router.post(`/data/${env.db.name}/*`, async (req, res) => {
        const path = req.path.slice(env.db.name.length + 7);
        const LOG_ACTION = 'data.update';
        const LOG_DETAILS = { ip: req.ip, uid: req.user?.uid ?? null, path };
        try {
            // Pre-check 'write' access
            let access = await env.rules.isOperationAllowed(req.user, path, 'update');
            if (!access.allow) {
                throw new rules_1.AccessRuleValidationError(access);
            }
            const data = req.body;
            if (typeof data?.val === 'undefined' || !['string', 'object', 'undefined'].includes(typeof data?.map)) {
                throw new UpdateDataError('invalid_serialized_value', 'The sent value is not properly serialized');
            }
            const val = acebase_core_1.Transport.deserialize(data);
            if (path === '' && req.user?.uid !== 'admin' && val !== null && typeof val === 'object') {
                // Non-admin user: remove any private properties from the update object
                Object.keys(val).filter(key => key.startsWith('__')).forEach(key => delete val[key]);
            }
            // Check 'update' access
            access = await env.rules.isOperationAllowed(req.user, path, 'update', { value: val, context: req.context });
            if (!access.allow) {
                throw new rules_1.AccessRuleValidationError(access);
            }
            // Schema validation moved to storage, no need to check here but an early check won't do no harm!
            const validation = await env.db.schema.check(path, val, true);
            if (!validation.ok) {
                throw new acebase_1.SchemaValidationError(validation.reason);
            }
            await env.db.ref(path)
                .context(req.context)
                .update(val);
            // NEW: add cursor to response context, which was added to the request context in `acebase_cursor` if transaction logging is enabled
            const returnContext = { acebase_cursor: req.context.acebase_cursor };
            res.setHeader('AceBase-Context', JSON.stringify(returnContext));
            res.send({ success: true });
        }
        catch (err) {
            if (err instanceof rules_1.AccessRuleValidationError) {
                const access = err.result;
                env.log.error(LOG_ACTION, 'unauthorized', { ...LOG_DETAILS, rule_code: access.code, rule_path: access.rulePath ?? null, rule_error: access.details?.message ?? null });
                return (0, error_1.sendUnauthorizedError)(res, access.code, access.message);
            }
            if (err instanceof acebase_1.SchemaValidationError) {
                env.log.error(LOG_ACTION, 'schema_validation_failed', { ...LOG_DETAILS, reason: err.reason });
                res.status(422).send({ code: 'schema_validation_failed', message: err.message });
            }
            else if (err instanceof UpdateDataError) {
                env.log.error(LOG_ACTION, err.code, { ...LOG_DETAILS, message: err.message });
                (0, error_1.sendBadRequestError)(res, err);
            }
            else {
                env.debug.error(`failed to update "${path}":`, err);
                env.log.error(LOG_ACTION, 'unexpected', LOG_DETAILS, err);
                (0, error_1.sendError)(res, err);
            }
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=data-update.js.map