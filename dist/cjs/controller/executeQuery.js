"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeQuery = exports.executeQueryRealtime = exports.executeFilters = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const utils_1 = require("./storage/MDE/utils");
const utils_2 = require("../utils");
const structureNodes_1 = __importStar(require("./storage/MDE/structureNodes"));
const noop = () => { };
const executeFilters = (value, queryFilters) => {
    const filters = queryFilters.filter((f) => ["<", "<=", "==", "!=", ">=", ">", "like", "!like", "in", "!in", "exists", "!exists", "between", "!between", "matches", "!matches", "has", "!has", "contains", "!contains"].includes(f.op));
    return (["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(value)) &&
        filters.every((f) => {
            const val = (0, utils_2.isDate)(value[f.key]) ? new Date(value[f.key]).getTime() : value[f.key];
            const op = f.op;
            const compare = (0, utils_2.isDate)(f.compare) ? new Date(f.compare).getTime() : f.compare;
            switch (op) {
                case "<":
                    return val < compare;
                case "<=":
                    return val <= compare;
                case "==":
                    return val === compare;
                case "!=":
                    return val !== compare;
                case ">=":
                    return val >= compare;
                case ">":
                    return val > compare;
                case "in":
                case "!in": {
                    if (!(f.compare instanceof Array)) {
                        return op === "!in";
                    }
                    const isIn = f.compare instanceof Array && f.compare.includes(val);
                    return op === "in" ? isIn : !isIn;
                }
                case "exists":
                case "!exists": {
                    const isExists = val !== undefined && val !== null;
                    return op === "exists" ? isExists : !isExists;
                }
                case "between":
                case "!between": {
                    if (!(f.compare instanceof Array)) {
                        return op === "!between";
                    }
                    const isBetween = f.compare instanceof Array && val >= f.compare[0] && val <= f.compare[1];
                    return op === "between" ? isBetween : !isBetween;
                }
                case "like":
                case "!like": {
                    if (typeof compare !== "string") {
                        return op === "!like";
                    }
                    const pattern = "^" + compare.replace(/\*/g, ".*").replace(/\?/g, ".") + "$";
                    const re = new RegExp(pattern, "i");
                    const isLike = re.test(val);
                    return op === "like" ? isLike : !isLike;
                }
                case "matches":
                case "!matches": {
                    if (typeof compare !== "string") {
                        return op === "!matches";
                    }
                    const re = new RegExp(compare, "i");
                    const isMatch = re.test(val);
                    return op === "matches" ? isMatch : !isMatch;
                }
                case "has":
                case "!has": {
                    if (typeof val !== "object") {
                        return op === "!has";
                    }
                    const hasKey = Object.keys(val).includes(compare);
                    return op === "has" ? hasKey : !hasKey;
                }
                case "contains":
                case "!contains": {
                    if (!(val instanceof Array)) {
                        return op === "!contains";
                    }
                    const contains = val.includes(compare);
                    return op === "contains" ? contains : !contains;
                }
            }
            return false;
        }));
};
exports.executeFilters = executeFilters;
const executeQueryRealtime = (db, path, query, options, matchedPaths) => {
    var _a, _b, _c, _d;
    if ((options === null || options === void 0 ? void 0 : options.monitor) === true) {
        options.monitor = { add: true, change: true, remove: true };
    }
    const isRealtime = typeof options.monitor === "object" && [(_a = options.monitor) === null || _a === void 0 ? void 0 : _a.add, (_b = options.monitor) === null || _b === void 0 ? void 0 : _b.change, (_c = options.monitor) === null || _c === void 0 ? void 0 : _c.remove].some((val) => val === true);
    if (isRealtime && typeof (options === null || options === void 0 ? void 0 : options.eventHandler) === "function") {
        const queryFilters = (_d = query.filters) !== null && _d !== void 0 ? _d : [];
        const ref = db.ref(path);
        const originalPath = ref.path;
        const removeMatch = (path) => {
            const index = matchedPaths.indexOf(path);
            if (index < 0) {
                return;
            }
            matchedPaths.splice(index, 1);
        };
        const addMatch = (path) => {
            if (matchedPaths.includes(path)) {
                return;
            }
            matchedPaths.push(path);
        };
        const getMainPathChild = (path) => {
            let main_path = ivipbase_core_1.PathInfo.get(path);
            while (!(main_path === null || main_path === void 0 ? void 0 : main_path.isChildOf(originalPath)) && main_path.parent !== null) {
                main_path = main_path.parent;
            }
            return main_path;
        };
        const childChangedCallback = async (err, path, newValue, oldValue) => {
            var _a, _b, _c, _d, _e, _f, _g;
            const wasMatch = matchedPaths.includes(path);
            let keepMonitoring = true;
            if (typeof (options === null || options === void 0 ? void 0 : options.eventHandler) !== "function" || newValue === null || newValue === undefined) {
                return;
            }
            let main_path = getMainPathChild(path);
            if (!(main_path === null || main_path === void 0 ? void 0 : main_path.isChildOf(originalPath))) {
                return;
            }
            let isMatch = ["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(newValue)) && (0, exports.executeFilters)(newValue, queryFilters);
            if (options.snapshots) {
                newValue = ["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(newValue))
                    ? (_a = (0, utils_2.removeNulls)((0, structureNodes_1.resolveObjetByIncluded)(path, newValue, {
                        include: options.include,
                        exclude: options.exclude,
                        main_path: main_path.path,
                    }))) !== null && _a !== void 0 ? _a : null
                    : newValue;
            }
            const isChange = typeof (options === null || options === void 0 ? void 0 : options.monitor) === "boolean" ? options.monitor : (_c = (_b = options === null || options === void 0 ? void 0 : options.monitor) === null || _b === void 0 ? void 0 : _b.change) !== null && _c !== void 0 ? _c : false;
            const isAdd = typeof (options === null || options === void 0 ? void 0 : options.monitor) === "boolean" ? options.monitor : (_e = (_d = options === null || options === void 0 ? void 0 : options.monitor) === null || _d === void 0 ? void 0 : _d.add) !== null && _e !== void 0 ? _e : false;
            const isRemove = typeof (options === null || options === void 0 ? void 0 : options.monitor) === "boolean" ? options.monitor : (_g = (_f = options === null || options === void 0 ? void 0 : options.monitor) === null || _f === void 0 ? void 0 : _f.remove) !== null && _g !== void 0 ? _g : false;
            if (isMatch) {
                if (!wasMatch) {
                    addMatch(path);
                }
                if (wasMatch && isChange) {
                    keepMonitoring = options.eventHandler({ name: "change", path, value: newValue }) !== false;
                }
                else if (!wasMatch && isAdd) {
                    keepMonitoring = options.eventHandler({ name: "add", path, value: newValue }) !== false;
                }
            }
            else if (wasMatch) {
                removeMatch(path);
                if (isRemove) {
                    keepMonitoring = options.eventHandler({ name: "remove", path: path, value: oldValue }) !== false;
                }
            }
            if (keepMonitoring === false) {
                stopMonitoring();
            }
        };
        const childAddedCallback = (err, path, newValue) => {
            var _a, _b, _c;
            const wasMatch = ["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(newValue)) && (0, exports.executeFilters)(newValue, queryFilters);
            if (typeof (options === null || options === void 0 ? void 0 : options.eventHandler) !== "function" || !wasMatch || newValue === null || newValue === undefined) {
                return;
            }
            let main_path = getMainPathChild(path);
            if (!(main_path === null || main_path === void 0 ? void 0 : main_path.isChildOf(originalPath))) {
                return;
            }
            let keepMonitoring = true;
            addMatch(path);
            const isAdd = typeof (options === null || options === void 0 ? void 0 : options.monitor) === "boolean" ? options.monitor : (_b = (_a = options === null || options === void 0 ? void 0 : options.monitor) === null || _a === void 0 ? void 0 : _a.add) !== null && _b !== void 0 ? _b : false;
            if (isAdd) {
                if (options.snapshots) {
                    newValue = ["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(newValue))
                        ? (_c = (0, utils_2.removeNulls)((0, structureNodes_1.resolveObjetByIncluded)(path, newValue, {
                            include: options.include,
                            exclude: options.exclude,
                            main_path: main_path.path,
                        }))) !== null && _c !== void 0 ? _c : null
                        : newValue;
                }
                keepMonitoring = options.eventHandler({ name: "add", path: path, value: options.snapshots ? newValue : null }) !== false;
            }
            if (keepMonitoring === false) {
                stopMonitoring();
            }
        };
        const childRemovedCallback = (err, path, newValue, oldValue) => {
            var _a, _b;
            let keepMonitoring = true;
            if (typeof (options === null || options === void 0 ? void 0 : options.eventHandler) !== "function") {
                return;
            }
            removeMatch(path);
            const isRemove = typeof (options === null || options === void 0 ? void 0 : options.monitor) === "boolean" ? options.monitor : (_b = (_a = options === null || options === void 0 ? void 0 : options.monitor) === null || _a === void 0 ? void 0 : _a.remove) !== null && _b !== void 0 ? _b : false;
            if (isRemove) {
                keepMonitoring = options.eventHandler({ name: "remove", path: path, value: options.snapshots ? oldValue : null }) !== false;
            }
            if (keepMonitoring === false) {
                stopMonitoring();
            }
        };
        if (typeof options.monitor === "object" && (options.monitor.add || options.monitor.change || options.monitor.remove)) {
            db.storage.subscribe(ref.path, "child_changed", childChangedCallback);
        }
        if (typeof options.monitor === "object" && options.monitor.remove) {
            db.storage.subscribe(ref.path, "notify_child_removed", childRemovedCallback);
        }
        if (typeof options.monitor === "object" && options.monitor.add) {
            db.storage.subscribe(ref.path, "child_added", childAddedCallback);
        }
        const stopMonitoring = () => {
            db.storage.unsubscribe(ref.path, "child_changed", childChangedCallback);
            db.storage.unsubscribe(ref.path, "child_added", childAddedCallback);
            db.storage.unsubscribe(ref.path, "notify_child_removed", childRemovedCallback);
        };
        return async () => {
            stopMonitoring();
        };
    }
    return async () => { };
};
exports.executeQueryRealtime = executeQueryRealtime;
/**
 *
 * @param storage Instância de armazenamento de destino
 * @param dbName Nome do banco de dados
 * @param path Caminho da coleção de objetos para executar a consulta
 * @param query Consulta a ser executada
 * @param options Opções adicionais
 * @returns Retorna uma promise que resolve com os dados ou caminhos correspondentes em `results`
 */
async function executeQuery(db, path, query, options = { snapshots: false, include: undefined, exclude: undefined, child_objects: undefined, eventHandler: noop }) {
    var _a, _b;
    if (typeof options !== "object") {
        options = {};
    }
    if (typeof options.snapshots === "undefined") {
        options.snapshots = false;
    }
    const api = db.app;
    const database = db.database;
    let stop = async () => { };
    const originalPath = path;
    path = ivipbase_core_1.PathInfo.get([api.storage.settings.prefix, originalPath]).path;
    const context = {};
    context.database_cursor = ivipbase_core_1.ID.generate();
    const queryFilters = (_a = query.filters) !== null && _a !== void 0 ? _a : [];
    const querySort = (_b = query.order) !== null && _b !== void 0 ? _b : [];
    const nodes = await api.storage.getNodesBy(database, path, false, true, false).catch(() => Promise.resolve([]));
    let results = [];
    const pathInfo = ivipbase_core_1.PathInfo.get(path);
    const isWildcardPath = pathInfo.keys.some((key) => key === "*" || key.toString().startsWith("$")); // path.includes('*');
    const vars = isWildcardPath ? pathInfo.keys.filter((key) => typeof key === "string" && key.startsWith("$")) : [];
    results = nodes
        .sort((a, b) => {
        const aPath = ivipbase_core_1.PathInfo.get(a.path);
        const bPath = ivipbase_core_1.PathInfo.get(b.path);
        return aPath.isAncestorOf(bPath) || aPath.isParentOf(bPath) ? -1 : aPath.isDescendantOf(bPath) || aPath.isChildOf(bPath) ? 1 : 0;
    })
        .reduce((acc, node) => {
        const node_path = ivipbase_core_1.PathInfo.get(node.path);
        if (node_path.isChildOf(path)) {
            const index = acc.findIndex(({ path }) => node_path.equals(path));
            if (index >= 0) {
                acc[index].mainNode = node;
            }
            else {
                acc.push({ path: node.path, mainNode: node, heirsNodes: [] });
            }
        }
        else if (node_path.isDescendantOf(path)) {
            let mainPath = node_path;
            while (!(mainPath === null || mainPath === void 0 ? void 0 : mainPath.isChildOf(path)) && mainPath.parent !== null) {
                mainPath = mainPath.parent;
            }
            const index = acc.findIndex(({ path }) => mainPath.equals(path));
            if (index >= 0) {
                acc[index].heirsNodes.push(node);
            }
            else {
                acc.push({ path: mainPath.path, heirsNodes: [node] });
            }
        }
        return acc;
    }, [])
        .map(({ path, mainNode, heirsNodes }) => {
        var _a;
        if (mainNode) {
            let value = mainNode.content.value;
            if (mainNode.content && (mainNode.content.type === utils_1.nodeValueTypes.OBJECT || mainNode.content.type === utils_1.nodeValueTypes.ARRAY)) {
                value = (_a = (0, utils_2.removeNulls)((0, structureNodes_1.default)(path, [mainNode, ...heirsNodes]))) !== null && _a !== void 0 ? _a : null;
            }
            return { path, val: value, nodes: [mainNode, ...heirsNodes] };
        }
        return undefined;
    })
        .filter((node) => {
        if (!node || !["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(node.val)) || node.val === null) {
            return false;
        }
        const params = Object.fromEntries(Object.entries(ivipbase_core_1.PathInfo.extractVariables(path, node.path)).filter(([key]) => vars.includes(key)));
        const node_val = Object.assign(Object.assign({}, params), node.val);
        return (0, exports.executeFilters)(node_val, queryFilters);
    });
    const take = query.take > 0 ? query.take : results.length;
    const compare = (a, b, i) => {
        const o = querySort[i];
        if (!o) {
            return 0;
        }
        const trailKeys = ivipbase_core_1.PathInfo.get(typeof o.key === "number" ? `[${o.key}]` : o.key).keys;
        let left = trailKeys.reduce((val, key) => (val !== null && typeof val === "object" && key && key in val ? val[key] : null), a.val);
        let right = trailKeys.reduce((val, key) => (val !== null && typeof val === "object" && key && key in val ? val[key] : null), b.val);
        left = (0, utils_2.isDate)(left) ? new Date(left).getTime() : left;
        right = (0, utils_2.isDate)(right) ? new Date(right).getTime() : right;
        if (left === null) {
            return right === null ? 0 : o.ascending ? -1 : 1;
        }
        if (right === null) {
            return o.ascending ? 1 : -1;
        }
        if (left == right) {
            if (i < querySort.length - 1) {
                return compare(a, b, i + 1);
            }
            else {
                return a.path < b.path ? -1 : 1;
            }
        }
        else if (left < right) {
            return o.ascending ? -1 : 1;
        }
        // else if (left > right) {
        return o.ascending ? 1 : -1;
        // }
    };
    const totalLength = results.length;
    results = results
        .sort((a, b) => {
        return compare(a, b, 0);
    })
        .filter((_, i) => i >= query.skip * take && i < query.skip * take + take);
    const isMore = totalLength > query.skip * take + take;
    if (options.snapshots) {
        results = results.map(({ path, val, nodes }) => {
            const node_path = path.replace(new RegExp(`^${api.storage.settings.prefix.replace(/\//gi, "\\/")}`), "").replace(/^(\/)+/gi, "");
            val = (0, utils_2.removeNulls)(["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(val))
                ? (0, structureNodes_1.resolveObjetByIncluded)(path, val, {
                    include: options.include,
                    exclude: options.exclude,
                    main_path: path,
                })
                : val);
            return { path: node_path, val };
        });
    }
    stop = (0, exports.executeQueryRealtime)(db, originalPath, query, options, results.map(({ path }) => path.replace(new RegExp(`^${api.storage.settings.prefix.replace(/\//gi, "\\/")}`), "").replace(/^(\/)+/gi, "")));
    return {
        results: options.snapshots ? results : results.map(({ path }) => path.replace(new RegExp(`^${api.storage.settings.prefix.replace(/\//gi, "\\/")}`), "").replace(/^(\/)+/gi, "")),
        context,
        stop,
        isMore,
    };
}
exports.executeQuery = executeQuery;
exports.default = executeQuery;
//# sourceMappingURL=executeQuery.js.map