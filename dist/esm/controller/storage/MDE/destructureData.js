import { ID, PathInfo } from "ivipbase-core";
import { VALUE_TYPES, getTypedChildValue, getValueType, nodeValueTypes, valueFitsInline } from "./utils.js";
export default function destructureData(type, path, data, options = {}) {
    let result = options?.previous_result ?? [];
    let pathInfo = PathInfo.get(path);
    const revision = options?.assert_revision ?? ID.generate();
    options.assert_revision = revision;
    options.include_checks = typeof options.include_checks === "boolean" ? options.include_checks : true;
    if (options.include_checks) {
        while (typeof pathInfo.parentPath === "string" && pathInfo.parentPath.trim() !== "") {
            const node = {
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
            result.push(node);
            pathInfo = PathInfo.get(pathInfo.parentPath);
        }
    }
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
    const node = {
        path,
        type,
        content: {
            type: valueType,
            value,
            revision,
            revision_nr: 1,
            created: Date.now(),
            modified: Date.now(),
        },
    };
    result.push(node);
    return result;
}
//# sourceMappingURL=destructureData.js.map