import { ID, PathInfo } from "ivipbase-core";
import { isDate, removeNulls } from "../utils/index.js";
import structureNodes, { resolveObjetByIncluded } from "./storage/MDE/structureNodes.js";
const noop = () => { };
export const executeFilters = (mainPath, currentPath, value, queryFilters) => {
    const params = PathInfo.extractVariables(mainPath, currentPath);
    const filters = queryFilters.filter((f) => ["<", "<=", "==", "!=", ">=", ">", "like", "!like", "in", "!in", "exists", "!exists", "between", "!between", "matches", "!matches", "has", "!has", "contains", "!contains"].includes(f.op));
    value = ["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(value)) ? value : {};
    return filters.every((f) => {
        let val = value[f.key] ?? params[f.key] ?? null;
        val = isDate(val) ? new Date(val).getTime() : val;
        const op = f.op;
        const compare = isDate(f.compare) ? new Date(f.compare).getTime() : f.compare;
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
};
export const executeQueryRealtime = (db, path, query, options, matchedPaths) => {
    if (options?.monitor === true) {
        options.monitor = { add: true, change: true, remove: true };
    }
    const isRealtime = typeof options.monitor === "object" && [options.monitor?.add, options.monitor?.change, options.monitor?.remove].some((val) => val === true);
    if (isRealtime && typeof options?.eventHandler === "function") {
        const queryFilters = query.filters ?? [];
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
            let main_path = PathInfo.get(path);
            while (!main_path?.isChildOf(originalPath) && main_path.parent !== null) {
                main_path = main_path.parent;
            }
            return main_path;
        };
        const childChangedCallback = async (err, path, newValue, oldValue) => {
            const wasMatch = matchedPaths.includes(path);
            let keepMonitoring = true;
            if (typeof options?.eventHandler !== "function" || newValue === null || newValue === undefined) {
                return;
            }
            let main_path = getMainPathChild(path);
            if (!main_path?.isChildOf(originalPath)) {
                return;
            }
            let isMatch = ["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(newValue)) && executeFilters(originalPath, path, newValue, queryFilters);
            if (options.snapshots) {
                newValue = ["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(newValue))
                    ? removeNulls(resolveObjetByIncluded(path, newValue, {
                        include: options.include,
                        exclude: options.exclude,
                        main_path: main_path.path,
                    })) ?? null
                    : newValue;
            }
            const isChange = typeof options?.monitor === "boolean" ? options.monitor : options?.monitor?.change ?? false;
            const isAdd = typeof options?.monitor === "boolean" ? options.monitor : options?.monitor?.add ?? false;
            const isRemove = typeof options?.monitor === "boolean" ? options.monitor : options?.monitor?.remove ?? false;
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
            const wasMatch = ["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(newValue)) && executeFilters(originalPath, path, newValue, queryFilters);
            if (typeof options?.eventHandler !== "function" || !wasMatch || newValue === null || newValue === undefined) {
                return;
            }
            let main_path = getMainPathChild(path);
            if (!main_path?.isChildOf(originalPath)) {
                return;
            }
            let keepMonitoring = true;
            addMatch(path);
            const isAdd = typeof options?.monitor === "boolean" ? options.monitor : options?.monitor?.add ?? false;
            if (isAdd) {
                if (options.snapshots) {
                    newValue = ["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(newValue))
                        ? removeNulls(resolveObjetByIncluded(path, newValue, {
                            include: options.include,
                            exclude: options.exclude,
                            main_path: main_path.path,
                        })) ?? null
                        : newValue;
                }
                keepMonitoring = options.eventHandler({ name: "add", path: path, value: options.snapshots ? newValue : null }) !== false;
            }
            if (keepMonitoring === false) {
                stopMonitoring();
            }
        };
        const childRemovedCallback = (err, path, newValue, oldValue) => {
            let keepMonitoring = true;
            if (typeof options?.eventHandler !== "function") {
                return;
            }
            removeMatch(path);
            const isRemove = typeof options?.monitor === "boolean" ? options.monitor : options?.monitor?.remove ?? false;
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
/**
 *
 * @param storage Instância de armazenamento de destino
 * @param dbName Nome do banco de dados
 * @param path Caminho da coleção de objetos para executar a consulta
 * @param query Consulta a ser executada
 * @param options Opções adicionais
 * @returns Retorna uma promise que resolve com os dados ou caminhos correspondentes em `results`
 */
export async function executeQuery(db, path, query, options = { snapshots: false, include: undefined, exclude: undefined, child_objects: undefined, eventHandler: noop }) {
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
    path = PathInfo.get([api.storage.settings.prefix, originalPath]).path;
    const pathInfo = PathInfo.get(path);
    const context = {};
    context.database_cursor = ID.generate();
    const queryFilters = query.filters ?? [];
    const querySort = query.order ?? [];
    const nodes = await api.storage.getNodesBy(database, path, false, true, false).catch(() => Promise.resolve([]));
    // .then((nodes) => nodes.filter((n) => PathInfo.get(n.path).isChildOf(path) || PathInfo.get(n.path).isDescendantOf(path)));
    const mainNodesPaths = nodes.filter(({ path }) => pathInfo.equals(path)).map((p) => p.path);
    const compare = (a, b, i) => {
        const o = querySort[i];
        if (!o) {
            return 0;
        }
        const trailKeys = PathInfo.get(typeof o.key === "number" ? `[${o.key}]` : o.key).keys;
        let left = trailKeys.reduce((val, key) => (val !== null && typeof val === "object" && key && key in val ? val[key] : null), a.val);
        let right = trailKeys.reduce((val, key) => (val !== null && typeof val === "object" && key && key in val ? val[key] : null), b.val);
        left = isDate(left) ? new Date(left).getTime() : left;
        right = isDate(right) ? new Date(right).getTime() : right;
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
    let results = [];
    for (const path of mainNodesPaths) {
        const json = structureNodes(path, nodes);
        const list = Object.entries(json)
            .map(([k, val]) => {
            const p = PathInfo.get([path, k]).path;
            return { path: p, val };
        })
            .filter((node) => {
            if (!node) {
                return false;
            }
            return executeFilters(path, node.path, node.val, queryFilters);
        });
        results = results.concat(list);
    }
    results.sort((a, b) => {
        return compare(a, b, 0);
    });
    const take = query.take > 0 ? query.take : results.length;
    const totalLength = results.length;
    results = results.slice(query.skip * take, query.skip * take + take);
    const isMore = totalLength > query.skip * take + take;
    if (options.snapshots) {
        results = results.map(({ path, val }) => {
            const node_path = path.replace(new RegExp(`^${api.storage.settings.prefix.replace(/\//gi, "\\/")}`), "").replace(/^(\/)+/gi, "");
            val = removeNulls(["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(val))
                ? resolveObjetByIncluded(path, val, {
                    include: options.include,
                    exclude: options.exclude,
                    main_path: path,
                })
                : val);
            return { path: node_path, val };
        });
    }
    stop = executeQueryRealtime(db, originalPath, query, options, results.map(({ path }) => path.replace(new RegExp(`^${api.storage.settings.prefix.replace(/\//gi, "\\/")}`), "").replace(/^(\/)+/gi, "")));
    return {
        results: options.snapshots ? results : results.map(({ path }) => path.replace(new RegExp(`^${api.storage.settings.prefix.replace(/\//gi, "\\/")}`), "").replace(/^(\/)+/gi, "")),
        context,
        stop,
        isMore,
    };
}
export default executeQuery;
//# sourceMappingURL=executeQuery.js.map