"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ivipbase_core_1 = require("ivipbase-core");
const utils_1 = require("./utils");
function structureNodes(path, nodes, options = {}) {
    var _a, _b;
    options.path_main = !options.path_main ? path : options.path_main;
    const include = ((_a = options === null || options === void 0 ? void 0 : options.include) !== null && _a !== void 0 ? _a : []).map((p) => { var _a; return ivipbase_core_1.PathInfo.get([(_a = options.path_main) !== null && _a !== void 0 ? _a : path, p]); });
    const exclude = ((_b = options === null || options === void 0 ? void 0 : options.exclude) !== null && _b !== void 0 ? _b : []).map((p) => { var _a; return ivipbase_core_1.PathInfo.get([(_a = options.path_main) !== null && _a !== void 0 ? _a : path, p]); });
    const pathInfo = ivipbase_core_1.PathInfo.get(path);
    const checkIncludedPath = (from) => {
        const p = ivipbase_core_1.PathInfo.get(from);
        const isInclude = include.length > 0 ? include.findIndex((path) => p.equals(path) || p.isDescendantOf(path)) >= 0 : true;
        return exclude.findIndex((path) => p.equals(path) || p.isDescendantOf(path)) < 0 && isInclude;
    };
    let value = undefined;
    if (nodes.length === 1) {
        const { path: p, content } = nodes[0];
        value = (0, utils_1.processReadNodeValue)(content).value;
        if (content.type === utils_1.nodeValueTypes.OBJECT) {
            value = Object.fromEntries(Object.entries(value).filter(([k, v]) => {
                const p = ivipbase_core_1.PathInfo.get([path, k]);
                return checkIncludedPath(p.path);
            }));
        }
        if (pathInfo.equals(p) !== true) {
            value = pathInfo.key !== null && pathInfo.key in value ? value[pathInfo.key] : undefined;
        }
    }
    else if (nodes.length > 1) {
        nodes = nodes
            .filter(({ path }) => checkIncludedPath(path))
            .sort(({ path: p1 }, { path: p2 }) => {
            return ivipbase_core_1.PathInfo.get(p1).isAncestorOf(p2) ? -1 : ivipbase_core_1.PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
        });
        const responsibleNode = nodes.find(({ path: p }) => pathInfo.equals(p));
        if (!responsibleNode) {
            value = undefined;
        }
        else {
            value = (0, utils_1.processReadNodeValue)(responsibleNode.content).value;
            const child_nodes = nodes.filter(({ path: p }) => pathInfo.isParentOf(p));
            for (let node of child_nodes) {
                const pathInfo = ivipbase_core_1.PathInfo.get(node.path);
                if (pathInfo.key === null) {
                    continue;
                }
                const v = structureNodes(node.path, nodes.filter(({ path: p }) => pathInfo.equals(p) || pathInfo.isAncestorOf(p)), options);
                value[pathInfo.key] = v;
            }
        }
    }
    return value;
}
exports.default = structureNodes;
//# sourceMappingURL=structureNodes.js.map