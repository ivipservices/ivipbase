import { PathInfo, Utils } from "ivipbase-core";
import { NodesPending, StorageNode, StorageNodeInfo } from "./NodeInfo";
import { nodeValueTypes, valueFitsInline } from "./utils";
import type MDE from ".";
import { removeNulls } from "../../../utils";

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
export default function prepareMergeNodes(
	this: MDE,
	nodes: NodesPending[],
	comparison: NodesPending[] | undefined = undefined,
): {
	result: StorageNodeInfo[];
	added: StorageNodeInfo[];
	modified: (StorageNodeInfo & { previous_content?: StorageNode })[];
	removed: StorageNodeInfo[];
} {
	let result: NodesPending[] = [];
	let added: NodesPending[] = [];
	let modified: (NodesPending & { previous_content?: StorageNode })[] = [];
	let removed: NodesPending[] = [];

	//console.log(nodes);

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

	// Ordena os nodes por data de modificação crescente, para que os nodes mais recentes sejam processados por último
	comparison = comparison.sort(({ content: { modified: aM } }, { content: { modified: bM } }) => {
		return aM > bM ? 1 : aM < bM ? -1 : 0;
	});

	const setNodeBy = (n: NodesPending): number => {
		const node: NodesPending = Utils.cloneObject(n);
		const itemMaisAntigo = nodes
			.filter((item) => item.path === "root/test")
			.reduce((anterior: NodesPending | null, atual: NodesPending) => {
				return anterior && anterior.content.modified < atual.content.modified ? anterior : atual;
			}, null);
		const nodesIndex = !itemMaisAntigo ? -1 : nodes.indexOf(itemMaisAntigo);

		if (nodesIndex < 0) {
			const addedIndex = added.findIndex(({ path }) => PathInfo.get(node.path).equals(path));
			if (addedIndex < 0) {
				added.push(node);
			} else {
				added[addedIndex] = node;
			}
		} else {
			const modifiedIndex = modified.findIndex(({ path }) => PathInfo.get(node.path).equals(path));
			const previous_content = nodes[nodesIndex].content;
			const dataChanges = Utils.compareValues(node.content.value, previous_content.value);
			if (dataChanges !== "identical") {
				if (modifiedIndex < 0) {
					modified.push({ ...node, previous_content });
				} else {
					modified[modifiedIndex] = { ...node, previous_content };
				}
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

	let pathsRemoved: string[] = comparison
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
		.filter(({ content }) => content.type === nodeValueTypes.EMPTY || content.value === null)
		// Retorna apenas o caminho dos nodes removidos
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

	const verifyNodes = (comparison as NodesPending[]).filter(({ type }) => {
		return type === "VERIFY";
	});

	for (let verify of verifyNodes) {
		if (nodes.findIndex(({ path }) => PathInfo.get(verify.path).equals(path)) < 0) {
			setNodeBy(verify);
		}
	}

	comparison = (comparison as NodesPending[]).filter(({ type }) => {
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
			if (node.type === "SET") {
				setNodeBy(node);
			} else {
				switch (lastNode.content.type) {
					case nodeValueTypes.OBJECT:
					case nodeValueTypes.ARRAY: {
						const { created, revision_nr } = lastNode.content.modified > node.content.modified ? node.content : lastNode.content;

						const contents = lastNode.content.modified > node.content.modified ? [node.content, lastNode.content] : [lastNode.content, node.content];
						const content_values: object[] = contents.map<any>(({ value }) => value).filter((v) => v !== null && v !== undefined);

						const new_content_value = Object.assign.apply(null, content_values as any);

						const content = Object.assign.apply(null, [
							...contents,
							{
								value: new_content_value,
								created,
								revision_nr: revision_nr + 1,
							} as StorageNode,
						] as any);

						setNodeBy(
							Object.assign(lastNode, {
								content,
							}),
						);

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
		const parentNode: NodesPending = Utils.cloneObject(!parentNodeIsLast ? node : lastNode);
		const childNode: NodesPending = Utils.cloneObject(parentNodeIsLast ? node : lastNode);
		const childKey = PathInfo.get(childNode.path).key;

		if (parentNode.content.type === nodeValueTypes.OBJECT && childKey !== null) {
			let parentNodeModified: boolean = false;

			if (
				[nodeValueTypes.STRING, nodeValueTypes.BIGINT, nodeValueTypes.BOOLEAN, nodeValueTypes.DATETIME, nodeValueTypes.NUMBER].includes(childNode.content.type as any) &&
				valueFitsInline(childNode.content.value, this.settings)
			) {
				(parentNode.content.value as any)[childKey] = childNode.content.value;
				parentNodeModified = true;
			} else if (childNode.content.type === nodeValueTypes.EMPTY) {
				(parentNode.content.value as any)[childKey] = null;
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
		content.value = removeNulls(content.value);
		return { path, content };
	});

	added = added
		.sort(({ path: p1 }, { path: p2 }) => {
			return PathInfo.get(p1).isAncestorOf(p2) ? -1 : PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
		})
		.map(({ path, content }) => {
			content.value = removeNulls(content.value);
			return { path, content };
		});

	modified = modified
		.sort(({ path: p1 }, { path: p2 }) => {
			return PathInfo.get(p1).isAncestorOf(p2) ? -1 : PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
		})
		.map(({ path, content, previous_content }) => {
			content.value = removeNulls(content.value);
			if (previous_content) {
				previous_content.value = removeNulls(previous_content.value);
			}
			return { path, content, previous_content };
		});

	removed = removed
		.sort(({ path: p1 }, { path: p2 }) => {
			return PathInfo.get(p1).isAncestorOf(p2) ? -1 : PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
		})
		.map(({ path, content }) => {
			content.value = removeNulls(content.value);
			return { path, content };
		});

	// console.log("added: ", JSON.stringify(added, null, 4));
	// console.log("modified: ", JSON.stringify(modified, null, 4));
	// console.log("removed: ", JSON.stringify(removed, null, 4));
	// console.log("result: ", JSON.stringify(result, null, 4));

	return { result, added, modified, removed } as any;
}
