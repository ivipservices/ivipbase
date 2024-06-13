"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.packageRootPath = void 0;
const path_1 = __importDefault(require("path"));
const es_dirname_1 = __importDefault(require("../../utils/es-dirname"));
// Este arquivo está em ./src/shared/rootpath.ts
// Quando este código é executado, está em ./dist/cjs/shared/rootpath.js ou ./dist/esm/shared/rootpath.js
// Portanto, a raiz do pacote está em ../../..
let currentDir = (0, es_dirname_1.default)();
if (process.platform === "win32" && currentDir.startsWith("/")) {
    // tsc-esm-fix não manipula corretamente as URLs de arquivo win32, a letra da unidade em import.meta.url é prefixada com uma barra: file:///C:/dir/file.js
    currentDir = currentDir.slice(1);
}
// tsc-esm-fix também não usa decodeURI para remover caracteres codificados (como %20 para espaços)
currentDir = decodeURI(currentDir);
exports.packageRootPath = path_1.default.resolve(currentDir, "../../..");
exports.default = exports.packageRootPath;
//# sourceMappingURL=rootpath.js.map