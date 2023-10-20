import NodeInfo from "./NodeInfo";
import { NodeAddress } from "./NodeAddress";

import { PathInfo, PathReference, Utils, ascii85, ID, Lib, SimpleEventEmitter } from "ivipbase-core";
import type { Types } from "ivipbase-core";
import { Collection } from "mongodb";

export * from "./NodeAddress";
export * from "./NodeCache";
export * from "./NodeChanges";
export { default as NodeInfo } from "./NodeInfo";
export * from "./NodeLock";

export class NodeNotFoundError extends Error {}
export class NodeRevisionError extends Error {}

const { compareValues, encodeString, isDate } = Utils;
const assert = Lib.assert;

const nodeValueTypes = {
	EMPTY: 0,
	// Native types:
	OBJECT: 1,
	ARRAY: 2,
	NUMBER: 3,
	BOOLEAN: 4,
	STRING: 5,
	BIGINT: 7,
	// Custom types:
	DATETIME: 6,
	BINARY: 8,
	REFERENCE: 9,

	DEDICATED_RECORD: 99,
} as const;

export type NodeValueType = (typeof nodeValueTypes)[keyof typeof nodeValueTypes];
export const VALUE_TYPES = nodeValueTypes as Record<keyof typeof nodeValueTypes, NodeValueType>;

export function getValueTypeName(valueType: number) {
	switch (valueType) {
		case VALUE_TYPES.ARRAY:
			return "array";
		case VALUE_TYPES.BINARY:
			return "binary";
		case VALUE_TYPES.BOOLEAN:
			return "boolean";
		case VALUE_TYPES.DATETIME:
			return "date";
		case VALUE_TYPES.NUMBER:
			return "number";
		case VALUE_TYPES.OBJECT:
			return "object";
		case VALUE_TYPES.REFERENCE:
			return "reference";
		case VALUE_TYPES.STRING:
			return "string";
		case VALUE_TYPES.BIGINT:
			return "bigint";
		case VALUE_TYPES.DEDICATED_RECORD:
			return "dedicated_record";
		default:
			"unknown";
	}
}

function getValueTypeDefault(valueType: number) {
	switch (valueType) {
		case VALUE_TYPES.ARRAY:
			return [];
		case VALUE_TYPES.OBJECT:
			return {};
		case VALUE_TYPES.NUMBER:
			return 0;
		case VALUE_TYPES.BOOLEAN:
			return false;
		case VALUE_TYPES.STRING:
			return "";
		case VALUE_TYPES.BIGINT:
			return BigInt(0);
		case VALUE_TYPES.DATETIME:
			return new Date().toISOString();
		case VALUE_TYPES.BINARY:
			return new Uint8Array();
		case VALUE_TYPES.REFERENCE:
			return null;
		default:
			return undefined; // Or any other default value you prefer
	}
}

export function getNodeValueType(value: unknown) {
	if (value instanceof Array) {
		return VALUE_TYPES.ARRAY;
	} else if (value instanceof PathReference) {
		return VALUE_TYPES.REFERENCE;
	} else if (value instanceof ArrayBuffer) {
		return VALUE_TYPES.BINARY;
	} else if (isDate(value)) {
		return VALUE_TYPES.DATETIME;
	}
	// TODO else if (value instanceof DataDocument) { return VALUE_TYPES.DOCUMENT; }
	else if (typeof value === "string") {
		return VALUE_TYPES.STRING;
	} else if (typeof value === "object") {
		return VALUE_TYPES.OBJECT;
	} else if (typeof value === "bigint") {
		return VALUE_TYPES.BIGINT;
	}
	return VALUE_TYPES.EMPTY;
}

export function getValueType(value: unknown) {
	if (value instanceof Array) {
		return VALUE_TYPES.ARRAY;
	} else if (value instanceof PathReference) {
		return VALUE_TYPES.REFERENCE;
	} else if (value instanceof ArrayBuffer) {
		return VALUE_TYPES.BINARY;
	} else if (isDate(value)) {
		return VALUE_TYPES.DATETIME;
	}
	// TODO else if (value instanceof DataDocument) { return VALUE_TYPES.DOCUMENT; }
	else if (typeof value === "string") {
		return VALUE_TYPES.STRING;
	} else if (typeof value === "object") {
		return VALUE_TYPES.OBJECT;
	} else if (typeof value === "number") {
		return VALUE_TYPES.NUMBER;
	} else if (typeof value === "boolean") {
		return VALUE_TYPES.BOOLEAN;
	} else if (typeof value === "bigint") {
		return VALUE_TYPES.BIGINT;
	}
	return VALUE_TYPES.EMPTY;
}

