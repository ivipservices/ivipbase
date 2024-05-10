import { PathInfo } from "ivipbase-core";

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

export function pathValueToObject(dataPath: string, currentPath: string, value: any): typeof value {
	const result = value;
	const pathInfo = PathInfo.get(dataPath);
	const currentPathInfo = PathInfo.get(currentPath);
	const currentKeys = currentPathInfo.pathKeys.slice(currentPathInfo.pathKeys.findIndex((k) => !pathInfo.pathKeys.includes(k)));

	for (let k of currentKeys) {
	}

	return result;
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

export function replaceUndefined(obj: any) {
	if (!obj || obj === null || typeof obj !== "object") {
		return obj ?? null;
	}
	const result = Array.isArray(obj) ? [] : {};
	for (let prop in obj) {
		const val = obj[prop];
		result[prop] = val === undefined ? null : val;
		if (typeof val === "object") {
			result[prop] = replaceUndefined(val);
		}
	}
	return result;
}
