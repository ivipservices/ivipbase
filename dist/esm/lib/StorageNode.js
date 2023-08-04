"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageNode = exports.StorageNodeMetaData = exports.VALUE_TYPES = exports.getValueTypeName = exports.getNodeValueType = exports.getValueType = void 0;
const acebase_1 = require("acebase");
var node_value_types_1 = require("acebase/dist/types/node-value-types");
Object.defineProperty(exports, "getValueType", { enumerable: true, get: function () { return node_value_types_1.getValueType; } });
Object.defineProperty(exports, "getNodeValueType", { enumerable: true, get: function () { return node_value_types_1.getNodeValueType; } });
Object.defineProperty(exports, "getValueTypeName", { enumerable: true, get: function () { return node_value_types_1.getValueTypeName; } });
Object.defineProperty(exports, "VALUE_TYPES", { enumerable: true, get: function () { return node_value_types_1.VALUE_TYPES; } });
/** Interface for metadata being stored for nodes */
class StorageNodeMetaData extends acebase_1.ICustomStorageNodeMetaData {
}
exports.StorageNodeMetaData = StorageNodeMetaData;
/** Interface for metadata combined with a stored value */
class StorageNode extends acebase_1.ICustomStorageNode {
}
exports.StorageNode = StorageNode;
//# sourceMappingURL=StorageNode.js.map