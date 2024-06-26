import { ID, PathInfo, SimpleEventEmitter, Types } from "ivipbase-core";
import { NodesPending, StorageNodeInfo } from "./NodeInfo";
import { getTypedChildValue, getValueType, nodeValueTypes, processReadNodeValue, valueFitsInline } from "./utils";
import { allowEventLoop, removeNulls } from "src/utils";

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
	private _ready: boolean = false;
	private rootPath: PathInfo = new PathInfo("");

	private indexes: Record<string, StorageNodeInfo> = {};
	private tree: Record<string, Node> = {};

	constructor(readonly database: string, private nodes: StorageNodeInfo[]) {
		super();
		this.applyNodes(this.nodes).then(() => {
			this._ready = true;
			this.emit("ready");
		});
	}

	once<d = { dbName: string; name: "remove"; path: string; value: any; previous: undefined }>(event: "remove", callback: (data: d) => void): Promise<d>;
	once<d = { dbName: string; name: "change"; path: string; value: any; previous: any }>(event: "change", callback: (data: d) => void): Promise<d>;
	once<d = { dbName: string; name: "add"; path: string; value: any; previous: undefined }>(event: "add", callback: (data: d) => void): Promise<d>;
	once<d = undefined>(event: "ready", callback: (data: d) => void): Promise<d>;
	once(event: string, callback: any) {
		return super.once(event, callback);
	}

	on<d = { dbName: string; name: "remove"; path: string; value: any; previous: undefined }>(event: "remove", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
	on<d = { dbName: string; name: "change"; path: string; value: any; previous: any }>(event: "change", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
	on<d = { dbName: string; name: "add"; path: string; value: any; previous: undefined }>(event: "add", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
	on<d = undefined>(event: "ready", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
	on(event: string, callback: any) {
		return super.on(event, callback);
	}

	emit(event: "remove", data: StorageNodeInfo): this;
	emit(event: "change", data: StorageNodeInfo & { previous_content?: StorageNodeInfo["content"] }): this;
	emit(event: "add", data: StorageNodeInfo): this;
	emit(event: "ready", data?: any): this;
	emit(event: string, data?: any) {
		if (event === "remove" || event === "change" || event === "add") {
			data = {
				dbName: this.database,
				name: event,
				path: data.path,
				value: removeNulls(data.content.value),
				previous: event === "change" ? removeNulls(data?.previous_content?.value) : undefined,
			};
		}
		return super.emit(event, data);
	}

	async ready(callback?: () => void) {
		if (!this._ready) {
			// Aguarda o evento ready
			await new Promise((resolve) => this.once("ready", resolve));
		}
		callback?.();
	}

	get path(): string {
		return this.rootPath.path;
	}

	pushIndex(node: StorageNodeInfo) {
		const pathInfo = new PathInfo(node.path);
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

	async applyNodes(nodes: StorageNodeInfo[]): Promise<NTree> {
		await allowEventLoop(
			nodes,
			(node) => {
				const pathInfo = new PathInfo(node.path);

				if (this.rootPath.path === "" || !this.rootPath.path) {
					this.rootPath = pathInfo;
				} else if (this.rootPath.isChildOf(pathInfo)) {
					this.rootPath = pathInfo;
				}

				this.pushIndex(node);
			},
			{
				length_cycles: 1000,
			},
		);
		return this;
	}

	public static createBy(database: string, nodes: StorageNodeInfo[]): NTree {
		return new NTree(database, nodes);
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

	async getChildPathsBy(path: string | (string | number | PathInfo)[]): Promise<string[]> {
		const pathInfo = new PathInfo(path);
		const list: string[] = [];

		await allowEventLoop(
			this.tree,
			(_, path) => {
				if (pathInfo.isParentOf(path)) {
					list.push(path);
				}
			},
			{
				length_cycles: 1000,
			},
		);

		return list;
	}

	async getChildNodesBy(path: string | (string | number | PathInfo)[]): Promise<StorageNodeInfo[]> {
		const pathInfo = new PathInfo(path);
		const list: StorageNodeInfo[] = [];

		await allowEventLoop(
			this.tree,
			(_, path) => {
				if (pathInfo.isParentOf(path)) {
					list.push(this.indexes[path]);
				}
			},
			{
				length_cycles: 1000,
			},
		);

		return list;
	}

	async get(
		path: string | (string | number | PathInfo)[],
		options: {
			include?: Array<string | number>;
			exclude?: Array<string | number>;
			main_path?: string;
		} = {},
	): Promise<null | any> {
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
				await allowEventLoop(tree.childrens, async (child) => {
					const pathInfo = PathInfo.get(child);
					if (pathInfo.key !== null && checkIncludedPath(child, options as any)) {
						value[pathInfo.key] = await this.get(pathInfo.path, options);
					}
				});
			}
		}

		return value;
	}

	async remove(path: string | (string | number | PathInfo)[]): Promise<void> {
		const pathInfo = new PathInfo(path);

		let nodeInfo: StorageNodeInfo | undefined = this.indexes[pathInfo.path];

		if (!nodeInfo && pathInfo.parentPath && this.hasNode(pathInfo.parentPath)) {
			nodeInfo = this.indexes[pathInfo.parentPath];
		}

		if (!nodeInfo) {
			return;
		}

		const key = pathInfo.key;

		if (pathInfo.isChildOf(nodeInfo.path) && key !== null && typeof nodeInfo.content.value === "object" && nodeInfo.content.value !== null && key in nodeInfo.content.value) {
			const previous_content = JSON.parse(JSON.stringify(nodeInfo.content));
			delete (nodeInfo.content.value as any)[key];
			this.emit("change", { ...nodeInfo, previous_content });
		}

		if (pathInfo.equals(nodeInfo.path)) {
			const { childrens } = this.tree[nodeInfo.path];
			this.emit("remove", nodeInfo);
			delete this.indexes[nodeInfo.path];
			delete this.tree[nodeInfo.path];

			await allowEventLoop(childrens, async (child) => {
				await this.remove(child);
			});
		}
	}

	async verifyParents(
		path: string | (string | number | PathInfo)[],
		options: {
			assert_revision?: string;
		},
	): Promise<void> {
		const pathInfo = new PathInfo(path).parent;
		const revision = options?.assert_revision ?? ID.generate();

		if (!pathInfo) {
			return;
		}

		const keys = pathInfo.keys;

		await allowEventLoop(new Array(keys.length).fill(null), async (_, i) => {
			const parentPath = PathInfo.get(keys.slice(0, i + 1));

			if (!this.hasNode(parentPath.path)) {
				const node: StorageNodeInfo = {
					path: parentPath.path,
					content: {
						type: (typeof parentPath.key === "number" ? nodeValueTypes.ARRAY : nodeValueTypes.OBJECT) as any,
						value: {},
						revision,
						revision_nr: 1,
						created: Date.now(),
						modified: Date.now(),
					},
				};

				this.pushIndex(node);
				this.emit("add", node);
			}
		});
	}

	async set(
		path: string | (string | number | PathInfo)[],
		data: any,
		options: {
			maxInlineValueSize: number;
		} = {
			maxInlineValueSize: 200,
		},
	): Promise<void> {
		await this.destructure("SET", path, data, options);
	}

	async update(
		path: string | (string | number | PathInfo)[],
		data: any,
		options: {
			maxInlineValueSize: number;
		} = {
			maxInlineValueSize: 200,
		},
	): Promise<void> {
		await this.destructure("UPDATE", path, data, options);
	}

	private async destructure(
		type: "SET" | "UPDATE",
		path: string | (string | number | PathInfo)[],
		data: any,
		options: {
			assert_revision?: string;
			include_checks?: boolean;
			maxInlineValueSize: number;
		} = {
			maxInlineValueSize: 200,
		},
	) {
		let pathInfo = new PathInfo(path);
		const revision = options?.assert_revision ?? ID.generate();
		options.assert_revision = revision;
		options.include_checks = typeof options.include_checks === "boolean" ? options.include_checks : true;

		if (["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(data)) !== true) {
			type = "UPDATE";
			data = {
				[pathInfo.key as any]: data,
			};
			pathInfo = pathInfo.parent as any;
		}

		if (options.include_checks) {
			this.verifyParents(pathInfo.path, options);
		}

		const node: StorageNodeInfo = {
			path: pathInfo.path,
			content: {
				type: (typeof pathInfo.key === "number" ? nodeValueTypes.ARRAY : nodeValueTypes.OBJECT) as any,
				value: typeof pathInfo.key === "number" ? [] : {},
				revision,
				revision_nr: 1,
				created: Date.now(),
				modified: Date.now(),
			},
		};

		const fitsInlineKeys: (string | number)[] = [];

		await allowEventLoop(data, async (val, key: number | string) => {
			const fitsInline = valueFitsInline(val, options);

			if (fitsInline) {
				fitsInlineKeys.push(key);
			}
		});

		if (this.hasNode(pathInfo.path)) {
			const mainNode = this.indexes[pathInfo.path];
			const previous_content = JSON.parse(JSON.stringify(mainNode.content));
			const childs = await this.getChildPathsBy(pathInfo.path);

			if (mainNode.content.type !== node.content.type) {
				type = "SET";
				await allowEventLoop(childs, async (path) => {
					await this.remove(path);
				});
			}

			if (type === "UPDATE") {
				node.content.value = mainNode.content.value;
			} else {
				await allowEventLoop(childs, async (path) => {
					const pathInfo = new PathInfo(path);
					if (pathInfo.key !== null && !(pathInfo.key in data)) {
						await this.remove(path);
					}
				});
			}

			await allowEventLoop(fitsInlineKeys, async (key) => {
				const newPath = PathInfo.get([pathInfo.path, key]);
				if (this.hasNode(newPath.path)) {
					await this.remove(newPath.path);
				}
				(node.content.value as any)[key] = getTypedChildValue(data[key]);
			});

			this.pushIndex(node);
			this.emit("change", { ...node, previous_content });
		} else {
			await allowEventLoop(fitsInlineKeys, async (key) => {
				const newPath = PathInfo.get([pathInfo.path, key]);
				if (this.hasNode(newPath.path)) {
					await this.remove(newPath.path);
				}
				(node.content.value as any)[key] = getTypedChildValue(data[key]);
			});

			this.pushIndex(node);
			this.emit("add", node);
		}

		await allowEventLoop(data, async (val, key: number | string) => {
			const newPath = PathInfo.get([pathInfo.path, key]);
			if (!fitsInlineKeys.includes(key)) {
				const typeValue = getValueType(val);

				if (typeValue === nodeValueTypes.ARRAY || typeValue === nodeValueTypes.OBJECT) {
					await this.destructure(type, newPath.path, val, options);
				} else {
					const node: StorageNodeInfo = {
						path: newPath.path,
						content: {
							type: typeValue as any,
							value: val as any,
							revision,
							revision_nr: 1,
							created: Date.now(),
							modified: Date.now(),
						},
					};

					if (this.hasNode(newPath.path)) {
						const mainNode = this.indexes[newPath.path];
						const previous_content = JSON.parse(JSON.stringify(mainNode.content));

						if (mainNode.content.type !== node.content.type) {
							const childs = await this.getChildPathsBy(newPath.path);
							await allowEventLoop(childs, async (path) => {
								await this.remove(path);
							});
						}

						this.pushIndex(node);
						this.emit("change", { ...node, previous_content });
					} else {
						this.pushIndex(node);
						this.emit("add", node);
					}
				}
			}
		});
	}
}

export default NTree;