export class CustomStorageNodeInfo extends NodeInfo {
	address?: NodeAddress;
	revision: string;
	revision_nr: number;
	created: Date;
	modified: Date;

	constructor(info: Omit<CustomStorageNodeInfo, "valueType" | "valueTypeName">) {
		super(info);
		this.revision = info.revision;
		this.revision_nr = info.revision_nr;
		this.created = info.created;
		this.modified = info.modified;
	}
}

/** Interface for metadata being stored for nodes */
export class StorageNodeMetaData {
	/** cuid (time sortable revision id). Nodes stored in the same operation share this id */
	revision = "";
	/** Number of revisions, starting with 1. Resets to 1 after deletion and recreation */
	revision_nr = 0;
	/** Creation date/time in ms since epoch UTC */
	created = 0;
	/** Last modification date/time in ms since epoch UTC */
	modified = 0;
	/** Type of the node's value. 1=object, 2=array, 3=number, 4=boolean, 5=string, 6=date, 7=reserved, 8=binary, 9=reference */
	type = 0 as NodeValueType;
}

/** Interface for metadata combined with a stored value */
export class StorageNode extends StorageNodeMetaData {
	/** only Object, Array, large string and binary values. */
	value: any = null;
	constructor() {
		super();
	}
}

export interface StorageNodeInfo {
	path: string;
	content: StorageNode;
}

export class NodeSettings {
	/**
	 * in bytes, max amount of child data to store within a parent record before moving to a dedicated record. Default is 50
	 * @default 50
	 */
	maxInlineValueSize: number = 50;

	/**
	 * Instead of throwing errors on undefined values, remove the properties automatically. Default is false
	 * @default false
	 */
	removeVoidProperties: boolean = false;

	mongoDB: {
		collection?: Collection<StorageNodeInfo>;
	} = {};

	constructor(options: Partial<NodeSettings>) {
		if (typeof options.maxInlineValueSize === "number") {
			this.maxInlineValueSize = options.maxInlineValueSize;
		}

		if (typeof options.removeVoidProperties === "boolean") {
			this.removeVoidProperties = options.removeVoidProperties;
		}

		if (typeof options.removeVoidProperties === "boolean") {
			this.removeVoidProperties = options.removeVoidProperties;
		}

		if (typeof options.mongoDB === "object") {
			this.mongoDB = options.mongoDB;
		}
	}
}

export default class Node extends SimpleEventEmitter {
	readonly settings: NodeSettings;
	private nodes: StorageNodeInfo[] = [];

	constructor(byNodes: StorageNodeInfo[] = [], options: Partial<NodeSettings> = {}) {
		super();

		this.settings = new NodeSettings(options);
		this.push(byNodes);

		if (this.isPathExists("") !== true) {
			this.writeNode("", {});
		}
	}

	isPathExists(path: string): boolean {
		const pathInfo = PathInfo.get(path);
		return (
			this.nodes.findIndex(({ path: nodePath }) => {
				return pathInfo.isOnTrailOf(nodePath);
			}) >= 0
		);
	}

	push(...nodes: (StorageNodeInfo[] | StorageNodeInfo)[]) {
		const forNodes: StorageNodeInfo[] =
			Array.prototype.concat
				.apply(
					[],
					nodes.map((node) => (Array.isArray(node) ? node : [node])),
				)
				.filter((node: any = {}) => node && typeof node.path === "string" && "content" in node) ?? [];

		for (let node of forNodes) {
			this.nodes.push(node);
		}

		return this;
	}

	static get VALUE_TYPES() {
		return VALUE_TYPES;
	}

	/**
	 * Checks if a value can be stored in a parent object, or if it should
	 * move to a dedicated record. Uses settings.maxInlineValueSize
	 * @param value
	 */
	valueFitsInline(value: any) {
		if (typeof value === "number" || typeof value === "boolean" || isDate(value)) {
			return true;
		} else if (typeof value === "string") {
			if (value.length > this.settings.maxInlineValueSize) {
				return false;
			}
			// if the string has unicode chars, its byte size will be bigger than value.length
			const encoded = encodeString(value);
			return encoded.length < this.settings.maxInlineValueSize;
		} else if (value instanceof PathReference) {
			if (value.path.length > this.settings.maxInlineValueSize) {
				return false;
			}
			// if the path has unicode chars, its byte size will be bigger than value.path.length
			const encoded = encodeString(value.path);
			return encoded.length < this.settings.maxInlineValueSize;
		} else if (value instanceof ArrayBuffer) {
			return value.byteLength < this.settings.maxInlineValueSize;
		} else if (value instanceof Array) {
			return value.length === 0;
		} else if (typeof value === "object") {
			return Object.keys(value).length === 0;
		} else {
			throw new TypeError("What else is there?");
		}
	}

