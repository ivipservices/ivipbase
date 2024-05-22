import { PathInfo } from "ivipbase-core";

export * from "./base64";

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
	if (obj === null || !(typeof obj === "object" && Object.prototype.toString.call(obj) === "[object Object]")) {
		return obj;
	}
	const result: any = Array.isArray(obj) ? [] : {};
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

export function joinObjects(obj1: any, ...objs: any[]) {
	const merge = (obj1: any, obj2: any) => {
		if (!obj1 || !obj2) {
			return obj2 ?? obj1;
		}
		if (Object.prototype.toString.call(obj1) !== "[object Object]" || Object.prototype.toString.call(obj2) !== "[object Object]") {
			return obj2;
		}
		const result: any = Array.isArray(obj1) ? [] : {};
		const keys = [...Object.keys(obj1), ...Object.keys(obj2)].filter((v, i, a) => a.indexOf(v) === i);
		for (let prop of keys) {
			result[prop] = merge(obj1[prop], obj2[prop]);
		}
		return result;
	};

	return objs.reduce((acc, obj) => merge(acc, obj), obj1);
}

export function replaceUndefined(obj: any) {
	if (!obj || obj === null || typeof obj !== "object") {
		return obj ?? null;
	}
	const result: any = Array.isArray(obj) ? [] : {};
	for (let prop in obj) {
		const val = obj[prop];
		result[prop] = val === undefined ? null : (val as any);
		if (typeof val === "object") {
			result[prop] = replaceUndefined(val) as any;
		}
	}
	return result;
}

export function sanitizeEmailPrefix(email: string): string {
	// Divide a string de email em duas partes: antes e depois do @
	const [prefix, domain] = email.split("@");

	// Define o regex para os caracteres permitidos
	const allowedCharacters = /^[a-zA-Z0-9_.]+$/;

	// Filtra os caracteres da parte antes do @ que correspondem ao regex
	const sanitizedPrefix = prefix
		.split("")
		.filter((char) => allowedCharacters.test(char))
		.join("");

	return sanitizedPrefix;
}
