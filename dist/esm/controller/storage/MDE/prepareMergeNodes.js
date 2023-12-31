import { PathInfo } from "ivipbase-core";
import { nodeValueTypes, valueFitsInline } from "./utils.js";
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
export default function prepareMergeNodes(nodes, comparison = undefined) {
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
            return list.findIndex(({ path: p }) => PathInfo.get(p).equals(path)) === i;
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
        const nodesIndex = nodes.findIndex(({ path }) => PathInfo.get(node.path).equals(path));
        if (nodesIndex < 0) {
            const addedIndex = added.findIndex(({ path }) => PathInfo.get(node.path).equals(path));
            if (addedIndex < 0) {
                added.push(node);
            }
            else {
                added[addedIndex] = node;
            }
        }
        else {
            const modifiedIndex = modified.findIndex(({ path }) => PathInfo.get(node.path).equals(path));
            if (modifiedIndex < 0) {
                modified.push(node);
            }
            else {
                modified[modifiedIndex] = node;
            }
        }
        const index = result.findIndex(({ path }) => PathInfo.get(node.path).equals(path));
        if (index < 0) {
            result.push(node);
            result = result.sort(({ path: p1 }, { path: p2 }) => {
                return PathInfo.get(p1).isAncestorOf(p2) ? -1 : PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
            });
        }
        result[index] = node;
        return result.findIndex(({ path }) => PathInfo.get(node.path).equals(path));
    };
    let pathsRemoved = comparison
        .sort(({ content: { modified: aM } }, { content: { modified: bM } }) => {
        return aM > bM ? -1 : aM < bM ? 1 : 0;
    })
        .filter(({ path, content: { modified } }, i, l) => {
        const indexRecent = l.findIndex(({ path: p, content: { modified: m } }) => p === path && m > modified);
        return indexRecent < 0 || indexRecent === i;
    })
        .filter(({ content }) => content.type === nodeValueTypes.EMPTY || content.value === null)
        .map(({ path }) => path);
    pathsRemoved = nodes
        .filter(({ path }) => {
        const { content } = comparison?.find(({ path: p }) => PathInfo.get(p).isParentOf(path)) ?? {};
        const key = PathInfo.get(path).key;
        return content ? (typeof key === "number" ? content.type !== nodeValueTypes.ARRAY : content.type !== nodeValueTypes.OBJECT) : false;
    })
        .map(({ path }) => path)
        .concat(pathsRemoved)
        .filter((path, i, l) => l.indexOf(path) === i)
        .filter((path, i, l) => l.findIndex((p) => PathInfo.get(p).isAncestorOf(path)) < 0);
    removed = nodes.filter(({ path }) => {
        return pathsRemoved.findIndex((p) => PathInfo.get(p).equals(path) || PathInfo.get(p).isAncestorOf(path)) >= 0;
    });
    comparison = comparison
        .filter(({ path }) => {
        return pathsRemoved.findIndex((p) => PathInfo.get(p).equals(path) || PathInfo.get(p).isAncestorOf(path)) < 0;
    })
        .sort(({ path: p1 }, { path: p2 }) => {
        return PathInfo.get(p1).isAncestorOf(p2) ? -1 : PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
    });
    result = nodes
        .filter(({ path }) => {
        return pathsRemoved.findIndex((p) => PathInfo.get(p).equals(path) || PathInfo.get(p).isAncestorOf(path)) < 0;
    })
        .sort(({ path: p1 }, { path: p2 }) => {
        return PathInfo.get(p1).isAncestorOf(p2) ? -1 : PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
    });
    const verifyNodes = comparison.filter(({ type }) => {
        return type === "VERIFY";
    });
    for (let verify of verifyNodes) {
        if (nodes.findIndex(({ path }) => PathInfo.get(verify.path).equals(path)) < 0) {
            setNodeBy(verify);
        }
    }
    comparison = comparison.filter(({ type }) => {
        return type !== "VERIFY";
    });
    for (let node of comparison) {
        const pathInfo = PathInfo.get(node.path);
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
                case nodeValueTypes.OBJECT:
                case nodeValueTypes.ARRAY: {
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
        const childKey = PathInfo.get(childNode.path).key;
        if (parentNode.content.type === nodeValueTypes.OBJECT && childKey !== null) {
            let parentNodeModified = false;
            if ([nodeValueTypes.STRING, nodeValueTypes.BIGINT, nodeValueTypes.BOOLEAN, nodeValueTypes.DATETIME, nodeValueTypes.NUMBER].includes(childNode.content.type) &&
                valueFitsInline(childNode.content.value, this.settings)) {
                parentNode.content.value[childKey] = childNode.content.value;
                parentNodeModified = true;
            }
            else if (childNode.content.type === nodeValueTypes.EMPTY) {
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
        return PathInfo.get(p1).isAncestorOf(p2) ? -1 : PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
    })
        .map(({ path, content }) => ({ path, content }));
    modified = modified
        .sort(({ path: p1 }, { path: p2 }) => {
        return PathInfo.get(p1).isAncestorOf(p2) ? -1 : PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
    })
        .map(({ path, content }) => ({ path, content }));
    removed = removed
        .sort(({ path: p1 }, { path: p2 }) => {
        return PathInfo.get(p1).isAncestorOf(p2) ? -1 : PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
    })
        .map(({ path, content }) => ({ path, content }));
    return { result, added, modified, removed };
}
//# sourceMappingURL=prepareMergeNodes.js.map