"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const put_1 = __importDefault(require("./put"));
const delete_1 = __importDefault(require("./delete"));
const addRoutes = (env) => {
    (0, put_1.default)(env);
    (0, delete_1.default)(env);
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=index.js.map