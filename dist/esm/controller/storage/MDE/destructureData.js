import { ID, PathInfo } from "ivipbase-core";
import { VALUE_TYPES, getTypedChildValue, getValueType, nodeValueTypes, valueFitsInline } from "./utils.js";
import { joinObjects } from "../../../utils/index.js";
export default function destructureData(type, path, data, options = {}) {
    let result = options?.previous_result ?? [];
    let pathInfo = PathInfo.get(path);
    const revision = options?.assert_revision ?? ID.generate();
    options.assert_revision = revision;
    options.include_checks = typeof options.include_checks === "boolean" ? options.include_checks : true;
    const resolveConflict = (node) => {
        const comparison = result.find((n) => PathInfo.get(n.path).equals(node.path));
        if (!comparison) {
            result.push(node);
            return;
        }
        else if (node.type === "VERIFY") {
            return;
        }
        result = result.filter((n) => !PathInfo.get(n.path).equals(node.path));
        if (comparison.content.type !== node.content.type) {
            result.push(node);
            return;
        }
        if (comparison.type === "VERIFY") {
            comparison.type = "UPDATE";
        }
        node.content.value = joinObjects(comparison.content.value, node.content.value);
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
    let valueType = getValueType(value);
    if (typeof value === "object" && value !== null) {
        value = {};
        valueType = Array.isArray(data) ? VALUE_TYPES.ARRAY : VALUE_TYPES.OBJECT;
        for (let key in data) {
            if (valueType === VALUE_TYPES.OBJECT && valueFitsInline(data[key], this.settings)) {
                value[key] = getTypedChildValue(data[key]);
                if (value[key] === null) {
                    result = destructureData.apply(this, [type, PathInfo.get([path, valueType === VALUE_TYPES.OBJECT ? key : parseInt(key)]).path, null, { ...options, previous_result: result }]);
                }
                continue;
            }
            result = destructureData.apply(this, [type, PathInfo.get([path, valueType === VALUE_TYPES.OBJECT ? key : parseInt(key)]).path, data[key], { ...options, previous_result: result }]);
        }
    }
    const parentPath = PathInfo.get(pathInfo.parentPath);
    const isObjectFitsInline = [VALUE_TYPES.ARRAY, VALUE_TYPES.OBJECT].includes(valueType)
        ? result.findIndex((n) => {
            return PathInfo.get(n.path).isChildOf(pathInfo) || PathInfo.get(n.path).isDescendantOf(pathInfo);
        }) < 0 && Object.keys(value).length === 0
        : valueFitsInline(value, this.settings);
    if (parentPath.path && parentPath.path.trim() !== "") {
        const parentNode = result.find((node) => PathInfo.get(node.path).equals(parentPath)) ?? {
            path: parentPath.path,
            type: "UPDATE",
            content: {
                type: (typeof pathInfo.key === "number" ? nodeValueTypes.ARRAY : nodeValueTypes.OBJECT),
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
        if (parentNode.content.type === nodeValueTypes.OBJECT || parentNode.content.type === nodeValueTypes.ARRAY) {
            parentNode.content.value[pathInfo.key] = isObjectFitsInline ? getTypedChildValue(value) : null;
            result = result.filter((node) => !PathInfo.get(node.path).equals(parentPath));
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
        const pathInfo = PathInfo.get(node.path);
        const parentNode = result.find((n) => PathInfo.get(n.path).isParentOf(node.path)) ?? verifyNodes.find((n) => PathInfo.get(n.path).isParentOf(node.path));
        if (!parentNode && pathInfo.parentPath && pathInfo.parentPath.trim() !== "" && include_checks) {
            const verifyNode = {
                path: pathInfo.parentPath,
                type: "VERIFY",
                content: {
                    type: (typeof pathInfo.key === "number" ? nodeValueTypes.ARRAY : nodeValueTypes.OBJECT),
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
//# sourceMappingURL=destructureData.js.map