"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ivipbase_core_1 = require("ivipbase-core");
const utils_1 = require("./utils");
function destructureData(type, path, data, options = {}) {
    var _a, _b;
    let result = (_a = options === null || options === void 0 ? void 0 : options.previous_result) !== null && _a !== void 0 ? _a : [];
    let pathInfo = ivipbase_core_1.PathInfo.get(path);
    const revision = (_b = options === null || options === void 0 ? void 0 : options.assert_revision) !== null && _b !== void 0 ? _b : ivipbase_core_1.ID.generate();
    options.assert_revision = revision;
    options.include_checks = typeof options.include_checks === "boolean" ? options.include_checks : true;
    if (options.include_checks) {
        while (typeof pathInfo.parentPath === "string" && pathInfo.parentPath.trim() !== "") {
            const node = {
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
            result.push(node);
            pathInfo = ivipbase_core_1.PathInfo.get(pathInfo.parentPath);
        }
    }
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
exports.default = destructureData;
//# sourceMappingURL=destructureData.js.map