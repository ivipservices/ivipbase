"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeQuery = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const utils_1 = require("./storage/MDE/utils");
const utils_2 = require("../utils");
const structureNodes_1 = __importDefault(require("./storage/MDE/structureNodes"));
const noop = () => { };
/**
 *
 * @param storage Instância de armazenamento de destino
 * @param dbName Nome do banco de dados
 * @param path Caminho da coleção de objetos para executar a consulta
 * @param query Consulta a ser executada
 * @param options Opções adicionais
 * @returns Retorna uma promise que resolve com os dados ou caminhos correspondentes em `results`
 */
async function executeQuery(api, database, path, query, options = { snapshots: false, include: undefined, exclude: undefined, child_objects: undefined, eventHandler: noop }) {
    var _a, _b, _c, _d, _e;
    if (typeof options !== "object") {
        options = {};
    }
    if (typeof options.snapshots === "undefined") {
        options.snapshots = false;
    }
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
    const filters = queryFilters.filter((f) => ["<", "<=", "==", "!=", ">=", ">", "like", "!like", "in", "!in", "exists", "!exists", "between", "!between", "matches", "!matches", "has", "!has", "contains", "!contains"].includes(f.op));
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
        const isFiltersValid = filters.every((f) => {
            const val = (0, utils_2.isDate)(node_val[f.key]) ? new Date(node_val[f.key]).getTime() : node_val[f.key];
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
        });
        return isFiltersValid;
    });
    const take = query.take > 0 ? query.take : results.length;
    results = results
        .sort((a, b) => {
        const compare = (i) => {
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
                    return compare(i + 1);
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
        return compare(0);
    })
        .filter((_, i) => i >= query.skip * take && i < query.skip * take + take);
    const isRealtime = typeof options.monitor === "object" && [(_c = options.monitor) === null || _c === void 0 ? void 0 : _c.add, (_d = options.monitor) === null || _d === void 0 ? void 0 : _d.change, (_e = options.monitor) === null || _e === void 0 ? void 0 : _e.remove].some((val) => val === true);
    if (options.snapshots) {
        results = results.map(({ path, nodes }) => {
            var _a;
            const node_path = path.replace(new RegExp(`^${api.storage.settings.prefix.replace(/\//gi, "\\/")}`), "").replace(/^(\/)+/gi, "");
            const val = (_a = (0, utils_2.removeNulls)((0, structureNodes_1.default)(path, nodes !== null && nodes !== void 0 ? nodes : [], {
                include: options.include,
                exclude: options.exclude,
            }))) !== null && _a !== void 0 ? _a : null;
            return { path: node_path, val };
        });
        // for (let i = 0; i < results.length; i++) {
        // 	const path = results[i].path.replace(`${api.storage.settings.prefix}`, "").replace(/^(\/)+/gi, "");
        // 	const byNodes = results[i].nodes ?? [];
        // 	const val =
        // 		removeNulls(
        // 			structureNodes(results[i].path, byNodes, {
        // 				include: options.include,
        // 				exclude: options.exclude,
        // 			}),
        // 		) ?? null;
        // 	results[i] = { path: path, val };
        // }
    }
    return {
        results: options.snapshots ? results : results.map(({ path }) => path.replace(new RegExp(`^${api.storage.settings.prefix.replace(/\//gi, "\\/")}`), "").replace(/^(\/)+/gi, "")),
        context: null,
        stop: async () => { },
    };
}
exports.executeQuery = executeQuery;
exports.default = executeQuery;
//# sourceMappingURL=executeQuery.js.map