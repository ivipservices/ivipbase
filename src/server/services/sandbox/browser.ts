export async function executeSandboxed(code: string, env: any) {
	return null;
}

export function isCodeSafe(code: string) {
	return /eval|prototype|require|import/.test(code); // Não permitir acesso ao protótipo, exigir ou importar instruções
}
