"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ivipbase_core_1 = require("ivipbase-core");
const utils_1 = require("./utils");
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
function prepareMergeNodes(nodes, comparison = undefined) {
    let result = [];
    let added = [];
    let modified = [];
    let removed = [];
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
    comparison = comparison.sort(({ content: { modified: aM } }, { content: { modified: bM } }) => {
        return aM > bM ? -1 : aM < bM ? 1 : 0;
    });
    const setNodeBy = (node) => {
        const nodesIndex = nodes.findIndex(({ path }) => ivipbase_core_1.PathInfo.get(node.path).equals(path));
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
            if (modifiedIndex < 0) {
                modified.push(node);
            }
            else {
                modified[modifiedIndex] = node;
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
        .sort(({ content: { modified: aM } }, { content: { modified: bM } }) => {
        return aM > bM ? -1 : aM < bM ? 1 : 0;
    })
        .filter(({ path, content: { modified } }, i, l) => {
        const indexRecent = l.findIndex(({ path: p, content: { modified: m } }) => p === path && m > modified);
        return indexRecent < 0 || indexRecent === i;
    })
        .filter(({ content }) => content.type === utils_1.nodeValueTypes.EMPTY || content.value === null)
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
            switch (lastNode.content.type) {
                case utils_1.nodeValueTypes.OBJECT:
                case utils_1.nodeValueTypes.ARRAY: {
                    const { created, revision_nr } = lastNode.content.modified > node.content.modified ? node.content : lastNode.content;
                    const contents = lastNode.content.modified > node.content.modified ? [node.content, lastNode.content] : [lastNode.content, node.content];
                    const content_values = contents.map(({ value }) => value);
                    const new_content_value = Object.assign.apply(null, content_values);
                    const content = Object.assign.apply(null, [
                        ...contents,
                        {
                            value: Object.fromEntries(Object.entries(new_content_value).filter(([k, v]) => v !== null)),
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
            continue;
        }
        const parentNodeIsLast = pathInfo.isChildOf(lastNode.path);
        const parentNode = !parentNodeIsLast ? node : lastNode;
        const childNode = parentNodeIsLast ? node : lastNode;
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
                result[index] = parentNode;
                setNodeBy(result[index]);
                continue;
            }
        }
        setNodeBy(node);
    }
    result = result.map(({ path, content }) => ({ path, content }));
    added = added
        .sort(({ path: p1 }, { path: p2 }) => {
        return ivipbase_core_1.PathInfo.get(p1).isAncestorOf(p2) ? -1 : ivipbase_core_1.PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
    })
        .map(({ path, content }) => ({ path, content }));
    modified = modified
        .sort(({ path: p1 }, { path: p2 }) => {
        return ivipbase_core_1.PathInfo.get(p1).isAncestorOf(p2) ? -1 : ivipbase_core_1.PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
    })
        .map(({ path, content }) => ({ path, content }));
    removed = removed
        .sort(({ path: p1 }, { path: p2 }) => {
        return ivipbase_core_1.PathInfo.get(p1).isAncestorOf(p2) ? -1 : ivipbase_core_1.PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
    })
        .map(({ path, content }) => ({ path, content }));
    return { result, added, modified, removed };
}
exports.default = prepareMergeNodes;
//# sourceMappingURL=prepareMergeNodes.js.map