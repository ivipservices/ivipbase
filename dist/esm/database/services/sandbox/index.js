import { createContext, runInContext } from "vm";
export async function executeSandboxed(code, env) {
    // Usar eval para executar código é perigoso, então temos que ter certeza de que rodaremos em uma sandbox
    // para que nenhum objeto disponível globalmente seja acessível.
    const context = createContext(env);
    const result = await runInContext(code, context, { filename: "sandbox", timeout: 10000, displayErrors: true, breakOnSigint: true });
    return result;
}
export function isCodeSafe(code) {
    return /eval|prototype|require|import/.test(code); // Não permitir acesso ao protótipo, exigir ou importar instruções
}
//# sourceMappingURL=index.js.map