	private getTypedChildValue(val: any) {
		if (val === null) {
			throw new Error(`Not allowed to store null values. remove the property`);
		} else if (isDate(val)) {
			return { type: VALUE_TYPES.DATETIME, value: new Date(val).getTime() };
		} else if (["string", "number", "boolean"].includes(typeof val)) {
			return val;
		} else if (val instanceof PathReference) {
			return { type: VALUE_TYPES.REFERENCE, value: val.path };
		} else if (val instanceof ArrayBuffer) {
			return { type: VALUE_TYPES.BINARY, value: ascii85.encode(val) };
		} else if (typeof val === "object") {
			assert(Object.keys(val).length === 0 || ("type" in val && val.type === VALUE_TYPES.DEDICATED_RECORD), "child object stored in parent can only be empty");
			return val;
		}
	}

	private processReadNodeValue(node: StorageNode): StorageNode {
		const getTypedChildValue = (val: { type: number; value: any; path?: string }) => {
			// Typed value stored in parent record
			if (val.type === VALUE_TYPES.BINARY) {
				// binary stored in a parent record as a string
				return ascii85.decode(val.value);
			} else if (val.type === VALUE_TYPES.DATETIME) {
				// Date value stored as number
				return new Date(val.value);
			} else if (val.type === VALUE_TYPES.REFERENCE) {
				// Path reference stored as string
				return new PathReference(val.value);
			} else if (val.type === VALUE_TYPES.DEDICATED_RECORD) {
				return getValueTypeDefault(val.value);
			} else {
				throw new Error(`Unhandled child value type ${val.type}`);
			}
		};

		node = JSON.parse(JSON.stringify(node));

		switch (node.type) {
			case VALUE_TYPES.ARRAY:
			case VALUE_TYPES.OBJECT: {
				// check if any value needs to be converted
				// NOTE: Arrays are stored with numeric properties
				const obj = node.value;
				Object.keys(obj).forEach((key) => {
					const item = obj[key];
					if (typeof item === "object" && "type" in item) {
						obj[key] = getTypedChildValue(item);
					}
				});
				node.value = obj;
				break;
			}

			case VALUE_TYPES.BINARY: {
				node.value = ascii85.decode(node.value);
				break;
			}

			case VALUE_TYPES.REFERENCE: {
				node.value = new PathReference(node.value);
				break;
			}

			case VALUE_TYPES.STRING: {
				// No action needed
				// node.value = node.value;
				break;
			}

			default:
				throw new Error(`Invalid standalone record value type`); // should never happen
		}

		return node;
	}

	getNodesBy(path: string): StorageNodeInfo[] {
		const pathInfo = PathInfo.get(path);
		return this.nodes.filter((node) => {
			const nodePath = PathInfo.get(node.path);
			return nodePath.path == pathInfo.path || pathInfo.isAncestorOf(nodePath);
		});
	}

	getNodeParentBy(path: string): StorageNodeInfo | undefined {
		const pathInfo = PathInfo.get(path);
		return this.nodes
			.filter((node) => {
				const nodePath = PathInfo.get(node.path);
				return nodePath.path === "" || pathInfo.path === nodePath.path || nodePath.isParentOf(pathInfo);
			})
			.sort((a: StorageNodeInfo, b: StorageNodeInfo): number => {
				const pathA = PathInfo.get(a.path);
				const pathB = PathInfo.get(b.path);
				return pathA.isDescendantOf(pathB.path) ? -1 : pathB.isDescendantOf(pathA.path) ? 1 : 0;
			})
			.shift();
	}

	getKeysBy(path: string): string[] {
		const pathInfo = PathInfo.get(path);
		return this.nodes
			.filter((node) => pathInfo.isParentOf(node.path))
			.map((node) => {
				const key = PathInfo.get(node.path).key;
				return key ? key.toString() : null;
			})
			.filter((keys) => typeof keys === "string") as string[];
	}

