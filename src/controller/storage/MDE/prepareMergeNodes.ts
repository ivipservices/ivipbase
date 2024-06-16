import { ID, PathInfo } from "ivipbase-core";
import { NodesPending, StorageNode, StorageNodeInfo } from "./NodeInfo";
import { nodeValueTypes } from "./utils";

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
export default async function prepareMergeNodes(
	path: string,
	nodes: NodesPending[],
	comparison: NodesPending[],
	options?: Partial<{
		onAdded?: (node: StorageNodeInfo) => Promise<void> | void;
		onModified?: (node: StorageNodeInfo & { previous_content?: StorageNode }) => Promise<void> | void;
		onRemoved?: (node: StorageNodeInfo) => Promise<void> | void;
	}>,
): Promise<{
	result: StorageNodeInfo[];
	added: StorageNodeInfo[];
	modified: (StorageNodeInfo & { previous_content?: StorageNode })[];
	removed: StorageNodeInfo[];
}> {
	const revision = ID.generate();
	let result: NodesPending[] = [];
	let added: NodesPending[] = [];
	let modified: (NodesPending & { previous_content?: StorageNode })[] = [];
	let removed: NodesPending[] = [];

	nodes = nodes.map((node) => {
		node.path = node.path.replace(/\/+$/g, "");
		return node;
	});

	comparison = comparison.map((node) => {
		node.path = node.path.replace(/\/+$/g, "");
		return node;
	});

	const modifyRevision = (node: (typeof modified)[number]) => {
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

	const editedNodes = comparison
		.filter(({ type }) => type === "SET")
		.map(({ path }) => PathInfo.get(path))
		.reduce((acc: PathInfo[], path) => {
			acc.push(path);
			return acc.filter((p) => !(p.isChildOf(path) || p.isDescendantOf(path)));
		}, []);

	const removeNodes = comparison
		.filter((node) => {
			return node.content.type === nodeValueTypes.EMPTY || node.content.value === null || node.content.value === undefined;
		})
		.map(({ path }) => PathInfo.get(path))
		.reduce((acc: PathInfo[], path) => {
			acc.push(path);
			return acc.filter((p) => !(p.isChildOf(path) || p.isDescendantOf(path)));
		}, []);

	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];
		const p = PathInfo.get(node.path);
		const isRemove =
			editedNodes.findIndex((path) => p.isChildOf(path) || p.isDescendantOf(path)) >= 0 || removeNodes.findIndex((path) => p.equals(path) || p.isChildOf(path) || p.isDescendantOf(path)) >= 0;
		if (isRemove) {
			await new Promise((resolve) => setTimeout(resolve, 0));
			removed.push(node);
			nodes.splice(i, 1);
			try {
				if (typeof options?.onRemoved === "function") {
					await options.onRemoved(modifyRevision(node));
				}
			} catch (e) {}
		}
	}

	for (let i = 0; i < comparison.length; i++) {
		const node = comparison[i];

		if (node.content.type === nodeValueTypes.EMPTY || node.content.value === null || node.content.value === undefined) {
			continue;
		}

		if (node.type === "VERIFY") {
			if (nodes.findIndex(({ path }) => PathInfo.get(node.path).equals(path)) < 0) {
				result.push(node);
				added.push(node);
				try {
					if (typeof options?.onAdded === "function") {
						await options.onAdded(modifyRevision(node));
					}
				} catch (e) {}
			}
			continue;
		} else {
			await new Promise((resolve) => setTimeout(resolve, 0));
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
						try {
							if (typeof options?.onModified === "function") {
								await options.onModified(modifyRevision(n));
							}
						} catch (e) {}
					}
					result.push(n);
				}
			} else {
				added.push(node);
				result.push(node);
				try {
					if (typeof options?.onAdded === "function") {
						await options.onAdded(modifyRevision(node));
					}
				} catch (e) {}
			}
		}
	}

	const sortNodes = (a: NodesPending, b: NodesPending) => {
		const aPath = PathInfo.get(a.path);
		const bPath = PathInfo.get(b.path);
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
