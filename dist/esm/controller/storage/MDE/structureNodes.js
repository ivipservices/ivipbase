import { PathInfo } from "ivipbase-core";
import { nodeValueTypes, processReadNodeValue } from "./utils.js";
export default function structureNodes(path, nodes, options) {
    const include = (options?.include ?? []).map((p) => PathInfo.get([path, p]));
    const exclude = (options?.exclude ?? []).map((p) => PathInfo.get([path, p]));
    const pathInfo = PathInfo.get(path);
    const checkIncludedPath = (from) => {
        const p = PathInfo.get(from);
        const isInclude = include.length > 0 ? include.findIndex((path) => p.equals(path) || p.isDescendantOf(path)) >= 0 : true;
        return exclude.findIndex((path) => p.equals(path) || p.isDescendantOf(path)) < 0 && isInclude;
    };
    let value = undefined;
    if (nodes.length === 1) {
        const { path: p, content } = nodes[0];
        value = processReadNodeValue(content).value;
        if (content.type === nodeValueTypes.OBJECT) {
            value = Object.fromEntries(Object.entries(value).filter(([k, v]) => {
                const p = PathInfo.get([path, k]);
                return checkIncludedPath(p.path);
            }));
        }
        if (pathInfo.equals(p) !== true) {
            value = pathInfo.key !== null && pathInfo.key in value ? value[pathInfo.key] : undefined;
        }
    }
    else if (nodes.length > 1) {
        nodes = nodes.filter(({ path }) => checkIncludedPath(path));
        const responsibleNode = nodes.find(({ path: p }) => pathInfo.equals(p));
        if (!responsibleNode) {
            value = undefined;
        }
        else {
            value = processReadNodeValue(responsibleNode.content).value;
            const child_nodes = nodes.filter(({ path: p }) => pathInfo.isParentOf(p));
            for (let node of child_nodes) {
                const pathInfo = PathInfo.get(node.path);
                if (!pathInfo.key) {
                    continue;
                }
                const v = structureNodes(node.path, nodes.filter(({ path: p }) => pathInfo.isAncestorOf(p)), options);
                value[pathInfo.key] = v;
            }
        }
    }
    return value;
}
//# sourceMappingURL=structureNodes.js.map