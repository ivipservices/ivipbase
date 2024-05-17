import { MDESettings } from ".";
import { StorageNode } from "./NodeInfo";
export declare const nodeValueTypes: {
    readonly EMPTY: 0;
    readonly OBJECT: 1;
    readonly ARRAY: 2;
    readonly NUMBER: 3;
    readonly BOOLEAN: 4;
    readonly STRING: 5;
    readonly BIGINT: 7;
    readonly DATETIME: 6;
    readonly BINARY: 8;
    readonly REFERENCE: 9;
    readonly DEDICATED_RECORD: 99;
};
export type NodeValueType = (typeof nodeValueTypes)[keyof typeof nodeValueTypes];
export declare const VALUE_TYPES: Record<"EMPTY" | "OBJECT" | "ARRAY" | "NUMBER" | "BOOLEAN" | "STRING" | "BIGINT" | "DATETIME" | "BINARY" | "REFERENCE" | "DEDICATED_RECORD", NodeValueType>;
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
export declare function getValueTypeName(valueType: number): "array" | "binary" | "boolean" | "date" | "number" | "object" | "reference" | "string" | "bigint" | "dedicated_record" | "unknown";
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
export declare function getValueTypeDefault(valueType: number): {} | null | undefined;
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
export declare function getNodeValueType(value: unknown): NodeValueType;
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
export declare function getValueType(value: unknown): NodeValueType;
export declare const promiseState: (p: Promise<any>) => Promise<"pending" | "fulfilled" | "rejected">;
/**
 * Verifica se um valor pode ser armazenado em um objeto pai ou se deve ser movido
 * para um registro dedicado com base nas configurações de tamanho máximo (`maxInlineValueSize`).
 * @param value - O valor a ser verificado.
 * @returns {boolean} `true` se o valor pode ser armazenado inline, `false` caso contrário.
 * @throws {TypeError} Lança um erro se o tipo do valor não for suportado.
 */
export declare function valueFitsInline(value: any, settings: MDESettings): boolean;
/**
 * Obtém um valor tipado apropriado para armazenamento com base no tipo do valor fornecido.
 * @param val - O valor a ser processado.
 * @returns {any} O valor processado.
 * @throws {Error} Lança um erro se o valor não for suportado ou se for nulo.
 */
export declare function getTypedChildValue(val: any): string | number | boolean | {
    type: (typeof nodeValueTypes)[keyof Pick<typeof nodeValueTypes, "DATETIME" | "REFERENCE" | "BINARY">];
    value: string | number | boolean;
} | null;
/**
 * Processa o valor de um nó de armazenamento durante a leitura, convertendo valores tipados de volta ao formato original.
 * @param node - O nó de armazenamento a ser processado.
 * @returns {StorageNode} O nó de armazenamento processado.
 * @throws {Error} Lança um erro se o tipo de registro autônomo for inválido.
 */
export declare function processReadNodeValue(node: StorageNode): StorageNode;
export declare const getTypeFromStoredValue: (val: unknown) => {
    type: NodeValueType;
    value: unknown;
};
//# sourceMappingURL=utils.d.ts.map