	getInfoBy(
		path: string,
		options: {
			include_child_count?: boolean;
		} = {},
	): CustomStorageNodeInfo {
		const pathInfo = PathInfo.get(path);
		const node = this.getNodeParentBy(pathInfo.path);

		const defaultNode = new CustomStorageNodeInfo({
			path: pathInfo.path,
			key: typeof pathInfo.key === "string" ? pathInfo.key : undefined,
			index: typeof pathInfo.key === "number" ? pathInfo.key : undefined,
			type: 0 as NodeValueType,
			exists: false,
			address: undefined,
			created: new Date(),
			modified: new Date(),
			revision: "",
			revision_nr: 0,
		});

		if (!node) {
			return defaultNode;
		}

		const content = this.processReadNodeValue(node.content);
		let value = content.value;

		if (node.path !== pathInfo.path) {
			const keys = [pathInfo.key];
			let currentPath = pathInfo.parent;

			while (currentPath instanceof PathInfo && currentPath.path !== node.path) {
				if (currentPath.key !== null) keys.unshift(currentPath.key);
				currentPath = currentPath.parent;
			}

			keys.forEach((key, index) => {
				if (value === null) {
					return;
				}

				if (key !== null && [VALUE_TYPES.OBJECT, VALUE_TYPES.ARRAY].includes(getValueType(value)) && key in value) {
					value = value[key];
					return;
				}

				value = null;
			});
		}

		const containsChild = this.nodes.findIndex(({ path }) => pathInfo.isAncestorOf(path)) >= 0;
		const isArrayChild = (() => {
			if (containsChild) return false;
			const child = this.nodes.find(({ path }) => pathInfo.isParentOf(path));
			return child ? typeof PathInfo.get(child.path).key === "number" : false;
		})();

		const info = new CustomStorageNodeInfo({
			path: pathInfo.path,
			key: typeof pathInfo.key === "string" ? pathInfo.key : undefined,
			index: typeof pathInfo.key === "number" ? pathInfo.key : undefined,
			type: value !== null ? getValueType(value) : containsChild ? (isArrayChild ? VALUE_TYPES.ARRAY : VALUE_TYPES.OBJECT) : (0 as NodeValueType),
			exists: value !== null || containsChild,
			address: new NodeAddress(node.path),
			created: new Date(content.created) ?? new Date(),
			modified: new Date(content.modified) ?? new Date(),
			revision: content.revision ?? "",
			revision_nr: content.revision_nr ?? 0,
		});

		const prepareValue = (value) => {
			return [VALUE_TYPES.OBJECT, VALUE_TYPES.ARRAY].includes(getValueType(value))
				? Object.keys(value).reduce((result, key) => {
						result[key] = this.getTypedChildValue(value[key]);
						return result;
				  }, {})
				: this.getTypedChildValue(value);
		};

		info.value = value ? prepareValue(value) : [VALUE_TYPES.OBJECT, VALUE_TYPES.ARRAY].includes(info.type as any) ? (info.type === VALUE_TYPES.ARRAY ? [] : {}) : null;

		if (options.include_child_count && containsChild) {
			info.childCount = 0;
			if ([VALUE_TYPES.OBJECT, VALUE_TYPES.ARRAY].includes(info.valueType as any) && info.address) {
				// Get number of children
				info.childCount = value ? Object.keys(value ?? {}).length : 0;
				info.childCount += this.nodes
					.filter(({ path }) => pathInfo.isAncestorOf(path))
					.map(({ path }) => PathInfo.get(path.replace(new RegExp(`^${pathInfo.path}`, "gi"), "")).keys[1] ?? "")
					.filter((path, index, list) => {
						return list.indexOf(path) === index;
					}).length;
			}
		}

		return info;
	}

