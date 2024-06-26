import { PathInfo } from "ivipbase-core";

export * from "./base64";
export * as Mime from "./Mime";

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
	if (obj === null || !["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(obj))) {
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
		if (
			["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(obj1)) !== true ||
			["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(obj2)) !== true
		) {
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

export const getExtension = (filename: string): string => {
	try {
		const i = filename.lastIndexOf(".");
		return i < 0 ? "" : filename.substr(i);
	} catch {
		return "";
	}
};

export const isDate = (value: any): value is Date => {
	if (value instanceof Date) {
		return !isNaN(value.getTime());
	}

	if (typeof value === "object" && value !== null && typeof value.getMonth === "function") {
		return !isNaN(value.getTime());
	}

	if (typeof value === "string" && /^\d+$/.test(value) !== true) {
		const parsedDate = Date.parse(value);
		const iso8601Regex = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|([+-]\d{2}:\d{2}))?$/;
		return !isNaN(parsedDate) && (new Date(parsedDate).toISOString().startsWith(value) || iso8601Regex.test(value));
	}

	return false;
};

type AllowEventLoopCallback<K, V> = (value: V, key: K) => boolean | void | Promise<boolean | void>;

export async function allowEventLoop<V>(items: Array<V>, callback: AllowEventLoopCallback<number, V>, options?: { length_cycles?: number }): Promise<void>;

export async function allowEventLoop<K extends string, V>(items: Record<K, V>, callback: AllowEventLoopCallback<K, V>, options?: { length_cycles?: number }): Promise<void>;

export async function allowEventLoop<K extends string | number, V>(
	itens: Array<V> | Record<K, V>,
	callback: AllowEventLoopCallback<K, V>,
	options: {
		length_cycles?: number;
	} = {},
): Promise<void> {
	const { length_cycles = 1 } = options ?? {};
	let currency_index = 0;

	if (Array.isArray(itens)) {
		for (let i = 0; i < itens.length; i++) {
			const callbackResult = await Promise.race([callback(itens[i], i as K)]);
			if (callbackResult === true) {
				break;
			}
			if (currency_index % length_cycles === 0) {
				await new Promise((resolve) => setTimeout(resolve, 0));
			}
			currency_index++;
		}
	} else if (typeof itens === "object" && itens !== null) {
		for (let key in itens) {
			const callbackResult = await Promise.race([callback(itens[key], key)]);
			if (callbackResult === true) {
				break;
			}
			if (currency_index % length_cycles === 0) {
				await new Promise((resolve) => setTimeout(resolve, 0));
			}
			currency_index++;
		}
	}
}
