import { NodeValueType } from "./utils";
export declare class NodeAddress {
    readonly path: string;
    constructor(path: string);
    toString(): string;
    /**
     * Compares this address to another address
     */
    equals(address: NodeAddress): boolean;
}
export declare class NodeInfo {
    path?: string;
    type?: NodeValueType;
    index?: number;
    key?: string;
    exists?: boolean;
    /** TODO: Move this to BinaryNodeInfo */
    address?: NodeAddress;
    value?: any;
    childCount?: number;
    constructor(info: Partial<NodeInfo>);
    get valueType(): NodeValueType | undefined;
    get valueTypeName(): "array" | "binary" | "boolean" | "date" | "number" | "object" | "reference" | "string" | "bigint" | "dedicated_record" | undefined;
    toString(): string;
}
export declare class CustomStorageNodeInfo extends NodeInfo {
    address?: NodeAddress;
    revision: string;
    revision_nr: number;
    created: Date;
    modified: Date;
    constructor(info: Omit<CustomStorageNodeInfo, "valueType" | "valueTypeName">);
}
type StorageNodeValue = {
    type: 0;
    value: null;
} | {
    type: 1;
    value: object;
} | {
    type: 2;
    value: any[];
} | {
    type: 3;
    value: number;
} | {
    type: 4;
    value: boolean;
} | {
    type: 5;
    value: string;
} | {
    type: 7;
    value: bigint;
} | {
    type: 6;
    value: number;
} | {
    type: 8;
    value: typeof Uint8Array;
};
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
} & StorageNodeValue;
export interface StorageNodeInfo {
    path: string;
    content: StorageNode;
}
export type NodesPending = StorageNodeInfo & {
    type?: "SET" | "UPDATE" | "VERIFY";
};
export {};
//# sourceMappingURL=NodeInfo.d.ts.map