"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const put_1 = __importDefault(require("./put"));
const delete_1 = __importDefault(require("./delete"));
const get_1 = __importDefault(require("./get"));
const get_download_url_1 = __importDefault(require("./get-download-url"));
const list_1 = __importDefault(require("./list"));
const addRoutes = (env) => {
    (0, get_1.default)(env);
    (0, put_1.default)(env);
    (0, delete_1.default)(env);
    (0, get_download_url_1.default)(env);
    (0, list_1.default)(env);
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=index.js.map