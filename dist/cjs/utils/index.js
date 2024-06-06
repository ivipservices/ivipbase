"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDate = exports.getExtension = exports.sanitizeEmailPrefix = exports.replaceUndefined = exports.joinObjects = exports.removeNulls = exports.pathValueToObject = exports.assert = exports.Mime = void 0;
const ivipbase_core_1 = require("ivipbase-core");
__exportStar(require("./base64"), exports);
exports.Mime = __importStar(require("./Mime"));
/**
 * Substituição para console.assert, lança um erro se a condição não for atendida.
 * @param condition Condição 'truthy'
 * @param error Mensagem de erro opcional
 */
function assert(condition, error) {
    if (!condition) {
        throw new Error(`Asserção falhou: ${error !== null && error !== void 0 ? error : "verifique seu código"}`);
    }
}
exports.assert = assert;
function pathValueToObject(dataPath, currentPath, value) {
    const result = value;
    const pathInfo = ivipbase_core_1.PathInfo.get(dataPath);
    const currentPathInfo = ivipbase_core_1.PathInfo.get(currentPath);
    const currentKeys = currentPathInfo.pathKeys.slice(currentPathInfo.pathKeys.findIndex((k) => !pathInfo.pathKeys.includes(k)));
    for (let k of currentKeys) {
    }
    return result;
}
exports.pathValueToObject = pathValueToObject;
function removeNulls(obj) {
    if (obj === null || !["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(obj))) {
        return obj;
    }
    const result = Array.isArray(obj) ? [] : {};
    for (let prop in obj) {
        const val = obj[prop];
        if (val === null) {
            continue;
        }
        result[prop] = val;
        if (typeof val === "object") {
            result[prop] = removeNulls(val);
        }
    }
    return result;
}
exports.removeNulls = removeNulls;
function joinObjects(obj1, ...objs) {
    const merge = (obj1, obj2) => {
        if (!obj1 || !obj2) {
            return obj2 !== null && obj2 !== void 0 ? obj2 : obj1;
        }
        if (["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(obj1)) !== true ||
            ["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(obj2)) !== true) {
            return obj2;
        }
        const result = Array.isArray(obj1) ? [] : {};
        const keys = [...Object.keys(obj1), ...Object.keys(obj2)].filter((v, i, a) => a.indexOf(v) === i);
        for (let prop of keys) {
            result[prop] = merge(obj1[prop], obj2[prop]);
        }
        return result;
    };
    return objs.reduce((acc, obj) => merge(acc, obj), obj1);
}
exports.joinObjects = joinObjects;
function replaceUndefined(obj) {
    if (!obj || obj === null || typeof obj !== "object") {
        return obj !== null && obj !== void 0 ? obj : null;
    }
    const result = Array.isArray(obj) ? [] : {};
    for (let prop in obj) {
        const val = obj[prop];
        result[prop] = val === undefined ? null : val;
        if (typeof val === "object") {
            result[prop] = replaceUndefined(val);
        }
    }
    return result;
}
exports.replaceUndefined = replaceUndefined;
function sanitizeEmailPrefix(email) {
    // Divide a string de email em duas partes: antes e depois do @
    const [prefix, domain] = email.split("@");
    // Define o regex para os caracteres permitidos
    const allowedCharacters = /^[a-zA-Z0-9_.]+$/;
    // Filtra os caracteres da parte antes do @ que correspondem ao regex
    const sanitizedPrefix = prefix
        .split("")
        .filter((char) => allowedCharacters.test(char))
        .join("");
    return sanitizedPrefix;
}
exports.sanitizeEmailPrefix = sanitizeEmailPrefix;
const getExtension = (filename) => {
    try {
        const i = filename.lastIndexOf(".");
        return i < 0 ? "" : filename.substr(i);
    }
    catch (_a) {
        return "";
    }
};
exports.getExtension = getExtension;
const isDate = (value) => {
    if (value instanceof Date) {
        return !isNaN(value.getTime());
    }
    if (typeof value === "object" && value !== null && typeof value.getMonth === "function") {
        return !isNaN(value.getTime());
    }
    if (typeof value === "string" && /^\d+$/.test(value) !== true) {
        const parsedDate = Date.parse(value);
        return !isNaN(parsedDate) && new Date(parsedDate).toISOString().startsWith(value);
    }
    return false;
};
exports.isDate = isDate;
//# sourceMappingURL=index.js.map