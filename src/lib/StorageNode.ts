import { ICustomStorageNode, ICustomStorageNodeMetaData } from "acebase";
export { getValueType, getNodeValueType, getValueTypeName, NodeValueType, VALUE_TYPES } from "acebase/dist/types/node-value-types";

/** Interface for metadata being stored for nodes */
export class StorageNodeMetaData extends ICustomStorageNodeMetaData {}

/** Interface for metadata combined with a stored value */
export class StorageNode extends ICustomStorageNode {}
