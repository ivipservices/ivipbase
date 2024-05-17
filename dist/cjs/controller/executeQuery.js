"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeQuery = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const utils_1 = require("./storage/MDE/utils");
const ivip_utils_1 = require("ivip-utils");
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
    var _a, _b, _c;
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
    const queryFilters = query.filters.map((f) => (Object.assign({}, f)));
    const querySort = query.order.map((s) => (Object.assign({}, s)));
    const nodes = await api.storage
        .getNodesBy(database, path, true, false)
        .then((nodes) => {
        return Promise.resolve(nodes.filter(({ path: p }) => {
            return ivipbase_core_1.PathInfo.get(p).isChildOf(path);
        }));
    })
        .catch(() => Promise.resolve([]));
    let results = [];
    const pathInfo = ivipbase_core_1.PathInfo.get(path);
    const isWildcardPath = pathInfo.keys.some((key) => key === "*" || key.toString().startsWith("$")); // path.includes('*');
    const vars = isWildcardPath ? pathInfo.keys.filter((key) => typeof key === "string" && key.startsWith("$")) : [];
    for (const node of nodes) {
        const value = (0, utils_1.processReadNodeValue)(node.content).value;
        if (typeof value !== "object" || value === null) {
            continue;
        }
        const node_path = ivipbase_core_1.PathInfo.get(node.path);
        const params = Object.fromEntries(Object.entries(ivipbase_core_1.PathInfo.extractVariables(path, node_path.path)).filter(([key]) => vars.includes(key)));
        const node_val = Object.assign(Object.assign({}, params), value);
        const filters = queryFilters.filter((f) => ["<", "<=", "==", "!=", ">=", ">", "like", "!like", "in", "!in", "exists", "!exists", "between", "!between", "matches", "!matches", "has", "!has", "contains", "!contains"].includes(f.op));
        const isFiltersValid = filters.every((f) => {
            const val = (0, ivip_utils_1.isDate)(node_val[f.key]) ? new Date(node_val[f.key]).getTime() : node_val[f.key];
            const op = f.op;
            const compare = (0, ivip_utils_1.isDate)(f.compare) ? new Date(f.compare).getTime() : f.compare;
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
        if (isFiltersValid) {
            results.push({ path: node.path, val: value });
        }
    }
    results = results
        .sort((a, b) => {
        const compare = (i) => {
            const o = querySort[i];
            const trailKeys = ivipbase_core_1.PathInfo.get(typeof o.key === "number" ? `[${o.key}]` : o.key).keys;
            let left = trailKeys.reduce((val, key) => (val !== null && typeof val === "object" && key in val ? val[key] : null), a.val);
            let right = trailKeys.reduce((val, key) => (val !== null && typeof val === "object" && key in val ? val[key] : null), b.val);
            left = (0, ivip_utils_1.isDate)(left) ? new Date(left).getTime() : left;
            right = (0, ivip_utils_1.isDate)(right) ? new Date(right).getTime() : right;
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
        .slice(query.skip, query.skip + Math.abs(query.take > 0 ? query.take : results.length));
    const isRealtime = typeof options.monitor === "object" && [(_a = options.monitor) === null || _a === void 0 ? void 0 : _a.add, (_b = options.monitor) === null || _b === void 0 ? void 0 : _b.change, (_c = options.monitor) === null || _c === void 0 ? void 0 : _c.remove].some((val) => val === true);
    if (options.snapshots) {
        for (let i = 0; i < results.length; i++) {
            const path = results[i].path.replace(`${api.storage.settings.prefix}`, "").replace(/^(\/)+/gi, "");
            const val = await api.storage.get(database, path, {
                include: options.include,
                exclude: options.exclude,
            });
            results[i] = { path: path, val };
        }
    }
    return {
        results: options.snapshots ? results : results.map(({ path }) => path),
        context: null,
        stop: async () => { },
    };
}
exports.executeQuery = executeQuery;
exports.default = executeQuery;
//# sourceMappingURL=executeQuery.js.map