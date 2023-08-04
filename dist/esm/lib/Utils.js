"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneObject = exports.removeTrailingChar = exports.merge = exports.encodeURIComponent = void 0;
const PartialArray_1 = require("./PartialArray.js");
const encodeURIComponent = (value) => {
    const hexChars = '0123456789ABCDEF';
    let encodedValue = '';
    for (let i = 0; i < value.length; i++) {
        const char = value.charAt(i);
        if (/[A-Za-z0-9\-_.~]/.test(char) || ['!', '\'', '(', ')', '*', ','].includes(char)) {
            encodedValue += char;
        }
        else {
            const charCode = char.charCodeAt(0);
            encodedValue += `%${hexChars[(charCode >> 4) & 0x0f]}${hexChars[charCode & 0x0f]}`;
        }
    }
    return encodedValue;
};
exports.encodeURIComponent = encodeURIComponent;
const merge = (...arrays) => {
    const destination = {};
    arrays.forEach(function (source) {
        let prop;
        for (prop in source) {
            if (prop in destination && destination[prop] === null) {
                destination[prop] = source[prop];
            }
            else if (prop in destination && Array.isArray(destination[prop])) {
                // Concat Arrays
                destination[prop] = destination[prop].concat(source[prop]);
            }
            else if (prop in destination && typeof destination[prop] === 'object') {
                // Merge Objects
                destination[prop] = (0, exports.merge)(destination[prop], source[prop]);
            }
            else {
                // Set new values
                destination[prop] = source[prop];
            }
        }
    });
    return destination;
};
exports.merge = merge;
const removeTrailingChar = (dataPath, trailing) => {
    if (dataPath.length > 1 && dataPath.endsWith(trailing)) {
        return dataPath.substring(0, dataPath.length - 1);
    }
    return dataPath;
};
exports.removeTrailingChar = removeTrailingChar;
function cloneObject(original, stack) {
    const checkAndFixTypedArray = (obj) => {
        if (obj !== null &&
            typeof obj === 'object' &&
            typeof obj.constructor === 'function' &&
            typeof obj.constructor.name === 'string' &&
            [
                'Buffer',
                'Uint8Array',
                'Int8Array',
                'Uint16Array',
                'Int16Array',
                'Uint32Array',
                'Int32Array',
                'BigUint64Array',
                'BigInt64Array',
            ].includes(obj.constructor.name)) {
            // FIX for typed array being converted to objects with numeric properties:
            // Convert Buffer or TypedArray to ArrayBuffer
            obj = obj.buffer.slice(obj.byteOffset, obj.byteOffset + obj.byteLength);
        }
        return obj;
    };
    original = checkAndFixTypedArray(original);
    if (typeof original !== 'object' ||
        original === null ||
        original instanceof Date ||
        original instanceof ArrayBuffer ||
        original instanceof RegExp) {
        return original;
    }
    const cloneValue = (val) => {
        if (stack.indexOf(val) >= 0) {
            throw new ReferenceError('object contains a circular reference');
        }
        val = checkAndFixTypedArray(val);
        if (val === null || val instanceof Date || val instanceof ArrayBuffer || val instanceof RegExp) {
            // || val instanceof ID
            return val;
        }
        else if (typeof val === 'object') {
            stack.push(val);
            val = cloneObject(val, stack);
            stack.pop();
            return val;
        }
        else {
            return val; // Anything other can just be copied
        }
    };
    if (typeof stack === 'undefined') {
        stack = [original];
    }
    const clone = original instanceof Array ? [] : original instanceof PartialArray_1.PartialArray ? new PartialArray_1.PartialArray() : {};
    Object.keys(original).forEach((key) => {
        const val = original[key];
        if (typeof val === 'function') {
            return; // skip functions
        }
        clone[key] = cloneValue(val);
    });
    return clone;
}
exports.cloneObject = cloneObject;
//# sourceMappingURL=Utils.js.map