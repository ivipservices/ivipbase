import { PathReference, ascii85, Lib } from "ivipbase-core";
import { encodeString, isDate } from "ivip-utils";
import { MDESettings } from ".";
import { StorageNode } from "./NodeInfo";

const { assert } = Lib;

export const nodeValueTypes = {
	EMPTY: 0,
	// Native types:
	OBJECT: 1,
	ARRAY: 2,
	NUMBER: 3,
	BOOLEAN: 4,
	STRING: 5,
	BIGINT: 7,
	// Custom types:
	DATETIME: 6,
	BINARY: 8,
	REFERENCE: 9,

	DEDICATED_RECORD: 99,
} as const;

export type NodeValueType = (typeof nodeValueTypes)[keyof typeof nodeValueTypes];
export const VALUE_TYPES = nodeValueTypes as Record<keyof typeof nodeValueTypes, NodeValueType>;

/**
 * Retorna o nome descritivo de um tipo de valor com base no código do tipo.
 *
 * @param {number} valueType - O código do tipo de valor.
 * @returns {string} - O nome descritivo do tipo de valor correspondente.
 * @throws {Error} - Se o código do tipo de valor fornecido for desconhecido.
 *
 * @example
 * const typeName = getValueTypeName(VALUE_TYPES.STRING);
 * // Retorna: "string"
 *
 * @example
 * const typeName = getValueTypeName(99);
 * // Retorna: "dedicated_record"
 */
export function getValueTypeName(valueType: number) {
	switch (valueType) {
		case VALUE_TYPES.ARRAY:
			return "array";
		case VALUE_TYPES.BINARY:
			return "binary";
		case VALUE_TYPES.BOOLEAN:
			return "boolean";
		case VALUE_TYPES.DATETIME:
			return "date";
		case VALUE_TYPES.NUMBER:
			return "number";
		case VALUE_TYPES.OBJECT:
			return "object";
		case VALUE_TYPES.REFERENCE:
			return "reference";
		case VALUE_TYPES.STRING:
			return "string";
		case VALUE_TYPES.BIGINT:
			return "bigint";
		case VALUE_TYPES.DEDICATED_RECORD:
			return "dedicated_record";
		default:
			return "unknown";
	}
}

/**
 * Retorna um valor padrão para um tipo de valor com base no código do tipo.
 *
 * @param {number} valueType - O código do tipo de valor.
 * @returns {any} - Um valor padrão correspondente ao tipo de valor especificado.
 *
 * @example
 * const defaultValue = getValueTypeDefault(VALUE_TYPES.STRING);
 * // Retorna: ""
 *
 * @example
 * const defaultValue = getValueTypeDefault(VALUE_TYPES.NUMBER);
 * // Retorna: 0
 */
export function getValueTypeDefault(valueType: number) {
	switch (valueType) {
		case VALUE_TYPES.ARRAY:
			return [];
		case VALUE_TYPES.OBJECT:
			return {};
		case VALUE_TYPES.NUMBER:
			return 0;
		case VALUE_TYPES.BOOLEAN:
			return false;
		case VALUE_TYPES.STRING:
			return "";
		case VALUE_TYPES.BIGINT:
			return BigInt(0);
		case VALUE_TYPES.DATETIME:
			return new Date().toISOString();
		case VALUE_TYPES.BINARY:
			return new Uint8Array();
		case VALUE_TYPES.REFERENCE:
			return null;
		default:
			return undefined; // Or any other default value you prefer
	}
}

/**
 * Determina o tipo de valor de um node com base no valor fornecido.
 *
 * @param {unknown} value - O valor a ser avaliado.
 * @returns {number} - O código do tipo de valor correspondente.
 *
 * @example
 * const valueType = getNodeValueType([1, 2, 3]);
 * // Retorna: VALUE_TYPES.ARRAY
 *
 * @example
 * const valueType = getNodeValueType(new PathReference());
 * // Retorna: VALUE_TYPES.REFERENCE
 */