	writeNode(
		path: string,
		value: any,
		options: {
			merge?: boolean;
			revision?: string;
			currentValue?: any;
			diff?: Types.ValueCompareResult;
		} = {},
	): Node {
		if (!options.merge && this.valueFitsInline(value) && path !== "") {
			throw new Error(`invalid value to store in its own node`);
		} else if (path === "" && (typeof value !== "object" || value instanceof Array)) {
			throw new Error(`Invalid root node value. Must be an object`);
		}

		if (options.merge && typeof options.currentValue === "undefined" && this.isPathExists(path)) {
			options.currentValue = this.exportJson(path).content.value;
		}

		//options.currentValue = options.currentValue ?? this.toJson(path);

		// Check if the value for this node changed, to prevent recursive calls to
		// perform unnecessary writes that do not change any data
		if (typeof options.diff === "undefined" && typeof options.currentValue !== "undefined") {
			options.diff = compareValues(options.currentValue, value);
			if (options.merge && typeof options.diff === "object") {
				options.diff.removed = options.diff.removed.filter((key) => value[key] === null); // Only keep "removed" items that are really being removed by setting to null
				if (([] as any[]).concat(options.diff.changed, options.diff.added, options.diff.removed).length === 0) {
					options.diff = "identical";
				}
			}
		}

		if (options.diff === "identical") {
			return this; // Done!
		}

		//const currentRow = options.currentValue.content;

		// Get info about current node at path
		const currentRow = options.currentValue === null ? null : this.exportJson(path, true, false).content;

		if (options.merge && currentRow) {
			if (currentRow.type === VALUE_TYPES.ARRAY && !(value instanceof Array) && typeof value === "object" && Object.keys(value).some((key) => isNaN(parseInt(key)))) {
				throw new Error(`Cannot merge existing array of path "${path}" with an object`);
			}
			if (value instanceof Array && currentRow.type !== VALUE_TYPES.ARRAY) {
				throw new Error(`Cannot merge existing object of path "${path}" with an array`);
			}
		}

		const pathInfo = PathInfo.get(path);

		const revision = ID.generate();

		const mainNode = {
			type: currentRow && currentRow.type === VALUE_TYPES.ARRAY ? VALUE_TYPES.ARRAY : VALUE_TYPES.OBJECT,
			value: {} as Record<string, any> | string,
		};

		const childNodeValues = {} as Record<string | number, any>;

		if (value instanceof Array) {
			mainNode.type = VALUE_TYPES.ARRAY;
			// Convert array to object with numeric properties
			const obj = {} as Record<number, any>;
			for (let i = 0; i < value.length; i++) {
				obj[i] = value[i];
			}
			value = obj;
		} else if (value instanceof PathReference) {
			mainNode.type = VALUE_TYPES.REFERENCE;
			mainNode.value = value.path;
		} else if (value instanceof ArrayBuffer) {
			mainNode.type = VALUE_TYPES.BINARY;
			mainNode.value = ascii85.encode(value);
		} else if (typeof value === "string") {
			mainNode.type = VALUE_TYPES.STRING;
			mainNode.value = value;
		}

		const currentIsObjectOrArray = currentRow ? [VALUE_TYPES.OBJECT, VALUE_TYPES.ARRAY].includes(currentRow.type) : false;
		const newIsObjectOrArray = [VALUE_TYPES.OBJECT, VALUE_TYPES.ARRAY].includes(mainNode.type);

		const children = {
			current: [] as string[],
			new: [] as string[],
		};

		const isArray = mainNode.type === VALUE_TYPES.ARRAY;

		let currentObject = null;
		if (currentIsObjectOrArray) {
			currentObject = currentRow?.value;
			children.current = Object.keys(currentObject ?? {});
			// if (currentObject instanceof Array) { // ALWAYS FALSE BECAUSE THEY ARE STORED AS OBJECTS WITH NUMERIC PROPERTIES
			//     // Convert array to object with numeric properties
			//     const obj = {};
			//     for (let i = 0; i < value.length; i++) {
			//         obj[i] = value[i];
			//     }
			//     currentObject = obj;
			// }
			if (newIsObjectOrArray) {
				(mainNode.value as any) = currentObject;
			}
		}

		if (newIsObjectOrArray) {
			// Object or array. Determine which properties can be stored in the main node,
			// and which should be stored in their own nodes
			if (!options.merge) {
				// Check which keys are present in the old object, but not in newly given object
				Object.keys(mainNode.value).forEach((key) => {
					if (!(key in value)) {
						// Property that was in old object, is not in new value -> set to null to mark deletion!
						value[key] = null;
					}
				});
			}
			Object.keys(value).forEach((key) => {
				const val = value[key];
				delete (mainNode.value as Record<string, any>)[key]; // key is being overwritten, moved from inline to dedicated, or deleted. TODO: check if this needs to be done SQLite & MSSQL implementations too
				if (val === null) {
					//  || typeof val === 'undefined'
					// This key is being removed
					return;
				} else if (typeof val === "undefined") {
					if (this.settings.removeVoidProperties === true) {
						delete value[key]; // Kill the property in the passed object as well, to prevent differences in stored and working values
						return;
					} else {
						throw new Error(`Property "${key}" has invalid value. Cannot store undefined values. Set removeVoidProperties option to true to automatically remove undefined properties`);
					}
				}
				// Where to store this value?
				if (this.valueFitsInline(val)) {
					// Store in main node
					(mainNode.value as Record<string, any>)[key] = val;
				} else {
					// (mainNode.value as Record<string, any>)[key] = {
					// 	type: VALUE_TYPES.DEDICATED_RECORD,
					// 	value: getNodeValueType(val),
					// 	path: pathInfo.childPath(isArray ? parseInt(key) : key),
					// };
					// Store in child node
					delete (mainNode.value as Record<string, any>)[key];
					childNodeValues[key] = val;
				}
			});

			const original = mainNode.value;
			mainNode.value = {};
			// If original is an array, it'll automatically be converted to an object now
			Object.keys(original).forEach((key) => {
				mainNode.value[key] = this.getTypedChildValue(original[key]);
			});
		}

		if (currentRow) {
			if (currentIsObjectOrArray || newIsObjectOrArray) {
				const keys: string[] = this.getKeysBy(pathInfo.path);

				children.current = children.current.concat(keys).filter((key, i, l) => l.indexOf(key) === i);

				if (newIsObjectOrArray) {
					if (options && options.merge) {
						children.new = children.current.slice();
					}
					Object.keys(value).forEach((key) => {
						if (!children.new.includes(key)) {
							children.new.push(key);
						}
					});
				}

				const changes = {
					insert: children.new.filter((key) => !children.current.includes(key)),
					update: [] as string[],
					delete: options && options.merge ? Object.keys(value).filter((key) => value[key] === null) : children.current.filter((key) => !children.new.includes(key)),
				};
				changes.update = children.new.filter((key) => children.current.includes(key) && !changes.delete.includes(key));

				if (isArray && options.merge && (changes.insert.length > 0 || changes.delete.length > 0)) {
					// deletes or inserts of individual array entries are not allowed, unless it is the last entry:
					// - deletes would cause the paths of following items to change, which is unwanted because the actual data does not change,
					// eg: removing index 3 on array of size 10 causes entries with index 4 to 9 to 'move' to indexes 3 to 8
					// - inserts might introduce gaps in indexes,
					// eg: adding to index 7 on an array of size 3 causes entries with indexes 3 to 6 to go 'missing'
					const newArrayKeys = changes.update.concat(changes.insert);
					const isExhaustive = newArrayKeys.every((k, index, arr) => arr.includes(index.toString()));
					if (!isExhaustive) {
						throw new Error(
							`Elements cannot be inserted beyond, or removed before the end of an array. Rewrite the whole array at path "${path}" or change your schema to use an object collection instead`,
						);
					}
				}

				for (let key in childNodeValues) {
					const keyOrIndex = isArray ? parseInt(key) : key;
					const childDiff = typeof options.diff === "object" ? options.diff.forChild(keyOrIndex) : undefined;
					if (childDiff === "identical") {
						continue;
					}

					const childPath = pathInfo.childPath(keyOrIndex);
					const childValue = childNodeValues[keyOrIndex];

					// Pass current child value to _writeNode
					const currentChildValue =
						typeof options.currentValue === "undefined" // Fixing issue #20
							? undefined
							: options.currentValue !== null && typeof options.currentValue === "object" && keyOrIndex in options.currentValue
							? options.currentValue[keyOrIndex]
							: null;

					this.writeNode(childPath, childValue, {
						revision,
						merge: false,
						currentValue: currentChildValue,
						diff: childDiff,
					});
				}

				// Delete all child nodes that were stored in their own record, but are being removed
				// Also delete nodes that are being moved from a dedicated record to inline
				const movingNodes = newIsObjectOrArray ? keys.filter((key) => key in (mainNode.value as Record<string, any>)) : []; // moving from dedicated to inline value

				const deleteDedicatedKeys = changes.delete.concat(movingNodes);

				for (let key of deleteDedicatedKeys) {
					const keyOrIndex = isArray ? parseInt(key) : key;
					const childPath = pathInfo.childPath(keyOrIndex);
					this.deleteNode(childPath);
				}
			}

			this.deleteNode(pathInfo.path, true);

			this.nodes.push({
				path: pathInfo.path,
				content: {
					type: mainNode.type,
					value: mainNode.value,
					revision: currentRow.revision,
					revision_nr: currentRow.revision_nr + 1,
					created: currentRow.created,
					modified: Date.now(),
				},
			});
		} else {
			for (let key in childNodeValues) {
				const keyOrIndex = isArray ? parseInt(key) : key;
				const childPath = pathInfo.childPath(keyOrIndex);
				const childValue = childNodeValues[keyOrIndex];

				this.writeNode(childPath, childValue, {
					revision,
					merge: false,
					currentValue: null,
				});
			}

			this.deleteNode(pathInfo.path, true);

			this.nodes.push({
				path: pathInfo.path,
				content: {
					type: mainNode.type,
					value: mainNode.value,
					revision: revision,
					revision_nr: 1,
					created: Date.now(),
					modified: Date.now(),
				},
			});
		}

		return this;
	}

