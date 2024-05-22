import { ID, PathInfo, Utils } from "ivipbase-core";
import { NodesPending, StorageNode, StorageNodeInfo } from "./NodeInfo";
import { nodeValueTypes, valueFitsInline } from "./utils";
import type MDE from ".";
import { removeNulls } from "../../../utils";

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
export default function prepareMergeNodes(
	this: MDE,
	path: string,
	nodes: NodesPending[],
	comparison: NodesPending[],
): {
	result: StorageNodeInfo[];
	added: StorageNodeInfo[];
	modified: (StorageNodeInfo & { previous_content?: StorageNode })[];
	removed: StorageNodeInfo[];
} {
	const revision = ID.generate();
	let result: NodesPending[] = [];
	let added: NodesPending[] = [];
	let modified: (NodesPending & { previous_content?: StorageNode })[] = [];
	let removed: NodesPending[] = [];

	// console.log(path, JSON.stringify(nodes, null, 4));
	// console.log(nodes.find(({ path }) => path === "root/__auth__/accounts/admin"));

	for (let node of nodes) {
		let pathInfo = PathInfo.get(node.path);
		let response = comparison.find(({ path }) => PathInfo.get(path).equals(node.path));

		if (response) {
			continue;
		}

		while (pathInfo && pathInfo.path.trim() !== "") {
			response = comparison.find(({ path }) => PathInfo.get(path).equals(pathInfo.path));

			if (response && response.type === "SET") {
				removed.push(node);
				nodes = nodes.filter((n) => !PathInfo.get(n.path).equals(node.path));
				break;
			}

			pathInfo = PathInfo.get(pathInfo.parentPath as any);
		}
	}

	for (let node of comparison) {
		const pathInfo = PathInfo.get(node.path);

		if (node.content.type === nodeValueTypes.EMPTY || node.content.value === null || node.content.value === undefined) {
			const iten = nodes.find(({ path }) => PathInfo.get(path).equals(node.path)) ?? node;
			removed.push(iten);
			nodes = nodes.filter(({ path }) => !PathInfo.get(path).equals(iten.path));
			continue;
		}

		if (node.type === "VERIFY") {
			if (nodes.findIndex(({ path }) => PathInfo.get(node.path).equals(path)) < 0) {
				result.push(node);
				added.push(node);
			}
			continue;
		} else {
			const currentNode = nodes.find(({ path }) => PathInfo.get(path).equals(node.path));

			if (currentNode) {
				let n: (typeof modified)[number] | undefined;

				if (node.type === "SET") {
					n = { ...node, previous_content: currentNode.content };
				} else {
					n = {
						path: node.path,
						type: "UPDATE",
						content: {
							type: node.content.type as any,
							value: null,
							created: node.content.created,
							modified: Date.now(),
							revision,
							revision_nr: node.content.revision_nr + 1,
						},
						previous_content: currentNode.content,
					};

					if (n.content.type === nodeValueTypes.OBJECT || n.content.type === nodeValueTypes.ARRAY) {
						n.content.value = {
							...(typeof currentNode.content.value === "object" ? currentNode.content.value ?? {} : {}),
							...(typeof node.content.value === "object" ? node.content.value ?? {} : {}),
						};
					} else {
						n.content.value = node.content.value as any;
					}
				}

				if (n) {
					if (JSON.stringify(n.content.value) !== JSON.stringify(n.previous_content?.value)) {
						modified.push(n);
					}
					result.push(n);
				}
			} else {
				added.push(node);
				result.push(node);
			}
		}
	}

	result = result.filter((n, i, l) => l.findIndex(({ path: p }) => PathInfo.get(p).equals(n.path)) === i);
	added = added.filter((n, i, l) => l.findIndex(({ path: p }) => PathInfo.get(p).equals(n.path)) === i);
	modified = modified.filter((n, i, l) => l.findIndex(({ path: p }) => PathInfo.get(p).equals(n.path)) === i);
	removed = removed.filter((n, i, l) => l.findIndex(({ path: p }) => PathInfo.get(p).equals(n.path)) === i);

	// console.log("removed:", JSON.stringify(removed, null, 4));

	// console.log("RESULT:", path, JSON.stringify(result, null, 4));

	// console.log(path, JSON.stringify({ result, added, modified, removed }, null, 4));

	return { result, added, modified, removed };
}
