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
	Object.keys(obj).forEach((prop) => {
		const val = obj[prop];
		if (val === null) {
			delete obj[prop];
			if (obj instanceof Array) {
				obj.length--;
			}
		}
		if (typeof val === "object") {
			obj[prop] = removeNulls(val);
		}
	});

	return obj;
}
