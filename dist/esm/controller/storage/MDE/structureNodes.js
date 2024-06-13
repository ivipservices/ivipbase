import { PathInfo } from "ivipbase-core";
import { nodeValueTypes, processReadNodeValue } from "./utils.js";
export const checkIncludedPath = (from, options) => {
    const include = (options?.include ?? []).map((p) => PathInfo.get([options.main_path, p]));
    const exclude = (options?.exclude ?? []).map((p) => PathInfo.get([options.main_path, p]));
    const p = PathInfo.get(from);
    const isInclude = include.length > 0 ? include.findIndex((path) => p.equals(path) || p.isDescendantOf(path)) >= 0 : true;
    return exclude.findIndex((path) => p.equals(path) || p.isDescendantOf(path)) < 0 && isInclude;
};
export const resolveObjetByIncluded = (path, obj, options) => {
    return Array.isArray(obj)
        ? obj.filter((_, k) => {
            const p = PathInfo.get([path, k]);
            return checkIncludedPath(p.path, options);
        })
        : Object.fromEntries(Object.entries(obj)
            .filter(([k, v]) => {
            const p = PathInfo.get([path, k]);
            return checkIncludedPath(p.path, options);
        })
            .map(([k, v]) => {
            if (["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(v))) {
                return [k, resolveObjetByIncluded(PathInfo.get([path, k]).path, v, options)];
            }
            return [k, v];
        }));
};
export default function structureNodes(path, nodes, options = {}) {
    options.main_path = !options.main_path ? path : options.main_path;
    const pathInfo = PathInfo.get(path);
    const mainNode = nodes.find(({ path: p }) => pathInfo.equals(p) || pathInfo.isChildOf(p));
    if (!mainNode) {
        return undefined;
    }
    let value = undefined;
    let { path: nodePath, content } = mainNode;
    content = processReadNodeValue(content);
    if (pathInfo.isChildOf(nodePath)) {
        if ((content.type === nodeValueTypes.OBJECT || content.type === nodeValueTypes.ARRAY) &&
            typeof content.value === "object" &&
            content.value !== null &&
            pathInfo.key &&
            pathInfo.key in content.value) {
            value = content.value[pathInfo.key] ?? undefined;
        }
        return value;
    }
    if (content.type === nodeValueTypes.OBJECT || content.type === nodeValueTypes.ARRAY) {
        const val = content.type === nodeValueTypes.ARRAY ? (Array.isArray(content.value) ? content.value : []) : content.value;
        return nodes
            .filter(({ path: p }) => pathInfo.isParentOf(p) || pathInfo.isAncestorOf(p))
            .sort((a, b) => {
            const aPath = PathInfo.get(a.path);
            const bPath = PathInfo.get(b.path);
            return aPath.isAncestorOf(bPath) || aPath.isParentOf(bPath) ? -1 : aPath.isDescendantOf(bPath) || aPath.isChildOf(bPath) ? 1 : 0;
        })
            .reduce((acc, { path, content }) => {
            const pathInfo = PathInfo.get(path);
            if (pathInfo.key !== null && checkIncludedPath(path, options)) {
                content = processReadNodeValue(content);
                const propertyTrail = PathInfo.getPathKeys(path.slice(nodePath.length + 1));
                let targetObject = acc;
                const targetProperty = propertyTrail.slice(-1)[0];
                for (let p of propertyTrail.slice(0, -1)) {
                    if (!(p in targetObject)) {
                        targetObject[p] = typeof p === "number" ? [] : {};
                    }
                    targetObject = targetObject[p];
                }
                if (content.type === nodeValueTypes.OBJECT || content.type === nodeValueTypes.ARRAY) {
                    const val = content.type === nodeValueTypes.ARRAY ? (Array.isArray(content.value) ? content.value : []) : content.value;
                    targetObject[targetProperty] = resolveObjetByIncluded(path, val, options);
                }
                else {
                    targetObject[targetProperty] = content.value;
                }
            }
            return acc;
        }, resolveObjetByIncluded(nodePath, val, options));
    }
    return content.value;
    // if (nodes.length === 1) {
    // 	const { path: p, content } = nodes[0];
    // 	value = processReadNodeValue(content).value;
    // 	if (content.type === nodeValueTypes.OBJECT) {
    // 		value = Object.fromEntries(
    // 			Object.entries(value).filter(([k, v]) => {
    // 				const p = PathInfo.get([path, k]);
    // 				return checkIncludedPath(p.path);
    // 			}),
    // 		);
    // 	}
    // 	if (pathInfo.equals(p) !== true) {
    // 		value = pathInfo.key !== null && pathInfo.key in value ? value[pathInfo.key] : undefined;
    // 	}
    // } else if (nodes.length > 1) {
    // 	nodes = nodes
    // 		.filter(({ path }) => checkIncludedPath(path))
    // 		.sort(({ path: p1 }, { path: p2 }) => {
    // 			return PathInfo.get(p1).isAncestorOf(p2) ? -1 : PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
    // 		});
    // 	const responsibleNode = nodes.find(({ path: p }) => pathInfo.equals(p));
    // 	if (!responsibleNode) {
    // 		value = undefined;
    // 	} else {
    // 		value = processReadNodeValue(responsibleNode.content).value;
    // 		const child_nodes = nodes.filter(({ path: p }) => pathInfo.isParentOf(p));
    // 		for (let node of child_nodes) {
    // 			const pathInfo = PathInfo.get(node.path);
    // 			if (pathInfo.key === null) {
    // 				continue;
    // 			}
    // 			const v = structureNodes(
    // 				node.path,
    // 				nodes.filter(({ path: p }) => pathInfo.equals(p) || pathInfo.isAncestorOf(p)),
    // 				options,
    // 			);
    // 			value[pathInfo.key] = v;
    // 		}
    // 	}
    // }
    // return value;
}
//# sourceMappingURL=structureNodes.js.map