	deleteNode(path: string, specificNode: boolean = false): Node {
		const pathInfo = PathInfo.get(path);
		this.nodes.forEach(({ path }, index) => {
			const nodePath = PathInfo.get(path);
			const isPersists = specificNode ? pathInfo.path !== nodePath.path : !pathInfo.isAncestorOf(nodePath) && pathInfo.path !== nodePath.path;
			if (!isPersists) {
				delete this.nodes[index];
			}
		});
		return this;
	}

	setNode(
		path: string,
		value: any,
		options: {
			assert_revision?: string;
		} = {},
	): Node {
		const pathInfo = PathInfo.get(path);

		try {
			if (path === "") {
				if (value === null || typeof value !== "object" || value instanceof Array || value instanceof ArrayBuffer || ("buffer" in value && value.buffer instanceof ArrayBuffer)) {
					throw new Error(`Invalid value for root node: ${value}`);
				}

				this.writeNode("", value, { merge: false });
			} else if (typeof options.assert_revision !== "undefined") {
				const info = this.getInfoBy(path);

				if (info.revision !== options.assert_revision) {
					throw new NodeRevisionError(`revision '${info.revision}' does not match requested revision '${options.assert_revision}'`);
				}

				if (info.address && info.address.path === path && value !== null && !this.valueFitsInline(value)) {
					// Overwrite node
					this.writeNode(path, value, { merge: false });
				} else {
					// Update parent node
					// const lockPath = transaction.moveToParentPath(pathInfo.parentPath);
					// assert(lockPath === pathInfo.parentPath, `transaction.moveToParentPath() did not move to the right parent path of "${path}"`);
					this.writeNode(pathInfo.parentPath, { [pathInfo.key as any]: value }, { merge: true });
				}
			} else {
				// Delegate operation to update on parent node
				// const lockPath = await transaction.moveToParentPath(pathInfo.parentPath);
				// assert(lockPath === pathInfo.parentPath, `transaction.moveToParentPath() did not move to the right parent path of "${path}"`);
				this.updateNode(pathInfo.parentPath, { [pathInfo.key as any]: value });
			}
		} catch (err) {
			throw err;
		}

		return this;
	}

