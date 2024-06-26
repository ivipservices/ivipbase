import { PathInfo, SimpleEventEmitter } from "ivipbase-core";
import { NodesPending, StorageNodeInfo } from "./NodeInfo";
import { nodeValueTypes, processReadNodeValue } from "./utils";

const checkIncludedPath = (
	from: string,
	options: {
		include?: Array<string | number>;
		exclude?: Array<string | number>;
		main_path: string;
	},
) => {
	const include = (options?.include ?? []).map((p) => PathInfo.get([options.main_path, p]));
	const exclude = (options?.exclude ?? []).map((p) => PathInfo.get([options.main_path, p]));
	const p = PathInfo.get(from);
	const isInclude = include.length > 0 ? include.findIndex((path) => p.isParentOf(path) || p.equals(path) || p.isDescendantOf(path)) >= 0 : true;
	return exclude.findIndex((path) => p.equals(path) || p.isDescendantOf(path)) < 0 && isInclude;
};

const resolveObjetByIncluded = <t extends Object>(
	path: string,
	obj: t,
	options: {
		include?: Array<string | number>;
		exclude?: Array<string | number>;
		main_path: string;
	},
): t => {
	return Array.isArray(obj)
		? obj
				.filter((_, k) => {
					const p = PathInfo.get([path, k]);
					return checkIncludedPath(p.path, options);
				})
				.map((v, k) => {
					if (["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(v))) {
						return resolveObjetByIncluded(PathInfo.get([path, k]).path, v, options);
					}
					return v;
				})
		: (Object.fromEntries(
				Object.entries(obj)
					.filter(([k, v]) => {
						const p = PathInfo.get([path, k]);
						return checkIncludedPath(p.path, options);
					})
					.map(([k, v]) => {
						if (["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(v))) {
							return [k, resolveObjetByIncluded(PathInfo.get([path, k]).path, v, options)];
						}
						return [k, v];
					}),
		  ) as any);
};

class Node {
	readonly childrens: Array<string> = [];
	constructor(readonly path: string = "") {}

	pushChild(path: string): Node {
		if (!this.childrens.includes(path)) {
			this.childrens.push(path);
		}
		return this;
	}
}

export class NTree extends SimpleEventEmitter {
	private rootPath: PathInfo = new PathInfo("");

	private removedNodes: NodesPending[] = [];
	private addedNodes: NodesPending[] = [];
	private updatedNodes: NodesPending[] = [];

	private indexes: Record<string, StorageNodeInfo> = {};
	private tree: Record<string, Node> = {};

	constructor(private nodes: StorageNodeInfo[]) {
		super();
		this.applyNodes(this.nodes);
	}

	get path(): string {
		return this.rootPath.path;
	}

	applyNodes(nodes: StorageNodeInfo[]): NTree {
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			const pathInfo = new PathInfo(node.path);

			if (this.rootPath.path === "" || !this.rootPath.path) {
				this.rootPath = pathInfo;
			} else if (this.rootPath.isChildOf(pathInfo)) {
				this.rootPath = pathInfo;
			}

			this.indexes[pathInfo.path] = node;

			if (!(this.tree[pathInfo.path] instanceof Node)) {
				this.tree[pathInfo.path] = new Node(pathInfo.path);
			}

			let parent: PathInfo | null = pathInfo.parent,
				childPath = pathInfo.path;

			while (parent !== null) {
				if (this.tree[parent.path] instanceof Node) {
					this.tree[parent.path].pushChild(childPath);
					break;
				} else {
					this.tree[parent.path] = new Node(parent.path).pushChild(childPath);
					childPath = parent.path;
					parent = parent.parent;
				}
			}
		}
		return this;
	}

	public static createBy(nodes: StorageNodeInfo[]): NTree {
		return new NTree(nodes);
	}

	hasNode(path: string | (string | number | PathInfo)[]): boolean {
		const pathInfo = new PathInfo(path);
		return pathInfo.path in this.indexes;
	}

	getNodeBy(path: string | (string | number | PathInfo)[]): StorageNodeInfo | undefined {
		const pathInfo = new PathInfo(path);
		let nodeInfo: StorageNodeInfo | undefined;

		if (this.hasNode(pathInfo.path)) {
			nodeInfo = this.indexes[pathInfo.path];
		} else if (pathInfo.parentPath && this.hasNode(pathInfo.parentPath)) {
			nodeInfo = this.indexes[pathInfo.parentPath];
		}

		return nodeInfo;
	}

	getChildNodesBy(path: string | (string | number | PathInfo)[]): StorageNodeInfo[] {
		const pathInfo = new PathInfo(path);

		if (this.hasNode(pathInfo.path)) {
			const tree = this.tree[pathInfo.path];
			return tree.childrens.map((childPath) => {
				return this.indexes[childPath];
			});
		}

		return [];
	}

	strucuture(
		path: string | (string | number | PathInfo)[],
		options: {
			include?: Array<string | number>;
			exclude?: Array<string | number>;
			main_path?: string;
		} = {},
	): null | any {
		const pathInfo = new PathInfo(path);
		options.main_path = !options.main_path ? pathInfo.path : options.main_path;

		let nodeInfo: StorageNodeInfo | undefined = this.indexes[pathInfo.path];

		if (!nodeInfo && pathInfo.parentPath && this.hasNode(pathInfo.parentPath)) {
			nodeInfo = this.indexes[pathInfo.parentPath];
		}

		if (!nodeInfo) {
			return null;
		}

		let value: any = undefined;
		let { path: nodePath, content } = nodeInfo;
		content = processReadNodeValue(content);

		if (pathInfo.isChildOf(nodePath)) {
			if (
				(content.type === nodeValueTypes.OBJECT || content.type === nodeValueTypes.ARRAY) &&
				typeof content.value === "object" &&
				content.value !== null &&
				pathInfo.key &&
				pathInfo.key in content.value
			) {
				value = (content.value as any)[pathInfo.key as any] ?? undefined;
			}
			return value;
		}

		if (content.type === nodeValueTypes.OBJECT || content.type === nodeValueTypes.ARRAY) {
			value = resolveObjetByIncluded(nodePath, content.type === nodeValueTypes.ARRAY ? (Array.isArray(content.value) ? content.value : []) : content.value, options as any);

			const tree = this.tree[nodePath];

			if (tree instanceof Node) {
				for (const child of tree.childrens) {
					const pathInfo = PathInfo.get(child);
					if (pathInfo.key !== null && checkIncludedPath(child, options as any)) {
						value[pathInfo.key] = this.strucuture(pathInfo.path, options);
					}
				}
			}
		}

		return value;
	}

	destructure(
		type: "SET" | "UPDATE",
		path: string | (string | number | PathInfo)[],
		data: any,
		options: {
			assert_revision?: string;
			include_checks?: boolean;
			previous_result?: StorageNodeInfo[];
			maxInlineValueSize: number;
		} = {
			maxInlineValueSize: 200,
		},
	): NTree {
		return this;
	}
}

export default NTree;
