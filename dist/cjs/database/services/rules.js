"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathBasedRules = exports.AccessRuleValidationError = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const browser_1 = require("../../server/browser");
const sandbox_1 = require("./sandbox");
const utils_1 = require("../../utils");
class AccessRuleValidationError extends Error {
    constructor(result) {
        super(result.message);
        this.result = result;
    }
}
exports.AccessRuleValidationError = AccessRuleValidationError;
class PathBasedRules extends ivipbase_core_1.SimpleEventEmitter {
    stop() {
        throw new Error("not started yet");
    }
    constructor(defaultAccess, env) {
        var _a;
        super();
        this.env = env;
        this.codeRules = [];
        this.db = env.db;
        this.debug = env.debug;
        const defaultAccessRule = ((def) => {
            switch (def) {
                case browser_1.AUTH_ACCESS_DEFAULT.ALLOW_AUTHENTICATED: {
                    return "auth !== null";
                }
                case browser_1.AUTH_ACCESS_DEFAULT.ALLOW_ALL: {
                    return true;
                }
                case browser_1.AUTH_ACCESS_DEFAULT.DENY_ALL: {
                    return false;
                }
                default: {
                    env.debug.error(`Unknown defaultAccessRule "${def}"`);
                    return false;
                }
            }
        })(defaultAccess);
        const defaultRules = {
            rules: {
                ".read": defaultAccessRule,
                ".write": defaultAccessRule,
            },
        };
        this.jsonRules = defaultRules;
        this.accessRules = defaultRules;
        this.applyRules((_a = env.rules) !== null && _a !== void 0 ? _a : defaultRules, true);
        this.authEnabled = env.authEnabled;
    }
    on(event, callback) {
        return super.on(event, callback);
    }
    emit(event, data) {
        super.emit(event, data);
        return this;
    }
    applyRules(rules, isInitial = false) {
        const accessRules = (0, utils_1.joinObjects)(this.jsonRules, rules);
        this.jsonRules = (0, utils_1.joinObjects)(this.jsonRules, rules);
        // Converta regras de string em funções que podem ser executadas
        const processRules = (path, parent, variables) => {
            Object.keys(parent).forEach((key) => {
                const rule = parent[key];
                if ([".read", ".write", ".validate"].includes(key) && typeof rule === "string") {
                    let ruleCode = rule.includes("return ") ? rule : `return ${rule}`;
                    // Adicione `await`s às expressões de chamada `value` e `exists`
                    ruleCode = ruleCode.replace(/(value|exists)\(/g, (m, fn) => `await ${fn}(`);
                    // Converter para função
                    // rule = eval(
                    //     `(async (env) => {` +
                    //     `  const { now, path, ${variables.join(', ')}, operation, data, auth, value, exists } = env;` +
                    //     `  ${ruleCode};` +
                    //     `})`);
                    // rule.getText = () => {
                    //     return ruleCode;
                    // };
                    ruleCode = `(async () => {\n${ruleCode}\n})();`;
                    return (parent[key] = ruleCode);
                }
                else if (key === ".schema") {
                    // Adicionar esquema
                    return this.env.db.schema.set(path, rule).catch((err) => {
                        this.env.debug.error(`Error parsing ${path}/.schema: ${err.message}`);
                    });
                }
                else if (key.startsWith("$")) {
                    variables.push(key);
                }
                if (typeof rule === "object") {
                    processRules(`${path}/${key}`, rule, variables.slice());
                }
            });
        };
        processRules("", accessRules.rules, []);
        this.accessRules = accessRules;
        if (!isInitial) {
            this.emit("changed", this.jsonRules);
        }
    }
    async isOperationAllowed(user, path, operation, data) {
        // Process rules, find out if signed in user is allowed to read/write
        // Defaults to false unless a rule is found that tells us otherwise
        let typeOperation = "";
        if (["get", "exists", "query", "reflect", "export", "transact"].includes(operation)) {
            typeOperation += "r";
        }
        if (["update", "set", "delete", "import", "transact"].includes(operation)) {
            typeOperation += "w";
        }
        const isPreFlight = typeof data === "undefined";
        const allow = { allow: true };
        if (!this.authEnabled) {
            // Authentication is disabled, anyone can do anything. Not really a smart thing to do!
            return allow;
        }
        else if ((user === null || user === void 0 ? void 0 : user.uid) === "admin" || (user === null || user === void 0 ? void 0 : user.permission_level) >= 2) {
            // Always allow admin access
            // TODO: implement user.is_admin, so the default admin account can be disabled
            return allow;
        }
        else if (path.startsWith("__") && !((user === null || user === void 0 ? void 0 : user.permission_level) >= 1 && typeOperation === "r")) {
            // NEW: with the auth database now integrated into the main database,
            // deny access to private resources starting with '__' for non-admins
            return { allow: false, code: "private", message: `Access to private resource "${path}" not allowed` };
        }
        const getFullPath = (path, relativePath) => {
            if (relativePath.startsWith("/")) {
                // Absolute path
                return relativePath;
            }
            else if (!relativePath.startsWith(".")) {
                throw new Error("Path must be either absolute (/) or relative (./ or ../)");
            }
            let targetPathInfo = ivipbase_core_1.PathInfo.get(path);
            const trailKeys = ivipbase_core_1.PathInfo.getPathKeys(relativePath);
            trailKeys.forEach((key) => {
                if (key === ".") {
                    /* no op */
                }
                else if (key === "..") {
                    targetPathInfo = targetPathInfo.parent;
                }
                else {
                    targetPathInfo = targetPathInfo.child(key);
                }
            });
            return targetPathInfo.path;
        };
        const env = {
            now: Date.now(),
            auth: user || null,
            operation,
            vars: {},
            context: typeof (data === null || data === void 0 ? void 0 : data.context) === "object" && data.context !== null ? Object.assign({}, data.context) : {},
        };
        const pathInfo = ivipbase_core_1.PathInfo.get(path);
        const pathKeys = pathInfo.keys.slice();
        let rule = this.accessRules.rules;
        const rulePathKeys = [];
        let currentPath = "";
        let isAllowed = false;
        while (rule) {
            // Check read/write access or validate operation
            const checkRules = [];
            const applyRule = (rule) => {
                if (rule && !checkRules.includes(rule)) {
                    checkRules.push(rule);
                }
            };
            if (["get", "exists", "query", "reflect", "export", "transact"].includes(operation)) {
                // Operations that require 'read' access
                applyRule(rule[".read"]);
            }
            if (".write" in rule && ["update", "set", "delete", "import", "transact"].includes(operation)) {
                // Operations that require 'write' access
                applyRule(rule[".write"]);
            }
            if (`.${operation}` in rule && !isPreFlight) {
                // If there is a dedicated rule (eg ".update" or ".reflect") for this operation, use it.
                applyRule(rule[`.${operation}`]);
            }
            const rulePath = ivipbase_core_1.PathInfo.get(rulePathKeys).path;
            for (const rule of checkRules) {
                if (typeof rule === "boolean") {
                    if (!rule) {
                        return { allow: false, code: "rule", message: `${operation} operation denied to path "${path}" by set rule`, rule, rulePath };
                    }
                    isAllowed = true; // return allow;
                }
                if (typeof rule === "string" || typeof rule === "function") {
                    try {
                        // Execute rule function
                        const ruleEnv = Object.assign(Object.assign({}, env), { exists: async (target) => this.db.ref(getFullPath(currentPath, target)).exists(), value: async (target, include) => {
                                const snap = await this.db.ref(getFullPath(currentPath, target)).get({ include });
                                return snap.val();
                            } });
                        const result = typeof rule === "function" ? await rule(ruleEnv) : await (0, sandbox_1.executeSandboxed)(rule, ruleEnv);
                        if (!["cascade", "deny", "allow", true, false].includes(result)) {
                            this.debug.warn(`rule for path ${rulePath} possibly returns an unintentional value (${JSON.stringify(result)}) which results in outcome "${result ? "allow" : "deny"}"`);
                        }
                        isAllowed = result === "allow" || result === true;
                        if (!isAllowed && result !== "cascade") {
                            return { allow: false, code: "rule", message: `${operation} operation denied to path "${path}" by set rule`, rule, rulePath };
                        }
                    }
                    catch (err) {
                        // If rule execution throws an exception, don't allow. Can happen when rule is "auth.uid === '...'", and auth is null because the user is not signed in
                        return { allow: false, code: "exception", message: `${operation} operation denied to path "${path}" by set rule`, rule, rulePath, details: err };
                    }
                }
            }
            if (isAllowed) {
                break;
            }
            // Proceed with next key in trail
            if (pathKeys.length === 0) {
                break;
            }
            let nextKey = pathKeys.shift();
            currentPath = ivipbase_core_1.PathInfo.get(currentPath).childPath(nextKey);
            // if nextKey is '*' or '$something', rule[nextKey] will be undefined (or match a variable) so there is no
            // need to change things here for usage of wildcard paths in subscriptions
            if (typeof rule[nextKey] === "undefined") {
                // Check if current rule has a wildcard child
                const wildcardKey = Object.keys(rule).find((key) => key === "*" || key[0] === "$");
                if (wildcardKey) {
                    env[wildcardKey] = nextKey;
                    env.vars[wildcardKey] = nextKey;
                }
                nextKey = wildcardKey;
            }
            nextKey && rulePathKeys.push(nextKey);
            rule = rule[nextKey];
        }
        // Now dig deeper to check nested .validate rules
        if (isAllowed && ["set", "update"].includes(operation) && !isPreFlight) {
            // validate rules start at current path being written to
            const startRule = pathInfo.keys.reduce((rule, key) => {
                if (typeof rule !== "object" || rule === null) {
                    return null;
                }
                if (key in rule) {
                    return rule[key];
                }
                if ("*" in rule) {
                    return rule["*"];
                }
                const variableKey = Object.keys(rule).find((key) => typeof key === "string" && key.startsWith("$"));
                if (variableKey) {
                    return rule[variableKey];
                }
                return null;
            }, this.accessRules.rules);
            const getNestedRules = (target, rule) => {
                if (!rule) {
                    return [];
                }
                const nested = Object.keys(rule).reduce((arr, key) => {
                    if (key === ".validate" && ["string", "function"].includes(typeof rule[key])) {
                        arr.push({ target, validate: rule[key] });
                    }
                    if (!key.startsWith(".")) {
                        const nested = getNestedRules([...target, key], rule[key]);
                        arr.push(...nested);
                    }
                    return arr;
                }, []);
                return nested;
            };
            // Check all that apply for sent data (update requires a different strategy)
            const checkRules = getNestedRules([], startRule);
            for (const check of checkRules) {
                // Keep going as long as rules validate
                const targetData = check.target.reduce((data, key) => {
                    if (data !== null && typeof data === "object" && key in data) {
                        return data[key];
                    }
                    return null;
                }, data.value);
                if (typeof targetData === "undefined" && operation === "update" && check.target.length >= 1 && check.target[0] in data) {
                    // Ignore, data for direct child path is not being set by update operation
                    continue;
                }
                const validateData = typeof targetData === "undefined" ? null : targetData;
                if (validateData === null) {
                    // Do not validate deletes, this should be done by ".write" or ".delete" rule
                    continue;
                }
                const validatePath = ivipbase_core_1.PathInfo.get(path).child(check.target).path;
                const validateEnv = Object.assign(Object.assign({}, env), { operation: operation === "update" ? (check.target.length === 0 ? "update" : "set") : operation, data: validateData, exists: async (target) => this.db.ref(getFullPath(validatePath, target)).exists(), value: async (target, include) => {
                        const snap = await this.db.ref(getFullPath(validatePath, target)).get({ include });
                        return snap.val();
                    } });
                try {
                    const result = await (async () => {
                        let result;
                        if (typeof check.validate === "function") {
                            result = await check.validate(validateEnv);
                        }
                        else if (typeof check.validate === "string") {
                            result = await (0, sandbox_1.executeSandboxed)(check.validate, validateEnv);
                        }
                        else if (typeof check.validate === "boolean") {
                            result = check.validate ? "allow" : "deny";
                        }
                        if (result === "cascade") {
                            this.debug.warn(`Rule at path ${validatePath} returned "cascade", but ${validateEnv.operation} rules always cascade`);
                        }
                        else if (!["cascade", "deny", "allow", true, false].includes(result !== null && result !== void 0 ? result : "")) {
                            this.debug.warn(`${validateEnv.operation} rule for path ${validatePath} possibly returned an unintentional value (${JSON.stringify(result)}) which results in outcome "${result ? "allow" : "deny"}"`);
                        }
                        if (["cascade", "deny", "allow"].includes(result)) {
                            return result;
                        }
                        return result ? "allow" : "deny";
                    })();
                    if (result === "deny") {
                        return { allow: false, code: "rule", message: `${operation} operation denied to path "${path}" by set rule`, rule: check.validate, rulePath: validatePath };
                    }
                }
                catch (err) {
                    // If rule execution throws an exception, don't allow. Can happen when rule is "auth.uid === '...'", and auth is null because the user is not signed in
                    return {
                        allow: false,
                        code: "exception",
                        message: `${operation} operation denied to path "${path}" by set rule`,
                        rule: check.validate,
                        rulePath: validatePath,
                        details: err,
                    };
                }
            }
        }
        return isAllowed ? allow : { allow: false, code: "no_rule", message: `No rules set for requested path "${path}", defaulting to false` };
    }
    add(rulePaths, ruleTypes, callback) {
        const paths = Array.isArray(rulePaths) ? rulePaths : [rulePaths];
        const types = Array.isArray(ruleTypes) ? ruleTypes : [ruleTypes];
        for (const path of paths) {
            const keys = ivipbase_core_1.PathInfo.getPathKeys(path);
            let target = this.accessRules.rules;
            for (const key of keys) {
                if (!(key in target)) {
                    target[key] = {};
                }
                target = target[key];
                if (typeof target !== "object" || target === null) {
                    throw new Error(`Cannot add rule because value of key "${key}" is not an object`);
                }
            }
            for (const type of types) {
                target[`.${type}`] = callback;
                this.codeRules.push({ path, type, callback });
            }
        }
    }
}
exports.PathBasedRules = PathBasedRules;
//# sourceMappingURL=rules.js.map