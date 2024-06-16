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
async function prepareMergeNodes(path, nodes, comparison) {
    var _a, _b, _c, _d;
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
    // console.log(path, JSON.stringify(nodes, null, 4));
    // console.log(nodes.find(({ path }) => path === "root/__auth__/accounts/admin"));
    for (let node of nodes) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        let pathInfo = ivipbase_core_1.PathInfo.get(node.path);
        let response = comparison.find(({ path }) => ivipbase_core_1.PathInfo.get(path).equals(node.path));
        if (response) {
            continue;
        }
        while (pathInfo && pathInfo.path.trim() !== "") {
            response = comparison.find(({ path }) => ivipbase_core_1.PathInfo.get(path).equals(pathInfo.path));
            if (response && response.type === "SET") {
                removed.push(node);
                nodes = nodes.filter((n) => !ivipbase_core_1.PathInfo.get(n.path).equals(node.path));
                break;
            }
            pathInfo = ivipbase_core_1.PathInfo.get(pathInfo.parentPath);
        }
    }
    for (let node of comparison) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        const pathInfo = ivipbase_core_1.PathInfo.get(node.path);
        if (node.content.type === utils_1.nodeValueTypes.EMPTY || node.content.value === null || node.content.value === undefined) {
            const iten = (_a = nodes.find(({ path }) => ivipbase_core_1.PathInfo.get(path).equals(node.path))) !== null && _a !== void 0 ? _a : node;
            removed.push(iten);
            nodes = nodes.filter(({ path }) => !ivipbase_core_1.PathInfo.get(path).equals(iten.path));
            continue;
        }
        if (node.type === "VERIFY") {
            if (nodes.findIndex(({ path }) => ivipbase_core_1.PathInfo.get(node.path).equals(path)) < 0) {
                result.push(node);
                added.push(node);
            }
            continue;
        }
        else {
            const currentNode = nodes.find(({ path }) => ivipbase_core_1.PathInfo.get(path).equals(node.path));
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
                        n.content.value = Object.assign(Object.assign({}, (typeof currentNode.content.value === "object" ? (_b = currentNode.content.value) !== null && _b !== void 0 ? _b : {} : {})), (typeof node.content.value === "object" ? (_c = node.content.value) !== null && _c !== void 0 ? _c : {} : {}));
                    }
                    else {
                        n.content.value = node.content.value;
                    }
                }
                if (n) {
                    if (JSON.stringify(n.content.value) !== JSON.stringify((_d = n.previous_content) === null || _d === void 0 ? void 0 : _d.value)) {
                        modified.push(n);
                    }
                    result.push(n);
                }
            }
            else {
                added.push(node);
                result.push(node);
            }
        }
    }
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