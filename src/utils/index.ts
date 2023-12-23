/**
 * Substituição para console.assert, lança um erro se a condição não for atendida.
 * @param condition Condição 'truthy'
 * @param error Mensagem de erro opcional
 */
export function assert(condition: any, error?: string) {
	if (!condition) {
		throw new Error(`Asserção falhou: ${error ?? "verifique seu código"}`);
	}
}

export function removeNulls(obj: any) {
	if (obj === null || typeof obj !== "object") {
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
