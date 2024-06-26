import { ID, PathInfo } from "ivipbase-core";
import { NodesPending, StorageNode, StorageNodeInfo } from "./NodeInfo";
import { VALUE_TYPES, getTypedChildValue, getValueType, nodeValueTypes, valueFitsInline } from "./utils";
import type MDE from ".";
import { joinObjects } from "../../../utils";
import { kStringMaxLength } from "buffer";

type ModifiedNode = NodesPending & { previous_content?: StorageNode };

interface Controllers {
	appendEditedNode(path: string | PathInfo): void;
	appendRemoveNode(path: string | PathInfo): void;
	findNode(path?: string | PathInfo | null): NodesPending | undefined;
	pushAddedNode(node: NodesPending): Promise<void>;
	pushRemovedNode(node: NodesPending): Promise<void>;
	pushModifiedNode(node: ModifiedNode, isModified?: boolean): Promise<void>;
	resolveNodesConflict(nodes: NodesPending[]): void;
}

const modifyRevision = (revision?: string) => {
	revision = revision ?? ID.generate();

	return (node: ModifiedNode) => {
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
};

const extactNodes = async (
	type: Exclude<NodesPending["type"], "VERIFY" | undefined>,
	obj: any,
	path: (string | number)[] = [],
	controllers: Controllers,
	options: {
		assert_revision?: string;
		maxInlineValueSize: number;
	},
	parentValue: NodesPending | undefined = undefined,
) => {
	if (Math.random() > 0.4) await new Promise((resolve) => setTimeout(resolve, 0));
	const revision = options?.assert_revision ?? ID.generate();
	const pathInfo = PathInfo.get(path);

	const fitsInline = valueFitsInline(obj, options);

	if (parentValue) {
		parentValue.type = parentValue.type === "VERIFY" ? "UPDATE" : type;

		if (parentValue.content.value === null) {
			(parentValue.content as any).value = (parentValue.content.type as any) === nodeValueTypes.ARRAY ? [] : {};
		}

		(parentValue.content as any).value[pathInfo.key as any] = fitsInline ? getTypedChildValue(obj) : null;
	}

	const currentNode: NodesPending = {
		path: pathInfo.path,
		type: type,
		content: {
			type: getValueType(obj) as any,
			value: typeof obj === "object" ? (Array.isArray(obj) ? [] : {}) : obj,
			revision,
			revision_nr: 1,
			created: Date.now(),
			modified: Date.now(),
		},
	};

	for (let k in obj) {
		const fitsInline = valueFitsInline(obj[k], options);

		if (currentNode && fitsInline) {
			if (currentNode.type === "VERIFY") {
				currentNode.type = "UPDATE";
			}

			if (currentNode.content.value === null) {
				(currentNode.content as any).value = {};
			}

			(currentNode.content as any).value[k] = getTypedChildValue(obj[k]);
		}

		if (["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(obj[k])) && !fitsInline) {
			await extactNodes(type, obj[k], [...path, k], controllers, options, currentNode);
		} else {
			const value = fitsInline ? null : typeof obj[k] === "object" ? (Array.isArray(obj[k]) ? [] : {}) : obj[k];

			controllers.resolveNodesConflict([
				{
					path: PathInfo.get([...path, k]).path,
					type: type,
					content: {
						type: getValueType(value) as any,
						value,
						revision,
						revision_nr: 1,
						created: Date.now(),
						modified: Date.now(),
					},
				},
			]);
		}
	}

	controllers.resolveNodesConflict([currentNode]);
};

export default async function destructureData(
	type: Exclude<NodesPending["type"], "VERIFY" | undefined>,
	path: string,
	data: any,
	options: {
		assert_revision?: string;
		include_checks?: boolean;
		previous_result?: NodesPending[];
		maxInlineValueSize: number;
	} = {
		maxInlineValueSize: 200,
	},
	byNodes: NodesPending[],
): Promise<{
	result: NodesPending[];
	added: NodesPending[];
	modified: ModifiedNode[];
	removed: NodesPending[];
}> {
	let result: NodesPending[] = options?.previous_result ?? [];
	let pathInfo = PathInfo.get(path);
	const revision = options?.assert_revision ?? ID.generate();
	options.assert_revision = revision;
	options.include_checks = typeof options.include_checks === "boolean" ? options.include_checks : true;

	let added: NodesPending[] = [];
	let modified: ModifiedNode[] = [];
	let removed: NodesPending[] = [];

	byNodes = byNodes.map((node) => {
		node.path = node.path.replace(/\/+$/g, "");
		return node;
	});

	if (["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(data)) !== true) {
		type = "UPDATE";
		data = {
			[pathInfo.key as any]: data,
		};
		pathInfo = pathInfo.parent as any;
	}

	let editedNodes: PathInfo[] = [];
	let removeNodes: PathInfo[] = [];

	const controllers: Controllers = {
		appendEditedNode(path: string | PathInfo) {
			const p = path instanceof PathInfo ? path : PathInfo.get(path);
			editedNodes.push(p);
			editedNodes = editedNodes.filter((p) => !(p.isChildOf(path) || p.isDescendantOf(path)));
		},
		appendRemoveNode(path: string | PathInfo) {
			const p = path instanceof PathInfo ? path : PathInfo.get(path);
			removeNodes.push(p);
			removeNodes = removeNodes.filter((p) => !(p.isChildOf(path) || p.isDescendantOf(path)));
		},
		findNode(path?: string | PathInfo | null) {
			if (!path) {
				return undefined;
			}
			const p = path instanceof PathInfo ? path : PathInfo.get(path);
			const isRemove =
				editedNodes.findIndex((path) => p.isChildOf(path) || p.isDescendantOf(path)) >= 0 ||
				removeNodes.findIndex((path) => p.equals(path) || p.isChildOf(path) || p.isDescendantOf(path)) >= 0;
			const index = isRemove ? -1 : byNodes.findIndex(({ path }) => p.equals(path));
			return index >= 0 ? byNodes[index] : undefined;
		},
		async pushAddedNode(node: NodesPending) {
			result.push(node);
			added.push(node);
		},
		async pushRemovedNode(node: NodesPending) {
			this.appendRemoveNode(node.path);
		},
		async pushModifiedNode(node: ModifiedNode, isModified: boolean = true) {
			if (isModified) {
				modified.push(node);
			}
			result.push(node);
		},
		resolveNodesConflict(nodes: NodesPending[]) {
			for (let i = 0; i < nodes.length; i++) {
				const node = nodes[i];

				if (node.type !== "VERIFY" && (node.content.type === nodeValueTypes.EMPTY || node.content.value === null || node.content.value === undefined)) {
					removeNodes.push(PathInfo.get(node.path));
					removeNodes = removeNodes.filter((p) => !(p.isChildOf(path) || p.isDescendantOf(path)));
					continue;
				}

				if (node.type === "SET") {
					editedNodes.push(PathInfo.get(node.path));
					editedNodes = editedNodes.filter((p) => !(p.isChildOf(path) || p.isDescendantOf(path)));
				}

				const currentNode = this.findNode(node.path);

				if (node.type === "VERIFY") {
					if (!currentNode) {
						this.pushAddedNode(node);
					}
					continue;
				} else {
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

								if (n.content.type === nodeValueTypes.ARRAY) {
									n.content.value = Object.values(n.content.value);
								}
							} else {
								n.content.value = node.content.value as any;
							}
						}

						if (n) {
							this.pushModifiedNode(n, JSON.stringify(n.content.value) !== JSON.stringify(n.previous_content?.value));
						}
					} else {
						this.pushAddedNode(node);
					}
				}
			}
		},
	};

	if (options.include_checks) {
		let parentPath = pathInfo.parent;

		while (parentPath && parentPath.path.trim() !== "") {
			const node: NodesPending = {
				path: parentPath.path,
				type: "VERIFY",
				content: {
					type: (typeof parentPath.key === "number" ? nodeValueTypes.ARRAY : nodeValueTypes.OBJECT) as any,
					value: {},
					revision,
					revision_nr: 1,
					created: Date.now(),
					modified: Date.now(),
				},
			};

			const currentNode = controllers.findNode(node.path);

			if (!currentNode) {
				controllers.resolveNodesConflict([node]);
			}

			parentPath = parentPath.parent;
		}
	}

	await extactNodes(type, data, pathInfo.keys, controllers, options, controllers.findNode(pathInfo.parent));

	for (let i = 0; i < byNodes.length; i++) {
		const node = byNodes[i];
		const p = PathInfo.get(node.path);
		const isRemove =
			editedNodes.findIndex((path) => p.isChildOf(path) || p.isDescendantOf(path)) >= 0 || removeNodes.findIndex((path) => p.equals(path) || p.isChildOf(path) || p.isDescendantOf(path)) >= 0;
		if (isRemove) {
			await new Promise((resolve) => setTimeout(resolve, 0));
			removed.push(node);
		}
	}

	const sortNodes = (a: NodesPending, b: NodesPending) => {
		const aPath = PathInfo.get(a.path);
		const bPath = PathInfo.get(b.path);
		return aPath.isAncestorOf(bPath) || aPath.isParentOf(bPath) ? -1 : aPath.isDescendantOf(bPath) || aPath.isChildOf(bPath) ? 1 : 0;
	};

	result = result
		// .filter((n, i, l) => l.findIndex(({ path: p }) => PathInfo.get(p).equals(n.path)) === i)
		.map(modifyRevision(revision))
		.sort(sortNodes);
	added = added
		// .filter((n, i, l) => l.findIndex(({ path: p }) => PathInfo.get(p).equals(n.path)) === i)
		.map(modifyRevision(revision))
		.sort(sortNodes);
	modified = modified
		// .filter((n, i, l) => l.findIndex(({ path: p }) => PathInfo.get(p).equals(n.path)) === i)
		.map(modifyRevision(revision))
		.sort(sortNodes);
	removed = removed
		// .filter((n, i, l) => l.findIndex(({ path: p }) => PathInfo.get(p).equals(n.path)) === i)
		.map(modifyRevision(revision))
		.sort(sortNodes);

	// console.log("removed:", JSON.stringify(removed, null, 4));

	// console.log("RESULT:", path, JSON.stringify(result, null, 4));

	// console.log(path, JSON.stringify({ result, added, modified, removed }, null, 4));

	return { result, added, modified, removed };

	// const resolveConflict = (node: NodesPending) => {
	// 	const comparison = result.find((n) => PathInfo.get(n.path).equals(node.path));

	// 	if (!comparison) {
	// 		result.push(node);
	// 		return;
	// 	} else if (node.type === "VERIFY") {
	// 		return;
	// 	}

	// 	result = result.filter((n) => !PathInfo.get(n.path).equals(node.path));

	// 	if (comparison.content.type !== node.content.type) {
	// 		result.push(node);
	// 		return;
	// 	}

	// 	if (comparison.type === "VERIFY") {
	// 		comparison.type = "UPDATE";
	// 	}

	// 	node.content.value = joinObjects(comparison.content.value, node.content.value);
	// 	result.push(node);
	// };

	// const include_checks = options.include_checks;

	// // if (options.include_checks) {
	// // 	while (typeof pathInfo.parentPath === "string" && pathInfo.parentPath.trim() !== "") {
	// // 		const node: NodesPending = {
	// // 			path: pathInfo.parentPath,
	// // 			type: "VERIFY",
	// // 			content: {
	// // 				type: (typeof pathInfo.key === "number" ? nodeValueTypes.ARRAY : nodeValueTypes.OBJECT) as any,
	// // 				value: {},
	// // 				revision,
	// // 				revision_nr: 1,
	// // 				created: Date.now(),
	// // 				modified: Date.now(),
	// // 			},
	// // 		};
	// // 		resolveConflict(node);
	// // 		pathInfo = PathInfo.get(pathInfo.parentPath);
	// // 	}
	// // }

	// options.include_checks = false;

	// let value = data;
	// let valueType = getValueType(value);

	// if (valueType === VALUE_TYPES.OBJECT || valueType === VALUE_TYPES.ARRAY) {
	// 	value = {};
	// 	valueType = Array.isArray(data) ? VALUE_TYPES.ARRAY : VALUE_TYPES.OBJECT;

	// 	for (let key in data) {
	// 		if (valueType === VALUE_TYPES.OBJECT && valueFitsInline(data[key], settings)) {
	// 			value[key] = getTypedChildValue(data[key]);
	// 			if (value[key] === null) {
	// 				result = destructureData(type, PathInfo.get([path, valueType === VALUE_TYPES.OBJECT ? key : parseInt(key)]).path, null, { ...options, previous_result: result }, settings);
	// 			}
	// 			continue;
	// 		}

	// 		result = destructureData(type, PathInfo.get([path, valueType === VALUE_TYPES.OBJECT ? key : parseInt(key)]).path, data[key], { ...options, previous_result: result }, settings);
	// 	}
	// }

	// const parentPath = PathInfo.get(pathInfo.parentPath as any);

	// const isObjectFitsInline = [VALUE_TYPES.ARRAY, VALUE_TYPES.OBJECT].includes(valueType as any)
	// 	? result.findIndex((n) => {
	// 			return PathInfo.get(n.path).isChildOf(pathInfo) || PathInfo.get(n.path).isDescendantOf(pathInfo);
	// 	  }) < 0 && Object.keys(value).length === 0
	// 	: valueFitsInline(value, settings);

	// if (parentPath.path && parentPath.path.trim() !== "") {
	// 	const parentNode: NodesPending = result.find((node) => PathInfo.get(node.path).equals(parentPath)) ?? {
	// 		path: parentPath.path,
	// 		type: "UPDATE",
	// 		content: {
	// 			type: (typeof pathInfo.key === "number" ? nodeValueTypes.ARRAY : nodeValueTypes.OBJECT) as any,
	// 			value: {},
	// 			revision,
	// 			revision_nr: 1,
	// 			created: Date.now(),
	// 			modified: Date.now(),
	// 		},
	// 	};

	// 	parentNode.type = "UPDATE";

	// 	if (parentNode.content.value === null || typeof parentNode.content.value !== "object") {
	// 		parentNode.content.value = {};
	// 	}

	// 	if (parentNode.content.type === nodeValueTypes.OBJECT || parentNode.content.type === nodeValueTypes.ARRAY) {
	// 		(parentNode.content.value as any)[pathInfo.key as string | number] = isObjectFitsInline ? getTypedChildValue(value) : null;
	// 		result = result.filter((node) => !PathInfo.get(node.path).equals(parentPath));
	// 		resolveConflict(parentNode);
	// 	}
	// }

	// const node: NodesPending = {
	// 	path,
	// 	type: isObjectFitsInline ? "SET" : type,
	// 	content: {
	// 		type: valueType as any,
	// 		value: isObjectFitsInline ? null : value,
	// 		revision,
	// 		revision_nr: 1,
	// 		created: Date.now(),
	// 		modified: Date.now(),
	// 	},
	// };

	// resolveConflict(node);

	// const verifyNodes: NodesPending[] = [];

	// for (const node of result) {
	// 	const pathInfo = PathInfo.get(node.path);
	// 	const parentNode = result.find((n) => PathInfo.get(n.path).isParentOf(node.path)) ?? verifyNodes.find((n) => PathInfo.get(n.path).isParentOf(node.path));

	// 	if (!parentNode && pathInfo.parentPath && pathInfo.parentPath.trim() !== "" && include_checks) {
	// 		const verifyNode: NodesPending = {
	// 			path: pathInfo.parentPath as any,
	// 			type: "VERIFY",
	// 			content: {
	// 				type: (typeof pathInfo.key === "number" ? nodeValueTypes.ARRAY : nodeValueTypes.OBJECT) as any,
	// 				value: {},
	// 				revision,
	// 				revision_nr: 1,
	// 				created: Date.now(),
	// 				modified: Date.now(),
	// 			},
	// 		};

	// 		verifyNodes.push(verifyNode);
	// 	}
	// }

	// return verifyNodes.concat(result).map((node) => {
	// 	node.path = node.path.replace(/\/+$/g, "");
	// 	return node;
	// });
}
