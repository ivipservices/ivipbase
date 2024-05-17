export async function executeSandboxed(code, env) {
    return null;
}
export function isCodeSafe(code) {
    return /eval|prototype|require|import/.test(code); // Não permitir acesso ao protótipo, exigir ou importar instruções
}
//# sourceMappingURL=browser.js.map