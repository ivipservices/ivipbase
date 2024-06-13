"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const os_1 = require("os");
exports.default = () => {
    var _a, _b, _c;
    try {
        throw new Error();
    }
    catch (e) {
        const initiator = e.stack.split("\n").slice(2, 3)[0];
        let p = (_c = (_b = (_a = /(?<path>[^\(\s]+):[0-9]+:[0-9]+/.exec(initiator)) === null || _a === void 0 ? void 0 : _a.groups) === null || _b === void 0 ? void 0 : _b.path) !== null && _c !== void 0 ? _c : "";
        if (p.indexOf("file") >= 0) {
            p = new URL(p).pathname;
        }
        let dirname = path_1.default.dirname(p);
        if (dirname[0] === "/" && (0, os_1.platform)() === "win32") {
            dirname = dirname.slice(1);
        }
        return dirname;
    }
};
//# sourceMappingURL=es-dirname.js.map