"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveObjetByIncluded = exports.checkIncludedPath = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const utils_1 = require("./utils");
const checkIncludedPath = (from, options) => {
    var _a, _b;
    const include = ((_a = options === null || options === void 0 ? void 0 : options.include) !== null && _a !== void 0 ? _a : []).map((p) => ivipbase_core_1.PathInfo.get([options.main_path, p]));
    const exclude = ((_b = options === null || options === void 0 ? void 0 : options.exclude) !== null && _b !== void 0 ? _b : []).map((p) => ivipbase_core_1.PathInfo.get([options.main_path, p]));
    const p = ivipbase_core_1.PathInfo.get(from);
    const isInclude = include.length > 0 ? include.findIndex((path) => p.isParentOf(path) || p.equals(path) || p.isDescendantOf(path)) >= 0 : true;
    return exclude.findIndex((path) => p.equals(path) || p.isDescendantOf(path)) < 0 && isInclude;
};
exports.checkIncludedPath = checkIncludedPath;
const resolveObjetByIncluded = (path, obj, options) => {
    return Array.isArray(obj)
        ? obj.filter((_, k) => {
            const p = ivipbase_core_1.PathInfo.get([path, k]);
            return (0, exports.checkIncludedPath)(p.path, options);
        })
        : Object.fromEntries(Object.entries(obj)
            .filter(([k, v]) => {
            const p = ivipbase_core_1.PathInfo.get([path, k]);
            return (0, exports.checkIncludedPath)(p.path, options);
        })
            .map(([k, v]) => {
            if (["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(v))) {
                return [k, (0, exports.resolveObjetByIncluded)(ivipbase_core_1.PathInfo.get([path, k]).path, v, options)];
            }
            return [k, v];
        }));
};
exports.resolveObjetByIncluded = resolveObjetByIncluded;
function structureNodes(path, nodes, options = {}) {
    var _a;
    options.main_path = !options.main_path ? path : options.main_path;
    const pathInfo = ivipbase_core_1.PathInfo.get(path);
    const mainNode = nodes.find(({ path: p }) => pathInfo.equals(p));
    const parentNode = nodes.find(({ path: p }) => pathInfo.isChildOf(p));
    const nodeInfo = mainNode !== null && mainNode !== void 0 ? mainNode : parentNode;
    if (!nodeInfo) {
        return undefined;
    }
    let value = undefined;
    let { path: nodePath, content } = nodeInfo;
    content = (0, utils_1.processReadNodeValue)(content);
    if (pathInfo.isChildOf(nodePath)) {
        if ((content.type === utils_1.nodeValueTypes.OBJECT || content.type === utils_1.nodeValueTypes.ARRAY) &&
            typeof content.value === "object" &&
            content.value !== null &&
            pathInfo.key &&
            pathInfo.key in content.value) {
            value = (_a = content.value[pathInfo.key]) !== null && _a !== void 0 ? _a : undefined;
        }
        return value;
    }
    if (content.type === utils_1.nodeValueTypes.OBJECT || content.type === utils_1.nodeValueTypes.ARRAY) {
        const val = content.type === utils_1.nodeValueTypes.ARRAY ? (Array.isArray(content.value) ? content.value : []) : content.value;
        return nodes
            .filter(({ path: p }) => pathInfo.isParentOf(p) || pathInfo.isAncestorOf(p))
            .sort((a, b) => {
            const aPath = ivipbase_core_1.PathInfo.get(a.path);
            const bPath = ivipbase_core_1.PathInfo.get(b.path);
            return aPath.isAncestorOf(bPath) || aPath.isParentOf(bPath) ? -1 : aPath.isDescendantOf(bPath) || aPath.isChildOf(bPath) ? 1 : 0;
        })
            .reduce((acc, { path, content }) => {
            const pathInfo = ivipbase_core_1.PathInfo.get(path);
            if (pathInfo.key !== null && (0, exports.checkIncludedPath)(path, options)) {
                content = (0, utils_1.processReadNodeValue)(content);
                const propertyTrail = ivipbase_core_1.PathInfo.getPathKeys(path.slice(nodePath.length + 1));
                let targetObject = acc;
                const targetProperty = propertyTrail.slice(-1)[0];
                for (let p of propertyTrail.slice(0, -1)) {
                    if (!(p in targetObject)) {
                        targetObject[p] = typeof p === "number" ? [] : {};
                    }
                    targetObject = targetObject[p];
                }
                if (content.type === utils_1.nodeValueTypes.OBJECT || content.type === utils_1.nodeValueTypes.ARRAY) {
                    const val = content.type === utils_1.nodeValueTypes.ARRAY ? (Array.isArray(content.value) ? content.value : []) : content.value;
                    targetObject[targetProperty] = (0, exports.resolveObjetByIncluded)(path, val, options);
                }
                else {
                    targetObject[targetProperty] = content.value;
                }
            }
            return acc;
        }, (0, exports.resolveObjetByIncluded)(nodePath, val, options));
    }
    return content.value;
}
exports.default = structureNodes;
//# sourceMappingURL=structureNodes.js.map