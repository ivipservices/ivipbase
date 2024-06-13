import { PathInfo } from "ivipbase-core";
import { NodeValueType, getValueTypeName } from "./utils";

export class NodeAddress {
	constructor(public readonly path: string) {}

	toString() {
		return `"/${this.path}"`;
	}

	/**
	 * Compares this address to another address
	 */
	equals(address: NodeAddress) {
		return PathInfo.get(this.path).equals(address.path);
	}
}

export class NodeInfo {
	path?: string;
	type?: NodeValueType;
	index?: number;
	key?: string;
	exists?: boolean;
	/** TODO: Move this to BinaryNodeInfo */
	address?: NodeAddress | null;
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
				this.key = pathInfo.key as any;
			}
		}
		if (typeof this.exists === "undefined") {
			this.exists = true;
		}
	}

	get valueType() {
		return this.type ?? -1;
	}

	get valueTypeName() {
		return getValueTypeName(this.valueType);
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

export class CustomStorageNodeInfo extends NodeInfo {
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

type StorageNodeValue =
	| { type: 0; value: null }
	| { type: 1; value: object }
	| { type: 2; value: any[] }
	| { type: 3; value: number }
	| { type: 4; value: boolean }
	| { type: 5; value: string }
	| { type: 7; value: bigint }
	| { type: 6; value: number }
	| { type: 8; value: typeof Uint8Array };

/** Interface for metadata combined with a stored value */
export type StorageNode = {
	/** cuid (time sortable revision id). Nodes stored in the same operation share this id */
	revision: string;
	/** Number of revisions, starting with 1. Resets to 1 after deletion and recreation */
	revision_nr: number;
	/** Creation date/time in ms since epoch UTC */
	created: number;
	/** Last modification date/time in ms since epoch UTC */
	modified: number;
	/** Type of the node's value. 1=object, 2=array, 3=number, 4=boolean, 5=string, 6=date, 7=reserved, 8=binary, 9=reference */
	type: NodeValueType;
	/** only Object, Array, large string and binary values. */
	// value: StorageNodeValue["value"];
} & StorageNodeValue;

export interface StorageNodeInfo {
	path: string;
	content: StorageNode;
}

export type NodesPending = StorageNodeInfo & { type?: "SET" | "UPDATE" | "VERIFY" };
