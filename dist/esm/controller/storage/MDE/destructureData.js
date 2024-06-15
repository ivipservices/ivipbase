import { ID, PathInfo } from "ivipbase-core";
import { getTypedChildValue, getValueType, nodeValueTypes, valueFitsInline } from "./utils.js";
const extactNodes = (type, obj, path = [], nodes = [], options) => {
    const revision = options?.assert_revision ?? ID.generate();
    const length = nodes.push({
        path: PathInfo.get(path).path,
        type: nodes.length <= 0 ? "UPDATE" : type,
        content: {
            type: getValueType(obj),
            value: typeof obj === "object" ? (Array.isArray(obj) ? [] : {}) : obj,
            revision,
            revision_nr: 1,
            created: Date.now(),
            modified: Date.now(),
        },
    });
    const parentValue = nodes[length - 1];
    for (let k in obj) {
        const fitsInline = valueFitsInline(obj[k], options);
        if (parentValue && fitsInline) {
            if (parentValue.type === "VERIFY") {
                parentValue.type = "UPDATE";
            }
            if (parentValue.content.value === null) {
                parentValue.content.value = {};
            }
            parentValue.content.value[k] = getTypedChildValue(obj[k]);
        }
        if (typeof obj[k] === "object" && !fitsInline) {
            extactNodes(type, obj[k], [...path, k], nodes, options);
        }
        else {
            nodes.push({
                path: PathInfo.get([...path, k]).path,
                type: type,
                content: {
                    type: getValueType(obj),
                    value: fitsInline ? null : typeof obj[k] === "object" ? (Array.isArray(obj[k]) ? [] : {}) : obj[k],
                    revision,
                    revision_nr: 1,
                    created: Date.now(),
                    modified: Date.now(),
                },
            });
        }
    }
    return nodes;
};
export default function destructureData(type, path, data, options = {
    maxInlineValueSize: 200,
}) {
    let result = options?.previous_result ?? [];
    let pathInfo = PathInfo.get(path);
    const revision = options?.assert_revision ?? ID.generate();
    options.assert_revision = revision;
    options.include_checks = typeof options.include_checks === "boolean" ? options.include_checks : true;
    if (valueFitsInline(data, options)) {
        data = {
            [pathInfo.key]: data,
        };
        pathInfo = pathInfo.parent;
    }
    if (options.include_checks) {
        let parentPath = pathInfo.parent;
        while (parentPath && parentPath.path.trim() !== "") {
            const node = {
                path: parentPath.path,
                type: "VERIFY",
                content: {
                    type: (typeof parentPath.key === "number" ? nodeValueTypes.ARRAY : nodeValueTypes.OBJECT),
                    value: {},
                    revision,
                    revision_nr: 1,
                    created: Date.now(),
                    modified: Date.now(),
                },
            };
            result.push(node);
            parentPath = parentPath.parent;
        }
    }
    extactNodes(type, data, pathInfo.keys, result, options);
    return result;
    // const resolveConflict = (node: NodesPending) => {
    // 	const comparison = result.find((n) => PathInfo.get(n.path).equals(node.path));
    // 	if (!comparison) {
    // 		result.push(node);
    // 		return;
    // 	} else if (node.type === "VERIFY") {
    // 		return;
    // 	}
    // 	result = result.filter((n) => !PathInfo.get(n.path).equals(node.path));
    // 	if (comparison.content.type !== node.content.type) {
    // 		result.push(node);
    // 		return;
    // 	}
    // 	if (comparison.type === "VERIFY") {
    // 		comparison.type = "UPDATE";
    // 	}
    // 	node.content.value = joinObjects(comparison.content.value, node.content.value);
    // 	result.push(node);
    // };
    // const include_checks = options.include_checks;
    // // if (options.include_checks) {
    // // 	while (typeof pathInfo.parentPath === "string" && pathInfo.parentPath.trim() !== "") {
    // // 		const node: NodesPending = {
    // // 			path: pathInfo.parentPath,
    // // 			type: "VERIFY",
    // // 			content: {
    // // 				type: (typeof pathInfo.key === "number" ? nodeValueTypes.ARRAY : nodeValueTypes.OBJECT) as any,
    // // 				value: {},
    // // 				revision,
    // // 				revision_nr: 1,
    // // 				created: Date.now(),
    // // 				modified: Date.now(),
    // // 			},
    // // 		};
    // // 		resolveConflict(node);
    // // 		pathInfo = PathInfo.get(pathInfo.parentPath);
    // // 	}
    // // }
    // options.include_checks = false;
    // let value = data;
    // let valueType = getValueType(value);
    // if (valueType === VALUE_TYPES.OBJECT || valueType === VALUE_TYPES.ARRAY) {
    // 	value = {};
    // 	valueType = Array.isArray(data) ? VALUE_TYPES.ARRAY : VALUE_TYPES.OBJECT;
    // 	for (let key in data) {
    // 		if (valueType === VALUE_TYPES.OBJECT && valueFitsInline(data[key], settings)) {
    // 			value[key] = getTypedChildValue(data[key]);
    // 			if (value[key] === null) {
    // 				result = destructureData(type, PathInfo.get([path, valueType === VALUE_TYPES.OBJECT ? key : parseInt(key)]).path, null, { ...options, previous_result: result }, settings);
    // 			}
    // 			continue;
    // 		}
    // 		result = destructureData(type, PathInfo.get([path, valueType === VALUE_TYPES.OBJECT ? key : parseInt(key)]).path, data[key], { ...options, previous_result: result }, settings);
    // 	}
    // }
    // const parentPath = PathInfo.get(pathInfo.parentPath as any);
    // const isObjectFitsInline = [VALUE_TYPES.ARRAY, VALUE_TYPES.OBJECT].includes(valueType as any)
    // 	? result.findIndex((n) => {
    // 			return PathInfo.get(n.path).isChildOf(pathInfo) || PathInfo.get(n.path).isDescendantOf(pathInfo);
    // 	  }) < 0 && Object.keys(value).length === 0
    // 	: valueFitsInline(value, settings);
    // if (parentPath.path && parentPath.path.trim() !== "") {
    // 	const parentNode: NodesPending = result.find((node) => PathInfo.get(node.path).equals(parentPath)) ?? {
    // 		path: parentPath.path,
    // 		type: "UPDATE",
    // 		content: {
    // 			type: (typeof pathInfo.key === "number" ? nodeValueTypes.ARRAY : nodeValueTypes.OBJECT) as any,
    // 			value: {},
    // 			revision,
    // 			revision_nr: 1,
    // 			created: Date.now(),
    // 			modified: Date.now(),
    // 		},
    // 	};
    // 	parentNode.type = "UPDATE";
    // 	if (parentNode.content.value === null || typeof parentNode.content.value !== "object") {
    // 		parentNode.content.value = {};
    // 	}
    // 	if (parentNode.content.type === nodeValueTypes.OBJECT || parentNode.content.type === nodeValueTypes.ARRAY) {
    // 		(parentNode.content.value as any)[pathInfo.key as string | number] = isObjectFitsInline ? getTypedChildValue(value) : null;
    // 		result = result.filter((node) => !PathInfo.get(node.path).equals(parentPath));
    // 		resolveConflict(parentNode);
    // 	}
    // }
    // const node: NodesPending = {
    // 	path,
    // 	type: isObjectFitsInline ? "SET" : type,
    // 	content: {
    // 		type: valueType as any,
    // 		value: isObjectFitsInline ? null : value,
    // 		revision,
    // 		revision_nr: 1,
    // 		created: Date.now(),
    // 		modified: Date.now(),
    // 	},
    // };
    // resolveConflict(node);
    // const verifyNodes: NodesPending[] = [];
    // for (const node of result) {
    // 	const pathInfo = PathInfo.get(node.path);
    // 	const parentNode = result.find((n) => PathInfo.get(n.path).isParentOf(node.path)) ?? verifyNodes.find((n) => PathInfo.get(n.path).isParentOf(node.path));
    // 	if (!parentNode && pathInfo.parentPath && pathInfo.parentPath.trim() !== "" && include_checks) {
    // 		const verifyNode: NodesPending = {
    // 			path: pathInfo.parentPath as any,
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
    // 		verifyNodes.push(verifyNode);
    // 	}
    // }
    // return verifyNodes.concat(result).map((node) => {
    // 	node.path = node.path.replace(/\/+$/g, "");
    // 	return node;
    // });
}
//# sourceMappingURL=destructureData.js.map