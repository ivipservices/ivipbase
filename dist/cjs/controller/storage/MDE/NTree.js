"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NTree = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const utils_1 = require("./utils");
const utils_2 = require("../../../utils");
const checkIncludedPath = (from, options) => {
    var _a, _b;
    const include = ((_a = options === null || options === void 0 ? void 0 : options.include) !== null && _a !== void 0 ? _a : []).map((p) => ivipbase_core_1.PathInfo.get([options.main_path, p]));
    const exclude = ((_b = options === null || options === void 0 ? void 0 : options.exclude) !== null && _b !== void 0 ? _b : []).map((p) => ivipbase_core_1.PathInfo.get([options.main_path, p]));
    const p = ivipbase_core_1.PathInfo.get(from);
    const isInclude = include.length > 0 ? include.findIndex((path) => p.isParentOf(path) || p.equals(path) || p.isDescendantOf(path)) >= 0 : true;
    return exclude.findIndex((path) => p.equals(path) || p.isDescendantOf(path)) < 0 && isInclude;
};
const resolveObjetByIncluded = (path, obj, options) => {
    return Array.isArray(obj)
        ? obj
            .filter((_, k) => {
            const p = ivipbase_core_1.PathInfo.get([path, k]);
            return checkIncludedPath(p.path, options);
        })
            .map((v, k) => {
            if (["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(v))) {
                return resolveObjetByIncluded(ivipbase_core_1.PathInfo.get([path, k]).path, v, options);
            }
            return v;
        })
        : Object.fromEntries(Object.entries(obj)
            .filter(([k, v]) => {
            const p = ivipbase_core_1.PathInfo.get([path, k]);
            return checkIncludedPath(p.path, options);
        })
            .map(([k, v]) => {
            if (["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(v))) {
                return [k, resolveObjetByIncluded(ivipbase_core_1.PathInfo.get([path, k]).path, v, options)];
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
class NTree extends ivipbase_core_1.SimpleEventEmitter {
    constructor(database, nodes) {
        super();
        this.database = database;
        this.nodes = nodes;
        this._ready = false;
        this.rootPath = new ivipbase_core_1.PathInfo("");
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
        var _a;
        if (event === "remove" || event === "change" || event === "add") {
            data = {
                dbName: this.database,
                name: event,
                path: data.path,
                content: (0, utils_2.removeNulls)(data.content),
                value: (0, utils_2.removeNulls)(data.content.value),
                previous: event === "change" ? (0, utils_2.removeNulls)((_a = data === null || data === void 0 ? void 0 : data.previous_content) === null || _a === void 0 ? void 0 : _a.value) : undefined,
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
        callback === null || callback === void 0 ? void 0 : callback();
    }
    get path() {
        return this.rootPath.path;
    }
    pushIndex(node) {
        const pathInfo = new ivipbase_core_1.PathInfo(node.path);
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
        await (0, utils_2.allowEventLoop)(nodes, (node) => {
            const pathInfo = new ivipbase_core_1.PathInfo(node.path);
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
        const pathInfo = new ivipbase_core_1.PathInfo(path);
        return pathInfo.path in this.indexes;
    }
    getNodeBy(path) {
        const pathInfo = new ivipbase_core_1.PathInfo(path);
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
        const pathInfo = new ivipbase_core_1.PathInfo(path);
        const list = [];
        await (0, utils_2.allowEventLoop)(this.tree, (_, path) => {
            if (pathInfo.isParentOf(path)) {
                list.push(path);
            }
        }, {
            length_cycles: 1000,
        });
        return list;
    }
    async getChildNodesBy(path) {
        const pathInfo = new ivipbase_core_1.PathInfo(path);
        const list = [];
        await (0, utils_2.allowEventLoop)(this.tree, (_, path) => {
            if (pathInfo.isParentOf(path)) {
                list.push(this.indexes[path]);
            }
        }, {
            length_cycles: 1000,
        });
        return list;
    }
    async get(path, options = {}) {
        var _a;
        const pathInfo = new ivipbase_core_1.PathInfo(path);
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
        content = (0, utils_1.processReadNodeValue)(content);
        if (pathInfo.isChildOf(nodePath)) {
            if ((content.type === utils_1.nodeValueTypes.OBJECT || content.type === utils_1.nodeValueTypes.ARRAY) &&
                typeof content.value === "object" &&
                content.value !== null &&
                pathInfo.key &&
                pathInfo.key in content.value) {
                value = (_a = content.value[pathInfo.key]) !== null && _a !== void 0 ? _a : undefined;
            }
            return (0, utils_2.removeNulls)(value);
        }
        else {
            value = content.value;
        }
        if (content.type === utils_1.nodeValueTypes.OBJECT || content.type === utils_1.nodeValueTypes.ARRAY) {
            value = (0, utils_2.removeNulls)(resolveObjetByIncluded(nodePath, content.type === utils_1.nodeValueTypes.ARRAY ? (Array.isArray(content.value) ? content.value : []) : content.value, options));
            const tree = this.tree[nodePath];
            if (tree instanceof Node) {
                await (0, utils_2.allowEventLoop)(tree.childrens, async (child) => {
                    const pathInfo = ivipbase_core_1.PathInfo.get(child);
                    if (pathInfo.key !== null && checkIncludedPath(child, options)) {
                        value[pathInfo.key] = await this.get(pathInfo.path, options);
                    }
                });
            }
        }
        return value;
    }
    async remove(path) {
        const pathInfo = new ivipbase_core_1.PathInfo(path);
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
            this.emit("change", Object.assign(Object.assign({}, nodeInfo), { previous_content }));
        }
        if (pathInfo.equals(nodeInfo.path)) {
            const { childrens } = this.tree[nodeInfo.path];
            this.emit("remove", nodeInfo);
            delete this.indexes[nodeInfo.path];
            delete this.tree[nodeInfo.path];
            await (0, utils_2.allowEventLoop)(childrens, async (child) => {
                await this.remove(child);
            });
        }
    }
    async verifyParents(path, options) {
        var _a;
        const pathInfo = new ivipbase_core_1.PathInfo(path).parent;
        const revision = (_a = options === null || options === void 0 ? void 0 : options.assert_revision) !== null && _a !== void 0 ? _a : ivipbase_core_1.ID.generate();
        if (!pathInfo) {
            return;
        }
        const keys = pathInfo.keys;
        await (0, utils_2.allowEventLoop)(new Array(keys.length).fill(null), async (_, i) => {
            const parentPath = ivipbase_core_1.PathInfo.get(keys.slice(0, i + 1));
            if (!this.hasNode(parentPath.path)) {
                const node = {
                    path: parentPath.path,
                    content: {
                        type: (typeof parentPath.key === "number" ? utils_1.nodeValueTypes.ARRAY : utils_1.nodeValueTypes.OBJECT),
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
        var _a;
        let pathInfo = new ivipbase_core_1.PathInfo(path);
        const parentPath = pathInfo.parent;
        const revision = (_a = options === null || options === void 0 ? void 0 : options.assert_revision) !== null && _a !== void 0 ? _a : ivipbase_core_1.ID.generate();
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
                type: (isArray ? utils_1.nodeValueTypes.ARRAY : utils_1.nodeValueTypes.OBJECT),
                value: {},
                revision,
                revision_nr: 1,
                created: Date.now(),
                modified: Date.now(),
            },
        };
        const fitsInlineKeys = [];
        await (0, utils_2.allowEventLoop)(data, async (val, key) => {
            const fitsInline = (0, utils_1.valueFitsInline)(val, options);
            if (fitsInline) {
                fitsInlineKeys.push(key);
            }
        });
        if (parentPath && !parentPath.equals(pathInfo) && this.hasNode(parentPath.path) && pathInfo.key !== null) {
            const mainNode = this.indexes[parentPath.path];
            if (mainNode.content.type === utils_1.nodeValueTypes.OBJECT || mainNode.content.type === utils_1.nodeValueTypes.ARRAY) {
                const previous_content = JSON.parse(JSON.stringify(mainNode.content));
                if (pathInfo.key in mainNode.content.value) {
                    delete mainNode.content.value[pathInfo.key];
                    mainNode.content.modified = Date.now();
                    mainNode.content.revision_nr = mainNode.content.revision_nr + 1;
                    this.emit("change", Object.assign(Object.assign({}, mainNode), { previous_content }));
                }
            }
        }
        if (this.hasNode(pathInfo.path)) {
            const mainNode = this.indexes[pathInfo.path];
            const previous_content = JSON.parse(JSON.stringify(mainNode.content));
            const childs = await this.getChildPathsBy(pathInfo.path);
            if (mainNode.content.type !== node.content.type) {
                type = "SET";
                await (0, utils_2.allowEventLoop)(childs, async (path) => {
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
                await (0, utils_2.allowEventLoop)(childs, async (path) => {
                    const pathInfo = new ivipbase_core_1.PathInfo(path);
                    if (pathInfo.key !== null && !(pathInfo.key in data)) {
                        await this.remove(path);
                    }
                });
            }
            await (0, utils_2.allowEventLoop)(data, async (val, key) => {
                const newPath = ivipbase_core_1.PathInfo.get([pathInfo.path, key]);
                if (fitsInlineKeys.includes(key)) {
                    if (this.hasNode(newPath.path)) {
                        await this.remove(newPath.path);
                    }
                    node.content.value[key] = (0, utils_1.getTypedChildValue)(val);
                }
                else if (key in node.content.value) {
                    delete node.content.value[key];
                }
            });
            node.content.created = mainNode.content.created;
            node.content.modified = Date.now();
            node.content.revision_nr = mainNode.content.revision_nr + 1;
            this.pushIndex(node);
            this.emit("change", Object.assign(Object.assign({}, node), { previous_content }));
        }
        else {
            await (0, utils_2.allowEventLoop)(fitsInlineKeys, async (key) => {
                const newPath = ivipbase_core_1.PathInfo.get([pathInfo.path, key]);
                if (this.hasNode(newPath.path)) {
                    await this.remove(newPath.path);
                }
                node.content.value[key] = (0, utils_1.getTypedChildValue)(data[key]);
            });
            this.pushIndex(node);
            this.emit("add", node);
        }
        await (0, utils_2.allowEventLoop)(data, async (val, key) => {
            const newPath = ivipbase_core_1.PathInfo.get([pathInfo.path, key]);
            if (!fitsInlineKeys.includes(key)) {
                const typeValue = (0, utils_1.getValueType)(val);
                if (typeValue === utils_1.nodeValueTypes.ARRAY || typeValue === utils_1.nodeValueTypes.OBJECT) {
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
                            await (0, utils_2.allowEventLoop)(childs, async (path) => {
                                await this.remove(path);
                            });
                        }
                        node.content.created = mainNode.content.created;
                        node.content.modified = Date.now();
                        node.content.revision_nr = mainNode.content.revision_nr + 1;
                        this.pushIndex(node);
                        this.emit("change", Object.assign(Object.assign({}, node), { previous_content }));
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
        var _a, _b;
        const queryFilters = (_a = query.filters) !== null && _a !== void 0 ? _a : [];
        const querySort = (_b = query.order) !== null && _b !== void 0 ? _b : [];
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
        const childs = (await this.getChildNodesBy(path)).sort((a, b) => compare({
            path: a.path,
            val: (0, utils_1.processReadNodeValue)(a.content).value,
        }, {
            path: b.path,
            val: (0, utils_1.processReadNodeValue)(b.content).value,
        }, 0));
    }
}
exports.NTree = NTree;
exports.default = NTree;
//# sourceMappingURL=NTree.js.map