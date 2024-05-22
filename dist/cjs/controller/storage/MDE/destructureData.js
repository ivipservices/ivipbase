"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ivipbase_core_1 = require("ivipbase-core");
const utils_1 = require("./utils");
const utils_2 = require("../../../utils");
function destructureData(type, path, data, options = {}) {
    var _a, _b, _c, _d;
    let result = (_a = options === null || options === void 0 ? void 0 : options.previous_result) !== null && _a !== void 0 ? _a : [];
    let pathInfo = ivipbase_core_1.PathInfo.get(path);
    const revision = (_b = options === null || options === void 0 ? void 0 : options.assert_revision) !== null && _b !== void 0 ? _b : ivipbase_core_1.ID.generate();
    options.assert_revision = revision;
    options.include_checks = typeof options.include_checks === "boolean" ? options.include_checks : true;
    const resolveConflict = (node) => {
        const comparison = result.find((n) => ivipbase_core_1.PathInfo.get(n.path).equals(node.path));
        if (!comparison) {
            result.push(node);
            return;
        }
        else if (node.type === "VERIFY") {
            return;
        }
        result = result.filter((n) => !ivipbase_core_1.PathInfo.get(n.path).equals(node.path));
        if (comparison.content.type !== node.content.type) {
            result.push(node);
            return;
        }
        if (comparison.type === "VERIFY") {
            comparison.type = "UPDATE";
        }
        node.content.value = (0, utils_2.joinObjects)(comparison.content.value, node.content.value);
        result.push(node);
    };
    const include_checks = options.include_checks;
    // if (options.include_checks) {
    // 	while (typeof pathInfo.parentPath === "string" && pathInfo.parentPath.trim() !== "") {
    // 		const node: NodesPending = {
    // 			path: pathInfo.parentPath,
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
    // 		resolveConflict(node);
    // 		pathInfo = PathInfo.get(pathInfo.parentPath);
    // 	}
    // }
    options.include_checks = false;
    let value = data;
    let valueType = (0, utils_1.getValueType)(value);
    if (typeof value === "object" && value !== null) {
        value = {};
        valueType = Array.isArray(data) ? utils_1.VALUE_TYPES.ARRAY : utils_1.VALUE_TYPES.OBJECT;
        for (let key in data) {
            if (valueType === utils_1.VALUE_TYPES.OBJECT && (0, utils_1.valueFitsInline)(data[key], this.settings)) {
                value[key] = (0, utils_1.getTypedChildValue)(data[key]);
                if (value[key] === null) {
                    result = destructureData.apply(this, [type, ivipbase_core_1.PathInfo.get([path, valueType === utils_1.VALUE_TYPES.OBJECT ? key : parseInt(key)]).path, null, Object.assign(Object.assign({}, options), { previous_result: result })]);
                }
                continue;
            }
            result = destructureData.apply(this, [type, ivipbase_core_1.PathInfo.get([path, valueType === utils_1.VALUE_TYPES.OBJECT ? key : parseInt(key)]).path, data[key], Object.assign(Object.assign({}, options), { previous_result: result })]);
        }
    }
    const parentPath = ivipbase_core_1.PathInfo.get(pathInfo.parentPath);
    const isObjectFitsInline = [utils_1.VALUE_TYPES.ARRAY, utils_1.VALUE_TYPES.OBJECT].includes(valueType)
        ? result.findIndex((n) => {
            return ivipbase_core_1.PathInfo.get(n.path).isChildOf(pathInfo) || ivipbase_core_1.PathInfo.get(n.path).isDescendantOf(pathInfo);
        }) < 0 && Object.keys(value).length === 0
        : (0, utils_1.valueFitsInline)(value, this.settings);
    if (parentPath.path && parentPath.path.trim() !== "") {
        const parentNode = (_c = result.find((node) => ivipbase_core_1.PathInfo.get(node.path).equals(parentPath))) !== null && _c !== void 0 ? _c : {
            path: parentPath.path,
            type: "UPDATE",
            content: {
                type: (typeof pathInfo.key === "number" ? utils_1.nodeValueTypes.ARRAY : utils_1.nodeValueTypes.OBJECT),
                value: {},
                revision,
                revision_nr: 1,
                created: Date.now(),
                modified: Date.now(),
            },
        };
        parentNode.type = "UPDATE";
        if (parentNode.content.value === null || typeof parentNode.content.value !== "object") {
            parentNode.content.value = {};
        }
        if (parentNode.content.type === utils_1.nodeValueTypes.OBJECT || parentNode.content.type === utils_1.nodeValueTypes.ARRAY) {
            parentNode.content.value[pathInfo.key] = isObjectFitsInline ? (0, utils_1.getTypedChildValue)(value) : null;
            result = result.filter((node) => !ivipbase_core_1.PathInfo.get(node.path).equals(parentPath));
            resolveConflict(parentNode);
        }
    }
    const node = {
        path,
        type: isObjectFitsInline ? "SET" : type,
        content: {
            type: valueType,
            value: isObjectFitsInline ? null : value,
            revision,
            revision_nr: 1,
            created: Date.now(),
            modified: Date.now(),
        },
    };
    resolveConflict(node);
    const verifyNodes = [];
    for (const node of result) {
        const pathInfo = ivipbase_core_1.PathInfo.get(node.path);
        const parentNode = (_d = result.find((n) => ivipbase_core_1.PathInfo.get(n.path).isParentOf(node.path))) !== null && _d !== void 0 ? _d : verifyNodes.find((n) => ivipbase_core_1.PathInfo.get(n.path).isParentOf(node.path));
        if (!parentNode && pathInfo.parentPath && pathInfo.parentPath.trim() !== "" && include_checks) {
            const verifyNode = {
                path: pathInfo.parentPath,
                type: "VERIFY",
                content: {
                    type: (typeof pathInfo.key === "number" ? utils_1.nodeValueTypes.ARRAY : utils_1.nodeValueTypes.OBJECT),
                    value: {},
                    revision,
                    revision_nr: 1,
                    created: Date.now(),
                    modified: Date.now(),
                },
            };
            verifyNodes.push(verifyNode);
        }
    }
    return verifyNodes.concat(result);
}
exports.default = destructureData;
//# sourceMappingURL=destructureData.js.map