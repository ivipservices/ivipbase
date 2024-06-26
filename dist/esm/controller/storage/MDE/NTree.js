import { PathInfo, SimpleEventEmitter } from "ivipbase-core";
import { nodeValueTypes, processReadNodeValue } from "./utils.js";
const checkIncludedPath = (from, options) => {
    const include = (options?.include ?? []).map((p) => PathInfo.get([options.main_path, p]));
    const exclude = (options?.exclude ?? []).map((p) => PathInfo.get([options.main_path, p]));
    const p = PathInfo.get(from);
    const isInclude = include.length > 0 ? include.findIndex((path) => p.isParentOf(path) || p.equals(path) || p.isDescendantOf(path)) >= 0 : true;
    return exclude.findIndex((path) => p.equals(path) || p.isDescendantOf(path)) < 0 && isInclude;
};
const resolveObjetByIncluded = (path, obj, options) => {
    return Array.isArray(obj)
        ? obj
            .filter((_, k) => {
            const p = PathInfo.get([path, k]);
            return checkIncludedPath(p.path, options);
        })
            .map((v, k) => {
            if (["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(v))) {
                return resolveObjetByIncluded(PathInfo.get([path, k]).path, v, options);
            }
            return v;
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
class Node {
    constructor(path = "") {
        this.path = path;
        this.childrens = [];
    }
    pushChild(path) {
        if (!this.childrens.includes(path)) {
            this.childrens.push(path);
        }
        return this;
    }
}
export class NTree extends SimpleEventEmitter {
    constructor(nodes) {
        super();
        this.nodes = nodes;
        this.rootPath = new PathInfo("");
        this.removedNodes = [];
        this.addedNodes = [];
        this.updatedNodes = [];
        this.indexes = {};
        this.tree = {};
        this.applyNodes(this.nodes);
    }
    get path() {
        return this.rootPath.path;
    }
    applyNodes(nodes) {
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const pathInfo = new PathInfo(node.path);
            if (this.rootPath.path === "" || !this.rootPath.path) {
                this.rootPath = pathInfo;
            }
            else if (this.rootPath.isChildOf(pathInfo)) {
                this.rootPath = pathInfo;
            }
            this.indexes[pathInfo.path] = node;
            if (!(this.tree[pathInfo.path] instanceof Node)) {
                this.tree[pathInfo.path] = new Node(pathInfo.path);
            }
            let parent = pathInfo.parent, childPath = pathInfo.path;
            while (parent !== null) {
                if (this.tree[parent.path] instanceof Node) {
                    this.tree[parent.path].pushChild(childPath);
                    break;
                }
                else {
                    this.tree[parent.path] = new Node(parent.path).pushChild(childPath);
                    childPath = parent.path;
                    parent = parent.parent;
                }
            }
        }
        return this;
    }
    static createBy(nodes) {
        return new NTree(nodes);
    }
    hasNode(path) {
        const pathInfo = new PathInfo(path);
        return pathInfo.path in this.indexes;
    }
    getNodeBy(path) {
        const pathInfo = new PathInfo(path);
        let nodeInfo;
        if (this.hasNode(pathInfo.path)) {
            nodeInfo = this.indexes[pathInfo.path];
        }
        else if (pathInfo.parentPath && this.hasNode(pathInfo.parentPath)) {
            nodeInfo = this.indexes[pathInfo.parentPath];
        }
        return nodeInfo;
    }
    getChildNodesBy(path) {
        const pathInfo = new PathInfo(path);
        if (this.hasNode(pathInfo.path)) {
            const tree = this.tree[pathInfo.path];
            return tree.childrens.map((childPath) => {
                return this.indexes[childPath];
            });
        }
        return [];
    }
    strucuture(path, options = {}) {
        const pathInfo = new PathInfo(path);
        options.main_path = !options.main_path ? pathInfo.path : options.main_path;
        let nodeInfo = this.indexes[pathInfo.path];
        if (!nodeInfo && pathInfo.parentPath && this.hasNode(pathInfo.parentPath)) {
            nodeInfo = this.indexes[pathInfo.parentPath];
        }
        if (!nodeInfo) {
            return null;
        }
        let value = undefined;
        let { path: nodePath, content } = nodeInfo;
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
            value = resolveObjetByIncluded(nodePath, content.type === nodeValueTypes.ARRAY ? (Array.isArray(content.value) ? content.value : []) : content.value, options);
            const tree = this.tree[nodePath];
            if (tree instanceof Node) {
                for (const child of tree.childrens) {
                    const pathInfo = PathInfo.get(child);
                    if (pathInfo.key !== null && checkIncludedPath(child, options)) {
                        value[pathInfo.key] = this.strucuture(pathInfo.path, options);
                    }
                }
            }
        }
        return value;
    }
    destructure(type, path, data, options = {
        maxInlineValueSize: 200,
    }) {
        return this;
    }
}
export default NTree;
//# sourceMappingURL=NTree.js.map