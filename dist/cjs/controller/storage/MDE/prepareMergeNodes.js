"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ivipbase_core_1 = require("ivipbase-core");
const utils_1 = require("./utils");
/**
 * Responsável pela mesclagem de nodes soltos, apropriado para evitar conflitos de dados.
 *
 * @param {string} path - Caminho do node a ser processado.
 * @param {StorageNodeInfo[]} nodes - Lista de nodes a serem processados.
 * @param {StorageNodeInfo[]} comparison - Lista de nodes para comparação.
 *
 * @returns {{
 *   result: StorageNodeInfo[];
 *   added: StorageNodeInfo[];
 *   modified: StorageNodeInfo[];
 *   removed: StorageNodeInfo[];
 * }} Retorna uma lista de informações sobre os nodes de acordo com seu estado.
 */
async function prepareMergeNodes(path, nodes, comparison, options) {
    var _a, _b, _c;
    const revision = ivipbase_core_1.ID.generate();
    let result = [];
    let added = [];
    let modified = [];
    let removed = [];
    nodes = nodes.map((node) => {
        node.path = node.path.replace(/\/+$/g, "");
        return node;
    });
    comparison = comparison.map((node) => {
        node.path = node.path.replace(/\/+$/g, "");
        return node;
    });
    const modifyRevision = (node) => {
        if (node.previous_content) {
            node.content.created = node.previous_content.created;
            node.content.revision_nr = node.previous_content.revision_nr;
        }
        if (node.type === "SET" || node.type === "UPDATE") {
            node.content.modified = Date.now();
        }
        node.content.revision = revision;
        node.content.revision_nr = node.content.revision_nr + 1;
        return node;
    };
    // console.log(path, JSON.stringify(nodes, null, 4));
    // console.log(nodes.find(({ path }) => path === "root/__auth__/accounts/admin"));
    let editedNodes = [];
    let removeNodes = [];
    const findNode = (path) => {
        const p = path instanceof ivipbase_core_1.PathInfo ? path : ivipbase_core_1.PathInfo.get(path);
        const isRemove = editedNodes.findIndex((path) => p.isChildOf(path) || p.isDescendantOf(path)) >= 0 || removeNodes.findIndex((path) => p.equals(path) || p.isChildOf(path) || p.isDescendantOf(path)) >= 0;
        return isRemove ? undefined : nodes.find(({ path }) => p.equals(path));
    };
    for (let i = 0; i < comparison.length; i++) {
        const node = comparison[i];
        if (node.type !== "VERIFY" && (node.content.type === utils_1.nodeValueTypes.EMPTY || node.content.value === null || node.content.value === undefined)) {
            removeNodes.push(ivipbase_core_1.PathInfo.get(node.path));
            removeNodes = removeNodes.filter((p) => !(p.isChildOf(path) || p.isDescendantOf(path)));
            continue;
        }
        if (node.type === "SET") {
            editedNodes.push(ivipbase_core_1.PathInfo.get(node.path));
            editedNodes = editedNodes.filter((p) => !(p.isChildOf(path) || p.isDescendantOf(path)));
        }
        const currentNode = findNode(node.path);
        if (node.type === "VERIFY") {
            if (!currentNode) {
                result.push(node);
                added.push(node);
                try {
                    if (typeof (options === null || options === void 0 ? void 0 : options.onAdded) === "function") {
                        await options.onAdded(modifyRevision(node));
                    }
                }
                catch (e) { }
            }
            continue;
        }
        else {
            await new Promise((resolve) => setTimeout(resolve, 0));
            if (currentNode) {
                let n;
                if (node.type === "SET") {
                    n = Object.assign(Object.assign({}, node), { previous_content: currentNode.content });
                }
                else {
                    n = {
                        path: node.path,
                        type: "UPDATE",
                        content: {
                            type: node.content.type,
                            value: null,
                            created: node.content.created,
                            modified: Date.now(),
                            revision,
                            revision_nr: node.content.revision_nr + 1,
                        },
                        previous_content: currentNode.content,
                    };
                    if (n.content.type === utils_1.nodeValueTypes.OBJECT || n.content.type === utils_1.nodeValueTypes.ARRAY) {
                        n.content.value = Object.assign(Object.assign({}, (typeof currentNode.content.value === "object" ? (_a = currentNode.content.value) !== null && _a !== void 0 ? _a : {} : {})), (typeof node.content.value === "object" ? (_b = node.content.value) !== null && _b !== void 0 ? _b : {} : {}));
                    }
                    else {
                        n.content.value = node.content.value;
                    }
                }
                if (n) {
                    if (JSON.stringify(n.content.value) !== JSON.stringify((_c = n.previous_content) === null || _c === void 0 ? void 0 : _c.value)) {
                        modified.push(n);
                        try {
                            if (typeof (options === null || options === void 0 ? void 0 : options.onModified) === "function") {
                                await options.onModified(modifyRevision(n));
                            }
                        }
                        catch (e) { }
                    }
                    result.push(n);
                }
            }
            else {
                added.push(node);
                result.push(node);
                try {
                    if (typeof (options === null || options === void 0 ? void 0 : options.onAdded) === "function") {
                        await options.onAdded(modifyRevision(node));
                    }
                }
                catch (e) { }
            }
        }
    }
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const p = ivipbase_core_1.PathInfo.get(node.path);
        const isRemove = editedNodes.findIndex((path) => p.isChildOf(path) || p.isDescendantOf(path)) >= 0 || removeNodes.findIndex((path) => p.equals(path) || p.isChildOf(path) || p.isDescendantOf(path)) >= 0;
        if (isRemove) {
            await new Promise((resolve) => setTimeout(resolve, 0));
            removed.push(node);
            try {
                if (typeof (options === null || options === void 0 ? void 0 : options.onRemoved) === "function") {
                    await options.onRemoved(modifyRevision(node));
                }
            }
            catch (e) { }
        }
    }
    const sortNodes = (a, b) => {
        const aPath = ivipbase_core_1.PathInfo.get(a.path);
        const bPath = ivipbase_core_1.PathInfo.get(b.path);
        return aPath.isAncestorOf(bPath) || aPath.isParentOf(bPath) ? -1 : aPath.isDescendantOf(bPath) || aPath.isChildOf(bPath) ? 1 : 0;
    };
    result = result
        // .filter((n, i, l) => l.findIndex(({ path: p }) => PathInfo.get(p).equals(n.path)) === i)
        .map(modifyRevision)
        .sort(sortNodes);
    added = added
        // .filter((n, i, l) => l.findIndex(({ path: p }) => PathInfo.get(p).equals(n.path)) === i)
        .map(modifyRevision)
        .sort(sortNodes);
    modified = modified
        // .filter((n, i, l) => l.findIndex(({ path: p }) => PathInfo.get(p).equals(n.path)) === i)
        .map(modifyRevision)
        .sort(sortNodes);
    removed = removed
        // .filter((n, i, l) => l.findIndex(({ path: p }) => PathInfo.get(p).equals(n.path)) === i)
        .map(modifyRevision)
        .sort(sortNodes);
    // console.log("removed:", JSON.stringify(removed, null, 4));
    // console.log("RESULT:", path, JSON.stringify(result, null, 4));
    // console.log(path, JSON.stringify({ result, added, modified, removed }, null, 4));
    return { result, added, modified, removed };
}
exports.default = prepareMergeNodes;
//# sourceMappingURL=prepareMergeNodes.js.map