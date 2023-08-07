import { ICustomStorageNode, ICustomStorageNodeMetaData } from "acebase";
export * from "acebase/dist/types/node-value-types";
import { PathInfo } from "./PathInfo";
import { PathReference } from "acebase-core";

export class NodeNotFoundError extends Error {}
export class NodeRevisionError extends Error {}

const nodeValueTypes = {
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
	REFERENCE: 9, // Absolute or relative path to other node
	// Future:
	// DOCUMENT: 10,     // JSON/XML documents that are contained entirely within the stored node
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
		// case VALUE_TYPES.DOCUMENT: return 'document';
		default:
			"unknown";
	}
}

export function getNodeValueType(value: unknown) {
	if (value instanceof Array) {
		return VALUE_TYPES.ARRAY;
	} else if (value instanceof PathReference) {
		return VALUE_TYPES.REFERENCE;
	} else if (value instanceof ArrayBuffer) {
		return VALUE_TYPES.BINARY;
	}
	// TODO else if (value instanceof DataDocument) { return VALUE_TYPES.DOCUMENT; }
	else if (typeof value === "string") {
		return VALUE_TYPES.STRING;
	} else if (typeof value === "object") {
		return VALUE_TYPES.OBJECT;
	} else if (typeof value === "bigint") {
		return VALUE_TYPES.BIGINT;
	}
	throw new Error(`Invalid value for standalone node: ${value}`);
}

export function getValueType(value: unknown) {
	if (value instanceof Array) {
		return VALUE_TYPES.ARRAY;
	} else if (value instanceof PathReference) {
		return VALUE_TYPES.REFERENCE;
	} else if (value instanceof ArrayBuffer) {
		return VALUE_TYPES.BINARY;
	} else if (value instanceof Date) {
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
	throw new Error(`Unknown value type: ${value}`);
}

export class NodeAddress {
	constructor(public readonly path: string) {}

	toString() {
		return `"/${this.path}"`;
	}

	/**
	 * Compares this address to another address
	 */
	equals(address: NodeAddress) {
		return this.path === address.path;
	}
}

export class RemovedNodeAddress extends NodeAddress {
	constructor(path: string) {
		super(path);
	}

	toString() {
		return `"/${this.path}" (removed)`;
	}

	/**
	 * Compares this address to another address
	 */
	equals(address: NodeAddress): boolean {
		return address instanceof RemovedNodeAddress && this.path === address.path;
	}
}

export class NodeInfo {
	path?: string;
	type?: NodeValueType;
	index?: number;
	key?: string | null;
	exists?: boolean;
	/** TODO: Move this to BinaryNodeInfo */
	address?: NodeAddress;
	value?: any;
	childCount?: number;

	constructor(info: Partial<NodeInfo>) {
		this.path = info.path;
		this.type = info.type;
		this.index = info.index;
		this.key = info.key;
		this.exists = info.exists;
		this.address = info.address;
		this.value = info.value;
		this.childCount = info.childCount;

		if (typeof this.path === "string" && typeof this.key === "undefined" && typeof this.index === "undefined") {
			const pathInfo = PathInfo.get(this.path);
			if (typeof pathInfo.key === "number") {
				this.index = pathInfo.key;
			} else {
				this.key = pathInfo.key;
			}
		}
		if (typeof this.exists === "undefined") {
			this.exists = true;
		}
	}

	get valueType() {
		return this.type;
	}

	get valueTypeName() {
		return getValueTypeName(this.valueType as any);
	}

	toString() {
		if (!this.exists) {
			return `"${this.path}" doesn't exist`;
		}
		if (this.address) {
			return `"${this.path}" is ${this.valueTypeName} stored at ${this.address.toString()}`;
		} else {
			return `"${this.path}" is ${this.valueTypeName} with value ${this.value}`;
		}
	}
}

/** Interface for metadata being stored for nodes */
export class StorageNodeMetaData extends ICustomStorageNodeMetaData {}

/** Interface for metadata combined with a stored value */
export class StorageNode extends ICustomStorageNode {}