	updateNode(path: string, updates: any): Node {
		if (typeof updates !== "object") {
			throw new Error(`invalid updates argument`); //. Must be a non-empty object or array
		} else if (Object.keys(updates).length === 0) {
			return this; // Nothing to update. Done!
		}

		try {
			const nodeInfo = this.getInfoBy(path);
			const pathInfo = PathInfo.get(path);

			if (nodeInfo.exists && nodeInfo.address && nodeInfo.address.path === path) {
				this.writeNode(path, updates, { merge: true });
			} else if (nodeInfo.exists) {
				// Node exists, but is stored in its parent node.
				// const pathInfo = PathInfo.get(path);
				// const lockPath = transaction.moveToParentPath(pathInfo.parentPath);
				// assert(lockPath === pathInfo.parentPath, `transaction.moveToParentPath() did not move to the right parent path of "${path}"`);
				this.writeNode(pathInfo.parentPath, { [pathInfo.key as any]: updates }, { merge: true });
			} else {
				// The node does not exist, it's parent doesn't have it either. Update the parent instead
				// const lockPath = transaction.moveToParentPath(pathInfo.parentPath);
				// assert(lockPath === pathInfo.parentPath, `transaction.moveToParentPath() did not move to the right parent path of "${path}"`);
				this.updateNode(pathInfo.parentPath, { [pathInfo.key as any]: updates });
			}
		} catch (err) {
			throw err;
		}

		return this;
	}

	importJson(path: string, value: any): Node {
		return this.setNode(path, value);
	}

	static parse(path: string, value: any, options: Partial<NodeSettings> = {}): StorageNodeInfo[] {
		return new Node([], options).writeNode(path, value).getNodesBy(path);
	}

