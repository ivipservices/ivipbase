import { NodeValueType } from "./";
import { NodeAddress } from "./NodeAddress";
export default class NodeInfo {
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
//# sourceMappingURL=NodeInfo.d.ts.map