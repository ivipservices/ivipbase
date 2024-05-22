"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._prepareMergeNodes = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const utils_1 = require("./utils");
const utils_2 = require("../../../utils");
const _prepareMergeNodes = function (path, nodes, comparison) {
    var _a, _b, _c;
    const revision = ivipbase_core_1.ID.generate();
    let result = [];
    let added = [];
    let modified = [];
    let removed = [];
    // console.log(path, JSON.stringify(comparison, null, 4));
    for (let node of comparison) {
        const pathInfo = ivipbase_core_1.PathInfo.get(node.path);
        if (node.type === "VERIFY") {
            if (nodes.findIndex(({ path }) => ivipbase_core_1.PathInfo.get(node.path).equals(path)) < 0) {
                result.push(node);
                added.push(node);
            }
            continue;
        }
        else {
            if (node.type === "SET" || node.content.type === utils_1.nodeValueTypes.EMPTY || node.content.value === null || node.content.value === undefined) {
                for (let n of nodes) {
                    if (ivipbase_core_1.PathInfo.get(n.path).isChildOf(path) || ivipbase_core_1.PathInfo.get(n.path).isDescendantOf(path)) {
                        removed.push(n);
                    }
                }
                nodes = nodes.filter((n) => !(ivipbase_core_1.PathInfo.get(n.path).isChildOf(path) || ivipbase_core_1.PathInfo.get(n.path).isDescendantOf(path)));
            }
            if (node.content.type === utils_1.nodeValueTypes.EMPTY || node.content.value === null || node.content.value === undefined) {
                removed.push(node);
                nodes = nodes.filter(({ path }) => !ivipbase_core_1.PathInfo.get(path).equals(node.path));
                continue;
            }
            let include = true;
            if ([utils_1.nodeValueTypes.OBJECT, utils_1.nodeValueTypes.ARRAY].includes(node.content.type)) {
                include = !(Object.keys((_a = node.content.value) !== null && _a !== void 0 ? _a : {}).length >= 0 && comparison.findIndex(({ path }) => ivipbase_core_1.PathInfo.get(path).isChildOf(node.path)) > 0);
            }
            else {
                include = (0, utils_1.valueFitsInline)(node.content.value, this.settings);
            }
            const parentNode = nodes.find(({ path }) => ivipbase_core_1.PathInfo.get(path).isParentOf(node.path));
            const currentNode = nodes.find(({ path }) => ivipbase_core_1.PathInfo.get(path).equals(node.path));
            if (include && parentNode) {
                const key = ivipbase_core_1.PathInfo.get(node.path).key;
                const currentValue = parentNode.content.value[key];
                const newValue = node.content.type === utils_1.nodeValueTypes.ARRAY && !Array.isArray(node.content.value) ? [] : node.content.value;
                let n;
                if ([utils_1.nodeValueTypes.OBJECT, utils_1.nodeValueTypes.ARRAY].includes(parentNode.content.type)) {
                    if (currentValue !== newValue) {
                        n = Object.assign(Object.assign({}, parentNode), { content: Object.assign(Object.assign({}, parentNode.content), { value: Object.assign(Object.assign({}, ((_b = parentNode.content.value) !== null && _b !== void 0 ? _b : {})), { [key]: newValue }), modified: Date.now(), revision, revision_nr: parentNode.content.revision_nr + 1 }), previous_content: parentNode.content });
                    }
                }
                else {
                    n = {
                        path: parentNode.path,
                        type: "UPDATE",
                        content: Object.assign(Object.assign({}, parentNode.content), { type: utils_1.nodeValueTypes.OBJECT, value: { [key]: newValue }, modified: Date.now(), revision, revision_nr: parentNode.content.revision_nr + 1 }),
                        previous_content: parentNode.content,
                    };
                }
                if (n) {
                    modified.push(n);
                    result.push(n);
                    if (currentNode) {
                        removed.push(currentNode);
                    }
                }
            }
            else if (currentNode) {
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
                        n.content.value = Object.assign(Object.assign({}, (typeof currentNode.content.value === "object" ? (_c = currentNode.content.value) !== null && _c !== void 0 ? _c : {} : {})), n.content.value);
                    }
                    else {
                        n.content.value = n.content.value;
                    }
                }
                if (n) {
                    modified.push(n);
                    result.push(n);
                }
            }
            else {
                added.push(node);
                result.push(node);
            }
        }
    }
    result = result.filter((n, i, l) => l.findIndex(({ path: p }) => ivipbase_core_1.PathInfo.get(p).equals(n.path)) === i);
    added = added.filter((n, i, l) => l.findIndex(({ path: p }) => ivipbase_core_1.PathInfo.get(p).equals(n.path)) === i);
    modified = modified.filter((n, i, l) => l.findIndex(({ path: p }) => ivipbase_core_1.PathInfo.get(p).equals(n.path)) === i);
    removed = removed.filter((n, i, l) => l.findIndex(({ path: p }) => ivipbase_core_1.PathInfo.get(p).equals(n.path)) === i);
    // console.log("RESULT:", path, JSON.stringify(result, null, 4));
    // console.log(path, JSON.stringify({ result, added, modified, removed }, null, 4));
    return { result, added, modified, removed };
};
exports._prepareMergeNodes = _prepareMergeNodes;
/**
 * Responsável pela mesclagem de nodes soltos, apropriado para evitar conflitos de dados.
 *
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
function prepareMergeNodes(path, nodes, comparison = undefined) {
    let result = [];
    let added = [];
    let modified = [];
    let removed = [];
    //console.log(nodes);
    if (!comparison) {
        comparison = nodes;
        nodes = nodes
            .sort(({ content: { modified: aM } }, { content: { modified: bM } }) => {
            return aM > bM ? 1 : aM < bM ? -1 : 0;
        })
            .filter(({ path }, i, list) => {
            return list.findIndex(({ path: p }) => ivipbase_core_1.PathInfo.get(p).equals(path)) === i;
        });
    }
    if (comparison.length === 0) {
        return {
            result: nodes,
            added,
            modified,
            removed,
        };
    }
    // Ordena os nodes por data de modificação crescente, para que os nodes mais recentes sejam processados por último
    comparison = comparison.sort(({ content: { modified: aM } }, { content: { modified: bM } }) => {
        return aM > bM ? 1 : aM < bM ? -1 : 0;
    });
    const setNodeBy = (n) => {
        const node = ivipbase_core_1.Utils.cloneObject(n);
        const itemMaisAntigo = nodes
            .filter((item) => item.path === "root/test")
            .reduce((anterior, atual) => {
            return anterior && anterior.content.modified < atual.content.modified ? anterior : atual;
        }, null);
        const nodesIndex = !itemMaisAntigo ? -1 : nodes.indexOf(itemMaisAntigo);
        if (nodesIndex < 0) {
            const addedIndex = added.findIndex(({ path }) => ivipbase_core_1.PathInfo.get(node.path).equals(path));
            if (addedIndex < 0) {
                added.push(node);
            }
            else {
                added[addedIndex] = node;
            }
        }
        else {
            const modifiedIndex = modified.findIndex(({ path }) => ivipbase_core_1.PathInfo.get(node.path).equals(path));
            const previous_content = nodes[nodesIndex].content;
            const dataChanges = ivipbase_core_1.Utils.compareValues(node.content.value, previous_content.value);
            if (dataChanges !== "identical") {
                if (modifiedIndex < 0) {
                    modified.push(Object.assign(Object.assign({}, node), { previous_content }));
                }
                else {
                    modified[modifiedIndex] = Object.assign(Object.assign({}, node), { previous_content });
                }
            }
        }
        const index = result.findIndex(({ path }) => ivipbase_core_1.PathInfo.get(node.path).equals(path));
        if (index < 0) {
            result.push(node);
            result = result.sort(({ path: p1 }, { path: p2 }) => {
                return ivipbase_core_1.PathInfo.get(p1).isAncestorOf(p2) ? -1 : ivipbase_core_1.PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
            });
        }
        result[index] = node;
        return result.findIndex(({ path }) => ivipbase_core_1.PathInfo.get(node.path).equals(path));
    };
    let pathsRemoved = comparison
        // Ordena os nodes por data de modificação decrescente, para que os nodes mais recentes sejam processados por último
        .sort(({ content: { modified: aM } }, { content: { modified: bM } }) => {
        return aM > bM ? -1 : aM < bM ? 1 : 0;
    })
        // Filtra os nodes que foram removidos
        .filter(({ path, content: { modified } }, i, l) => {
        // Verifica se o node foi removido mais de uma vez
        const indexRecent = l.findIndex(({ path: p, content: { modified: m } }) => p === path && m > modified);
        // Verifica se o node foi removido apenas uma vez
        return indexRecent < 0 || indexRecent === i;
    })
        // Retorna apenas o caminho dos nodes removidos
        .filter(({ content }) => content.type === utils_1.nodeValueTypes.EMPTY || content.value === null)
        // Retorna apenas o caminho dos nodes removidos
        .map(({ path }) => path);
    pathsRemoved = nodes
        .filter(({ path }) => {
        var _a;
        const { content } = (_a = comparison === null || comparison === void 0 ? void 0 : comparison.find(({ path: p }) => ivipbase_core_1.PathInfo.get(p).isParentOf(path))) !== null && _a !== void 0 ? _a : {};
        const key = ivipbase_core_1.PathInfo.get(path).key;
        return content ? (typeof key === "number" ? content.type !== utils_1.nodeValueTypes.ARRAY : content.type !== utils_1.nodeValueTypes.OBJECT) : false;
    })
        .map(({ path }) => path)
        .concat(pathsRemoved)
        .filter((path, i, l) => l.indexOf(path) === i)
        .filter((path, i, l) => l.findIndex((p) => ivipbase_core_1.PathInfo.get(p).isAncestorOf(path)) < 0);
    removed = nodes.filter(({ path }) => {
        return pathsRemoved.findIndex((p) => ivipbase_core_1.PathInfo.get(p).equals(path) || ivipbase_core_1.PathInfo.get(p).isAncestorOf(path)) >= 0;
    });
    comparison = comparison
        .filter(({ path }) => {
        return pathsRemoved.findIndex((p) => ivipbase_core_1.PathInfo.get(p).equals(path) || ivipbase_core_1.PathInfo.get(p).isAncestorOf(path)) < 0;
    })
        .sort(({ path: p1 }, { path: p2 }) => {
        return ivipbase_core_1.PathInfo.get(p1).isAncestorOf(p2) ? -1 : ivipbase_core_1.PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
    });
    result = nodes
        .filter(({ path }) => {
        return pathsRemoved.findIndex((p) => ivipbase_core_1.PathInfo.get(p).equals(path) || ivipbase_core_1.PathInfo.get(p).isAncestorOf(path)) < 0;
    })
        .sort(({ path: p1 }, { path: p2 }) => {
        return ivipbase_core_1.PathInfo.get(p1).isAncestorOf(p2) ? -1 : ivipbase_core_1.PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
    });
    const verifyNodes = comparison.filter(({ type }) => {
        return type === "VERIFY";
    });
    for (let verify of verifyNodes) {
        if (nodes.findIndex(({ path }) => ivipbase_core_1.PathInfo.get(verify.path).equals(path)) < 0) {
            setNodeBy(verify);
        }
    }
    comparison = comparison.filter(({ type }) => {
        return type !== "VERIFY";
    });
    for (let node of comparison) {
        const pathInfo = ivipbase_core_1.PathInfo.get(node.path);
        let index = result.findIndex(({ path }) => pathInfo.equals(path));
        index = index < 0 ? result.findIndex(({ path }) => pathInfo.isParentOf(path) || pathInfo.isChildOf(path)) : index;
        if (index < 0) {
            setNodeBy(node);
            continue;
        }
        const lastNode = result[index];
        if (pathInfo.equals(lastNode.path) && lastNode.content.type !== node.content.type) {
            setNodeBy(node);
            continue;
        }
        if (pathInfo.equals(lastNode.path)) {
            if (node.type === "SET") {
                setNodeBy(node);
            }
            else {
                switch (lastNode.content.type) {
                    case utils_1.nodeValueTypes.OBJECT:
                    case utils_1.nodeValueTypes.ARRAY: {
                        const { created, revision_nr } = lastNode.content.modified > node.content.modified ? node.content : lastNode.content;
                        const contents = lastNode.content.modified > node.content.modified ? [node.content, lastNode.content] : [lastNode.content, node.content];
                        const content_values = contents.map(({ value }) => value).filter((v) => v !== null && v !== undefined);
                        const new_content_value = Object.assign.apply(null, content_values);
                        const content = Object.assign.apply(null, [
                            ...contents,
                            {
                                value: new_content_value,
                                created,
                                revision_nr: revision_nr + 1,
                            },
                        ]);
                        setNodeBy(Object.assign(lastNode, {
                            content,
                        }));
                        break;
                    }
                    default: {
                        if (lastNode.content.modified < node.content.modified) {
                            setNodeBy(node);
                        }
                    }
                }
            }
            continue;
        }
        const parentNodeIsLast = pathInfo.isChildOf(lastNode.path);
        const parentNode = ivipbase_core_1.Utils.cloneObject(!parentNodeIsLast ? node : lastNode);
        const childNode = ivipbase_core_1.Utils.cloneObject(parentNodeIsLast ? node : lastNode);
        const childKey = ivipbase_core_1.PathInfo.get(childNode.path).key;
        if (parentNode.content.type === utils_1.nodeValueTypes.OBJECT && childKey !== null) {
            let parentNodeModified = false;
            if ([utils_1.nodeValueTypes.STRING, utils_1.nodeValueTypes.BIGINT, utils_1.nodeValueTypes.BOOLEAN, utils_1.nodeValueTypes.DATETIME, utils_1.nodeValueTypes.NUMBER].includes(childNode.content.type) &&
                (0, utils_1.valueFitsInline)(childNode.content.value, this.settings)) {
                parentNode.content.value[childKey] = childNode.content.value;
                parentNodeModified = true;
            }
            else if (childNode.content.type === utils_1.nodeValueTypes.EMPTY) {
                parentNode.content.value[childKey] = null;
                parentNodeModified = true;
            }
            if (parentNodeModified) {
                setNodeBy(parentNode);
                continue;
            }
        }
        setNodeBy(node);
    }
    result = result.map(({ path, content }) => {
        content.value = (0, utils_2.removeNulls)(content.value);
        return { path, content };
    });
    added = added
        .sort(({ path: p1 }, { path: p2 }) => {
        return ivipbase_core_1.PathInfo.get(p1).isAncestorOf(p2) ? -1 : ivipbase_core_1.PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
    })
        .map(({ path, content }) => {
        content.value = (0, utils_2.removeNulls)(content.value);
        return { path, content };
    });
    modified = modified
        .sort(({ path: p1 }, { path: p2 }) => {
        return ivipbase_core_1.PathInfo.get(p1).isAncestorOf(p2) ? -1 : ivipbase_core_1.PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
    })
        .map(({ path, content, previous_content }) => {
        content.value = (0, utils_2.removeNulls)(content.value);
        if (previous_content) {
            previous_content.value = (0, utils_2.removeNulls)(previous_content.value);
        }
        return { path, content, previous_content };
    });
    removed = removed
        .sort(({ path: p1 }, { path: p2 }) => {
        return ivipbase_core_1.PathInfo.get(p1).isAncestorOf(p2) ? -1 : ivipbase_core_1.PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
    })
        .map(({ path, content }) => {
        content.value = (0, utils_2.removeNulls)(content.value);
        return { path, content };
    });
    // console.log("added: ", JSON.stringify(added, null, 4));
    // console.log("modified: ", JSON.stringify(modified, null, 4));
    // console.log("removed: ", JSON.stringify(removed, null, 4));
    // console.log("result: ", JSON.stringify(result, null, 4));
    return { result, added, modified, removed };
}
exports.default = prepareMergeNodes;
//# sourceMappingURL=prepareMergeNodes.js.map