export function getNodeValueType(value: unknown) {
	if (value instanceof Array) {
		return VALUE_TYPES.ARRAY;
	} else if (value instanceof PathReference) {
		return VALUE_TYPES.REFERENCE;
	} else if (value instanceof ArrayBuffer) {
		return VALUE_TYPES.BINARY;
	} else if (isDate(value)) {
		return VALUE_TYPES.DATETIME;
	}
	// TODO else if (value instanceof DataDocument) { return VALUE_TYPES.DOCUMENT; }
	else if (typeof value === "string") {
		return VALUE_TYPES.STRING;
	} else if (typeof value === "object") {
		return VALUE_TYPES.OBJECT;
	} else if (typeof value === "bigint") {
		return VALUE_TYPES.BIGINT;
	}
	return VALUE_TYPES.EMPTY;
}

/**
 * Determina o tipo de valor de um dado com base no valor fornecido.
 *
 * @param {unknown} value - O valor a ser avaliado.
 * @returns {number} - O código do tipo de valor correspondente.
 *
 * @example
 * const valueType = getValueType([1, 2, 3]);
 * // Retorna: VALUE_TYPES.ARRAY
 *
 * @example
 * const valueType = getValueType(new PathReference());
 * // Retorna: VALUE_TYPES.REFERENCE
 */
export function getValueType(value: unknown) {
	if (value instanceof Array) {
		return VALUE_TYPES.ARRAY;
	} else if (value instanceof PathReference) {
		return VALUE_TYPES.REFERENCE;
	} else if (value instanceof ArrayBuffer) {
		return VALUE_TYPES.BINARY;
	} else if (isDate(value)) {
		return VALUE_TYPES.DATETIME;
	}
	// TODO else if (value instanceof DataDocument) { return VALUE_TYPES.DOCUMENT; }
	else if (typeof value === "string") {
		return VALUE_TYPES.STRING;
	} else if (typeof value === "object" && value !== null) {
		return VALUE_TYPES.OBJECT;
	} else if (typeof value === "number") {
		return VALUE_TYPES.NUMBER;
	} else if (typeof value === "boolean") {
		return VALUE_TYPES.BOOLEAN;
	} else if (typeof value === "bigint") {
		return VALUE_TYPES.BIGINT;
	}
	return VALUE_TYPES.EMPTY;
}

export const promiseState = (p: Promise<any>): Promise<"pending" | "fulfilled" | "rejected"> => {
	const t = { __timestamp__: Date.now() };
	return Promise.race([p, t]).then(
		(v) => (v === t ? "pending" : "fulfilled"),
		() => "rejected",
	);
};

/**
 * Verifica se um valor pode ser armazenado em um objeto pai ou se deve ser movido
 * para um registro dedicado com base nas configurações de tamanho máximo (`maxInlineValueSize`).
 * @param value - O valor a ser verificado.
 * @returns {boolean} `true` se o valor pode ser armazenado inline, `false` caso contrário.
 * @throws {TypeError} Lança um erro se o tipo do valor não for suportado.
 */
export function valueFitsInline(value: any, settings: MDESettings) {
	value = value == undefined ? null : value;
	if (typeof value === "number" || typeof value === "boolean" || isDate(value)) {
		return true;
	} else if (typeof value === "string") {
		if (value.length > settings.maxInlineValueSize) {
			return false;
		}
		// Se a string contém caracteres Unicode, o tamanho em bytes será maior do que `value.length`.
		const encoded = encodeString(value);
		return encoded.length < settings.maxInlineValueSize;
	} else if (value instanceof PathReference) {
		if (value.path.length > settings.maxInlineValueSize) {
			return false;
		}
		// Se o caminho contém caracteres Unicode, o tamanho em bytes será maior do que `value.path.length`.
		const encoded = encodeString(value.path);
		return encoded.length < settings.maxInlineValueSize;
	} else if (value instanceof ArrayBuffer) {
		return value.byteLength < settings.maxInlineValueSize;
	} else if (value instanceof Array) {
		return value.length === 0;
	} else if (typeof value === "object") {
		return value === null || Object.keys(value).length === 0;
	} else {
		throw new TypeError("What else is there?");
	}
}

/**
 * Obtém um valor tipado apropriado para armazenamento com base no tipo do valor fornecido.
 * @param val - O valor a ser processado.
 * @returns {any} O valor processado.
 * @throws {Error} Lança um erro se o valor não for suportado ou se for nulo.
 */
