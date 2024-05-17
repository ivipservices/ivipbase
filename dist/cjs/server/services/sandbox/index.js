"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCodeSafe = exports.executeSandboxed = void 0;
const vm_1 = require("vm");
async function executeSandboxed(code, env) {
    // Usar eval para executar código é perigoso, então temos que ter certeza de que rodaremos em uma sandbox
    // para que nenhum objeto disponível globalmente seja acessível.
    const context = (0, vm_1.createContext)(env);
    const result = await (0, vm_1.runInContext)(code, context, { filename: "sandbox", timeout: 10000, displayErrors: true, breakOnSigint: true });
    return result;
}
exports.executeSandboxed = executeSandboxed;
function isCodeSafe(code) {
    return /eval|prototype|require|import/.test(code); // Não permitir acesso ao protótipo, exigir ou importar instruções
}
exports.isCodeSafe = isCodeSafe;
//# sourceMappingURL=index.js.map