	exportJson(nodes?: StorageNodeInfo[] | string, onlyChildren: boolean = false, includeChildrenDedicated: boolean = true): StorageNodeInfo {
		const byPathRoot: string | undefined = typeof nodes === "string" ? nodes : undefined;

		nodes = typeof nodes === "string" ? this.getNodesBy(nodes) : Array.isArray(nodes) ? nodes : ([nodes] as any);
		nodes = Array.isArray(nodes) ? nodes.filter((node: any = {}) => node && typeof node.path === "string" && "content" in node) : this.nodes;

		let byNodes = nodes.map((node) => {
			node = JSON.parse(JSON.stringify(node));
			node.content = this.processReadNodeValue(node.content);
			return node;
		}) as StorageNodeInfo[];

		let revision = (byNodes[0]?.content ?? {}).revision ?? ID.generate();

		const rootNode: StorageNodeInfo = {
			path: PathInfo.get(byPathRoot ?? "").path,
			content: {
				type: 1,
				value: {},
				revision: revision,
				revision_nr: 1,
				created: Date.now(),
				modified: Date.now(),
			},
		};

		if (byNodes.length === 0) {
			return rootNode;
		}

		byNodes.sort((a: StorageNodeInfo, b: StorageNodeInfo): number => {
			const pathA = PathInfo.get(a.path);
			const pathB = PathInfo.get(b.path);
			return pathA.isDescendantOf(pathB.path) ? 1 : pathB.isDescendantOf(pathA.path) ? -1 : 0;
		});

		if (byPathRoot) {
			const pathRoot = PathInfo.get(byPathRoot);
			const rootExists = byNodes.findIndex(({ path }) => pathRoot.path === path) >= 0;

			if (!rootExists) {
				rootNode.content.revision = byNodes[0]?.content.revision ?? revision;
				rootNode.content.revision_nr = byNodes[0]?.content.revision_nr ?? 1;
				rootNode.content.created = byNodes[0]?.content.created ?? Date.now();
				rootNode.content.modified = byNodes[0]?.content.modified ?? Date.now();
				byNodes.unshift(rootNode);
			}
		}

		const { path, content: targetNode } = byNodes.shift() as StorageNodeInfo;

		const pathInfo = PathInfo.get(path);

		const result = targetNode;

		if (!includeChildrenDedicated) {
			onlyChildren = false;
		}

		if (onlyChildren) {
			byNodes = byNodes
				.filter((node) => {
					const nodePath = PathInfo.get(node.path);
					const isChild = nodePath.isChildOf(path);
					if (!isChild && nodePath.isDescendantOf(path)) {
						const childKeys = PathInfo.get(nodePath.path.replace(new RegExp(`^${path}`, "gi"), "")).keys;
						if (childKeys[1] && !(childKeys[1] in result.value)) {
							result.value[childKeys[1]] = typeof childKeys[2] === "number" ? [] : {};
						}
					}
					return isChild;
				})
				.map((node) => {
					node.content.value = node.content.type === VALUE_TYPES.OBJECT ? {} : node.content.type === VALUE_TYPES.ARRAY ? [] : node.content.value;
					return node;
				})
				.filter((node) => node.content.value !== null);
		}

		const objectToArray = (obj: Record<string, any>) => {
			// Convert object value to array
			const arr = [] as any[];
			Object.keys(obj).forEach((key) => {
				const index = parseInt(key);
				arr[index] = obj[index];
			});
			return arr;
		};

		if (targetNode.type === VALUE_TYPES.ARRAY) {
			result.value = objectToArray(result.value);
		}

		if ([VALUE_TYPES.OBJECT, VALUE_TYPES.ARRAY].includes(targetNode.type)) {
			const targetPathKeys = PathInfo.getPathKeys(path);
			const value = targetNode.value;

			for (let { path: otherPath, content: otherNode } of byNodes) {
				const pathKeys = PathInfo.getPathKeys(otherPath);
				const trailKeys = pathKeys.slice(targetPathKeys.length);
				let parent = value;

				for (let j = 0; j < trailKeys.length; j++) {
					assert(typeof parent === "object", "parent must be an object/array to have children!!");
					const key = trailKeys[j];
					const isLast = j === trailKeys.length - 1;
					const nodeType = isLast ? otherNode.type : typeof trailKeys[j + 1] === "number" ? VALUE_TYPES.ARRAY : VALUE_TYPES.OBJECT;
					let nodeValue: any;

					if (!isLast) {
						nodeValue = nodeType === VALUE_TYPES.OBJECT ? {} : [];
					} else {
						nodeValue = otherNode.value;
						if (nodeType === VALUE_TYPES.ARRAY) {
							nodeValue = objectToArray(nodeValue);
						}
					}

					const mergePossible = key in parent && typeof parent[key] === typeof nodeValue && [VALUE_TYPES.OBJECT, VALUE_TYPES.ARRAY].includes(nodeType);

					if (mergePossible) {
						Object.keys(nodeValue).forEach((childKey) => {
							parent[key][childKey] = nodeValue[childKey];
						});
					} else {
						parent[key] = nodeValue;
					}

					parent = parent[key];
				}
			}
		}

		if (!includeChildrenDedicated && [VALUE_TYPES.OBJECT, VALUE_TYPES.ARRAY].includes(result.type)) {
			Object.keys(result.value).forEach((key) => {
				const val = result.value[key];
				delete (result.value as Record<string, any>)[key];
				if (val === null || typeof val === "undefined") {
					return;
				}
				if (this.valueFitsInline(val)) {
					(result.value as Record<string, any>)[key] = val;
				} else {
					delete (result.value as Record<string, any>)[key];
				}
			});
		}

		return {
			path: pathInfo.path,
			content: result,
		};
	}

	static toJson(nodes: StorageNodeInfo[], onlyChildren: boolean = false, options: Partial<NodeSettings> = {}): StorageNodeInfo {
		return new Node([], options).exportJson(nodes, onlyChildren);
	}
}