export function getTypedChildValue(val: any):
	| string
	| number
	| boolean
	| {
			type: (typeof nodeValueTypes)[keyof Pick<typeof nodeValueTypes, "DATETIME" | "REFERENCE" | "BINARY">];
			value: string | number | boolean;
	  }
	| null {
	if (val === null || val === undefined) {
		return null;
		//throw new Error(`Not allowed to store null values. remove the property`);
	} else if (isDate(val)) {
		return { type: VALUE_TYPES.DATETIME as any, value: new Date(val).getTime() };
	} else if (["string", "number", "boolean"].includes(typeof val)) {
		return val;
	} else if (val instanceof PathReference) {
		return { type: VALUE_TYPES.REFERENCE as any, value: val.path };
	} else if (val instanceof ArrayBuffer) {
		return { type: VALUE_TYPES.BINARY as any, value: ascii85.encode(val) };
	} else if (typeof val === "object") {
		assert(Object.keys(val).length === 0 || ("type" in val && val.type === VALUE_TYPES.DEDICATED_RECORD), "child object stored in parent can only be empty");
		return val;
	}
	return val;
}

/**
 * Processa o valor de um nó de armazenamento durante a leitura, convertendo valores tipados de volta ao formato original.
 * @param node - O nó de armazenamento a ser processado.
 * @returns {StorageNode} O nó de armazenamento processado.
 * @throws {Error} Lança um erro se o tipo de registro autônomo for inválido.
 */
export function processReadNodeValue(node: StorageNode): StorageNode {
	const getTypedChildValue = (val: { type: number; value: any; path?: string }) => {
		// Valor tipado armazenado em um registro pai
		if (val.type === VALUE_TYPES.BINARY) {
			// Binário armazenado em um registro pai como uma string
			return ascii85.decode(val.value);
		} else if (val.type === VALUE_TYPES.DATETIME) {
			// Valor de data armazenado como número
			return new Date(val.value);
		} else if (val.type === VALUE_TYPES.REFERENCE) {
			// Referência de caminho armazenada como string
			return new PathReference(val.value);
		} else if (val.type === VALUE_TYPES.DEDICATED_RECORD) {
			return getValueTypeDefault(val.value);
		} else {
			throw new Error(`Unhandled child value type ${val.type}`);
		}
	};

	node = JSON.parse(JSON.stringify(node));

	switch (node.type) {
		case VALUE_TYPES.ARRAY: {
			node.value = [];
			break;
		}
		case VALUE_TYPES.OBJECT: {
			// Verifica se algum valor precisa ser convertido
			// NOTA: Arrays são armazenados com propriedades numéricas
			const obj: any = node.value;
			if (obj !== null) {
				Object.keys(obj).forEach((key) => {
					const item = obj[key];
					if (item !== null && typeof item === "object" && "type" in item) {
						obj[key] = getTypedChildValue(item);
					}
				});
			}
			node.value = obj;
			break;
		}

		case VALUE_TYPES.BINARY: {
			node.value = ascii85.decode(node.value as any);
			break;
		}

		case VALUE_TYPES.REFERENCE: {
			node.value = new PathReference(node.value as any);
			break;
		}

		case VALUE_TYPES.STRING: {
			// Nenhuma ação necessária
			// node.value = node.value;
			break;
		}

		default:
			node.value = null;
		// throw new Error(`Invalid standalone record value type: ${node.type}`); // nunca deve acontecer
	}

	return node;
}

export const getTypeFromStoredValue = (val: unknown) => {
	let type: NodeValueType;
	if (typeof val === "string") {
		type = VALUE_TYPES.STRING;
	} else if (typeof val === "number") {
		type = VALUE_TYPES.NUMBER;
	} else if (typeof val === "boolean") {
		type = VALUE_TYPES.BOOLEAN;
	} else if (val instanceof Array) {
		type = VALUE_TYPES.ARRAY;
	} else if (typeof val === "object") {
		if (val && "type" in val) {
			const serialized = val as { type: NodeValueType; value: number | string };
			type = serialized.type;
			val = serialized.value;
			if (type === VALUE_TYPES.DATETIME) {
				val = new Date(val as number);
			} else if (type === VALUE_TYPES.REFERENCE) {
				val = new PathReference(val as string);
			}
		} else {
			type = VALUE_TYPES.OBJECT;
		}
	} else {
		throw new Error(`Unknown value type`);
	}
	return { type, value: val };
};
