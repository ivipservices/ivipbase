"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCodeSafe = exports.executeSandboxed = void 0;
async function executeSandboxed(code, env) {
    return null;
}
exports.executeSandboxed = executeSandboxed;
function isCodeSafe(code) {
    return /eval|prototype|require|import/.test(code); // Não permitir acesso ao protótipo, exigir ou importar instruções
}
exports.isCodeSafe = isCodeSafe;
//# sourceMappingURL=browser.js.map