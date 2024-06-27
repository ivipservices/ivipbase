import { ID, PathInfo, SimpleEventEmitter } from "ivipbase-core";
import { getTypedChildValue, getValueType, nodeValueTypes, processReadNodeValue, valueFitsInline } from "./utils.js";
import { allowEventLoop, isDate, removeNulls } from "../../../utils/index.js";
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
    constructor(database, nodes) {
        super();
        this.database = database;
        this.nodes = nodes;
        this._ready = false;
        this.rootPath = new PathInfo("");
        this.indexes = {};
        this.tree = {};
        this.applyNodes(this.nodes).then(() => {
            this._ready = true;
            this.emit("ready");
        });
    }
    once(event, callback) {
        return super.once(event, callback);
    }
    on(event, callback) {
        return super.on(event, callback);
    }
    emit(event, data) {
        if (event === "remove" || event === "change" || event === "add") {
            data = {
                dbName: this.database,
                name: event,
                path: data.path,
                content: removeNulls(data.content),
                value: removeNulls(data.content.value),
                previous: event === "change" ? removeNulls(data?.previous_content?.value) : undefined,
            };
            if (event === "change" && JSON.stringify(data.value) === JSON.stringify(data.previous)) {
                return this;
            }
        }
        return super.emit(event, data);
    }
    async ready(callback) {
        if (!this._ready) {
            // Aguarda o evento ready
            await new Promise((resolve) => this.once("ready", resolve));
        }
        callback?.();
    }
    get path() {
        return this.rootPath.path;
    }
    pushIndex(node) {
        const pathInfo = new PathInfo(node.path);
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
    async applyNodes(nodes) {
        await allowEventLoop(nodes, (node) => {
            const pathInfo = new PathInfo(node.path);
            if (this.rootPath.path === "" || !this.rootPath.path) {
                this.rootPath = pathInfo;
            }
            else if (this.rootPath.isChildOf(pathInfo)) {
                this.rootPath = pathInfo;
            }
            this.pushIndex(node);
        }, {
            length_cycles: 1000,
        });
        return this;
    }
    static createBy(database, nodes) {
        return new NTree(database, nodes);
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
    async getChildPathsBy(path) {
        const pathInfo = new PathInfo(path);
        const list = [];
        await allowEventLoop(this.tree, (_, path) => {
            if (pathInfo.isParentOf(path)) {
                list.push(path);
            }
        }, {
            length_cycles: 1000,
        });
        return list;
    }
    async getChildNodesBy(path) {
        const pathInfo = new PathInfo(path);
        const list = [];
        await allowEventLoop(this.tree, (_, path) => {
            if (pathInfo.isParentOf(path)) {
                list.push(this.indexes[path]);
            }
        }, {
            length_cycles: 1000,
        });
        return list;
    }
    async get(path, options = {}) {
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
            return removeNulls(value);
        }
        else {
            value = content.value;
        }
        if (content.type === nodeValueTypes.OBJECT || content.type === nodeValueTypes.ARRAY) {
            value = removeNulls(resolveObjetByIncluded(nodePath, content.type === nodeValueTypes.ARRAY ? (Array.isArray(content.value) ? content.value : []) : content.value, options));
            const tree = this.tree[nodePath];
            if (tree instanceof Node) {
                await allowEventLoop(tree.childrens, async (child) => {
                    const pathInfo = PathInfo.get(child);
                    if (pathInfo.key !== null && checkIncludedPath(child, options)) {
                        value[pathInfo.key] = await this.get(pathInfo.path, options);
                    }
                });
            }
        }
        return value;
    }
    async remove(path) {
        const pathInfo = new PathInfo(path);
        let nodeInfo = this.indexes[pathInfo.path];
        if (!nodeInfo && pathInfo.parentPath && this.hasNode(pathInfo.parentPath)) {
            nodeInfo = this.indexes[pathInfo.parentPath];
        }
        if (!nodeInfo) {
            return;
        }
        const key = pathInfo.key;
        if (pathInfo.isChildOf(nodeInfo.path) && key !== null && typeof nodeInfo.content.value === "object" && nodeInfo.content.value !== null && key in nodeInfo.content.value) {
            const previous_content = JSON.parse(JSON.stringify(nodeInfo.content));
            delete nodeInfo.content.value[key];
            this.emit("change", { ...nodeInfo, previous_content });
        }
        if (pathInfo.equals(nodeInfo.path)) {
            const { childrens } = this.tree[nodeInfo.path];
            this.emit("remove", nodeInfo);
            delete this.indexes[nodeInfo.path];
            delete this.tree[nodeInfo.path];
            await allowEventLoop(childrens, async (child) => {
                await this.remove(child);
            });
        }
    }
    async verifyParents(path, options) {
        const pathInfo = new PathInfo(path).parent;
        const revision = options?.assert_revision ?? ID.generate();
        if (!pathInfo) {
            return;
        }
        const keys = pathInfo.keys;
        await allowEventLoop(new Array(keys.length).fill(null), async (_, i) => {
            const parentPath = PathInfo.get(keys.slice(0, i + 1));
            if (!this.hasNode(parentPath.path)) {
                const node = {
                    path: parentPath.path,
                    content: {
                        type: (typeof parentPath.key === "number" ? nodeValueTypes.ARRAY : nodeValueTypes.OBJECT),
                        value: {},
                        revision,
                        revision_nr: 1,
                        created: Date.now(),
                        modified: Date.now(),
                    },
                };
                this.pushIndex(node);
                this.emit("add", node);
            }
        });
    }
    async set(path, data, options = {
        maxInlineValueSize: 200,
    }) {
        await this.destructure("SET", path, data, options);
    }
    async update(path, data, options = {
        maxInlineValueSize: 200,
    }) {
        await this.destructure("UPDATE", path, data, options);
    }
    async destructure(type, path, data, options = {
        maxInlineValueSize: 200,
    }) {
        let pathInfo = new PathInfo(path);
        const parentPath = pathInfo.parent;
        const revision = options?.assert_revision ?? ID.generate();
        options.assert_revision = revision;
        options.include_checks = typeof options.include_checks === "boolean" ? options.include_checks : true;
        if (["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(data)) !== true) {
            type = "UPDATE";
            if (typeof pathInfo.key === "number") {
                const val = data;
                data = new Array();
                data[pathInfo.key] = val;
            }
            else {
                data = {
                    [pathInfo.key]: data,
                };
            }
            pathInfo = pathInfo.parent;
        }
        if (options.include_checks) {
            this.verifyParents(pathInfo.path, options);
        }
        const isArray = Object.prototype.toString.call(data) === "[object Array]" || Array.isArray(data);
        const node = {
            path: pathInfo.path,
            content: {
                type: (isArray ? nodeValueTypes.ARRAY : nodeValueTypes.OBJECT),
                value: {},
                revision,
                revision_nr: 1,
                created: Date.now(),
                modified: Date.now(),
            },
        };
        const fitsInlineKeys = [];
        await allowEventLoop(data, async (val, key) => {
            const fitsInline = valueFitsInline(val, options);
            if (fitsInline) {
                fitsInlineKeys.push(key);
            }
        });
        if (parentPath && !parentPath.equals(pathInfo) && this.hasNode(parentPath.path) && pathInfo.key !== null) {
            const mainNode = this.indexes[parentPath.path];
            if (mainNode.content.type === nodeValueTypes.OBJECT || mainNode.content.type === nodeValueTypes.ARRAY) {
                const previous_content = JSON.parse(JSON.stringify(mainNode.content));
                if (pathInfo.key in mainNode.content.value) {
                    delete mainNode.content.value[pathInfo.key];
                    mainNode.content.modified = Date.now();
                    mainNode.content.revision_nr = mainNode.content.revision_nr + 1;
                    this.emit("change", { ...mainNode, previous_content });
                }
            }
        }
        if (this.hasNode(pathInfo.path)) {
            const mainNode = this.indexes[pathInfo.path];
            const previous_content = JSON.parse(JSON.stringify(mainNode.content));
            const childs = await this.getChildPathsBy(pathInfo.path);
            if (mainNode.content.type !== node.content.type) {
                type = "SET";
                await allowEventLoop(childs, async (path) => {
                    await this.remove(path);
                });
            }
            if (type === "UPDATE") {
                node.content.value = Array.isArray(mainNode.content.value)
                    ? mainNode.content.value.reduce((acc, curr, index) => {
                        acc[index] = curr;
                        return acc;
                    }, {})
                    : mainNode.content.value;
            }
            else {
                await allowEventLoop(childs, async (path) => {
                    const pathInfo = new PathInfo(path);
                    if (pathInfo.key !== null && !(pathInfo.key in data)) {
                        await this.remove(path);
                    }
                });
            }
            await allowEventLoop(data, async (val, key) => {
                const newPath = PathInfo.get([pathInfo.path, key]);
                if (fitsInlineKeys.includes(key)) {
                    if (this.hasNode(newPath.path)) {
                        await this.remove(newPath.path);
                    }
                    node.content.value[key] = getTypedChildValue(val);
                }
                else if (key in node.content.value) {
                    delete node.content.value[key];
                }
            });
            node.content.created = mainNode.content.created;
            node.content.modified = Date.now();
            node.content.revision_nr = mainNode.content.revision_nr + 1;
            this.pushIndex(node);
            this.emit("change", { ...node, previous_content });
        }
        else {
            await allowEventLoop(fitsInlineKeys, async (key) => {
                const newPath = PathInfo.get([pathInfo.path, key]);
                if (this.hasNode(newPath.path)) {
                    await this.remove(newPath.path);
                }
                node.content.value[key] = getTypedChildValue(data[key]);
            });
            this.pushIndex(node);
            this.emit("add", node);
        }
        await allowEventLoop(data, async (val, key) => {
            const newPath = PathInfo.get([pathInfo.path, key]);
            if (!fitsInlineKeys.includes(key)) {
                const typeValue = getValueType(val);
                if (typeValue === nodeValueTypes.ARRAY || typeValue === nodeValueTypes.OBJECT) {
                    await this.destructure(type, newPath.path, val, options);
                }
                else {
                    const node = {
                        path: newPath.path,
                        content: {
                            type: typeValue,
                            value: val,
                            revision,
                            revision_nr: 1,
                            created: Date.now(),
                            modified: Date.now(),
                        },
                    };
                    if (this.hasNode(newPath.path)) {
                        const mainNode = this.indexes[newPath.path];
                        const previous_content = JSON.parse(JSON.stringify(mainNode.content));
                        if (mainNode.content.type !== node.content.type) {
                            const childs = await this.getChildPathsBy(newPath.path);
                            await allowEventLoop(childs, async (path) => {
                                await this.remove(path);
                            });
                        }
                        node.content.created = mainNode.content.created;
                        node.content.modified = Date.now();
                        node.content.revision_nr = mainNode.content.revision_nr + 1;
                        this.pushIndex(node);
                        this.emit("change", { ...node, previous_content });
                    }
                    else {
                        this.pushIndex(node);
                        this.emit("add", node);
                    }
                }
            }
        });
    }
    async findChildsBy(path, query) {
        const queryFilters = query.filters ?? [];
        const querySort = query.order ?? [];
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
        const childs = (await this.getChildNodesBy(path)).sort((a, b) => compare({
            path: a.path,
            val: processReadNodeValue(a.content).value,
        }, {
            path: b.path,
            val: processReadNodeValue(b.content).value,
        }, 0));
    }
}
export default NTree;
//# sourceMappingURL=NTree.js.map