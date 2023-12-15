import NodeInfo from "./NodeInfo";
import { NodeAddress } from "./NodeAddress";

import { PathInfo, PathReference, Utils, ascii85, ID, Lib, SimpleEventEmitter } from "ivipbase-core";
import type { Types } from "ivipbase-core";

export * from "./NodeAddress";
export * from "./NodeCache";
export * from "./NodeChanges";
export { default as NodeInfo } from "./NodeInfo";
export * from "./NodeLock";

export class NodeNotFoundError extends Error {}
export class NodeRevisionError extends Error {}

const { compareValues, encodeString, isDate } = Utils;
const assert = Lib.assert;

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
			"unknown";
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
function getValueTypeDefault(valueType: number) {
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
 * Determina o tipo de valor de um nó com base no valor fornecido.
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
	} else if (typeof value === "object") {
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

export class CustomStorageNodeInfo extends NodeInfo {
	address?: NodeAddress;
	revision: string;
	revision_nr: number;
	created: Date;
	modified: Date;

	constructor(info: Omit<CustomStorageNodeInfo, "valueType" | "valueTypeName">) {
		super(info);
		this.revision = info.revision;
		this.revision_nr = info.revision_nr;
		this.created = info.created;
		this.modified = info.modified;
	}
}

/** Interface for metadata being stored for nodes */
export class StorageNodeMetaData {
	/** cuid (time sortable revision id). Nodes stored in the same operation share this id */
	revision = "";
	/** Number of revisions, starting with 1. Resets to 1 after deletion and recreation */
	revision_nr = 0;
	/** Creation date/time in ms since epoch UTC */
	created = 0;
	/** Last modification date/time in ms since epoch UTC */
	modified = 0;
	/** Type of the node's value. 1=object, 2=array, 3=number, 4=boolean, 5=string, 6=date, 7=reserved, 8=binary, 9=reference */
	type = 0 as NodeValueType;
}

/** Interface for metadata combined with a stored value */
export class StorageNode extends StorageNodeMetaData {
	/** only Object, Array, large string and binary values. */
	value: any = null;
	constructor() {
		super();
	}
}

export interface StorageNodeInfo {
	path: string;
	content: StorageNode;
}

type JSONData = { [key: string]: string | number | boolean | null | Date | bigint | JSONData | JSONData[] };

/**
 * Representa as configurações de um nó de armazenamento.
 */
export class NodeSettings {
	/**
	 * Tamanho máximo, em bytes, dos dados filhos a serem armazenados em um registro pai
	 * antes de serem movidos para um registro dedicado. O valor padrão é 50.
	 * @default 50
	 */
	maxInlineValueSize: number = 50;

	/**
	 * Em vez de lançar erros em propriedades não definidas, esta opção permite
	 * remover automaticamente as propriedades não definidas. O valor padrão é false.
	 * @default false
	 */
	removeVoidProperties: boolean = false;

	/**
	 * Uma função que permite a sincronização de dados. Recebe uma expressão regular para o caminho,
	 * o tipo de operação ("get", "remove" ou "add"), e uma matriz de informações sobre nós de armazenamento.
	 * Pode retornar uma Promessa de matriz de informações sobre nós de armazenamento ou uma matriz de informações
	 * sobre nós de armazenamento. Se não for fornecida, o valor é `undefined`.
	 */
	dataSynchronization: ((path: RegExp, type: "get" | "remove" | "add", nodes?: StorageNodeInfo[]) => Promise<StorageNodeInfo[]> | StorageNodeInfo[]) | undefined | null;

	/**
	 * Cria uma instância de NodeSettings com as opções fornecidas.
	 * @param options - Opções para configurar o nó.
	 */
	constructor(options: Partial<NodeSettings>) {
		if (typeof options.maxInlineValueSize === "number") {
			this.maxInlineValueSize = options.maxInlineValueSize;
		}

		if (typeof options.removeVoidProperties === "boolean") {
			this.removeVoidProperties = options.removeVoidProperties;
		}

		if (typeof options.removeVoidProperties === "boolean") {
			this.removeVoidProperties = options.removeVoidProperties;
		}

		if (typeof options.dataSynchronization === "function") {
			this.dataSynchronization = options.dataSynchronization;
		}
	}
}

interface NodeChanges {
	changed: string[];
	added: string[];
	removed: string[];
}

/**
 * Uma classe estendida de Map que oferece métodos adicionais para manipular seus valores.
 *
 * @template k O tipo das chaves no mapa.
 * @template v O tipo dos valores no mapa.
 */
class CustomMap<k = any, v = any> extends Map<k, v> {
	/**
	 * Filtra os valores do mapa com base em um callback e retorna um array dos valores que atendem à condição.
	 *
	 * @param {function(v, k): boolean} callback - A função de callback que define a condição para filtrar os valores.
	 * @returns {v[]} Um array dos valores filtrados.
	 */
	filterValues(callback: (value: v, key: k) => boolean | void): v[] {
		const list: v[] = [];
		for (const [key, value] of this) {
			if (callback(value, key)) {
				list.push(value);
			}
		}
		return list;
	}

	/**
	 * Encontra a primeira chave que atende a uma condição definida em um callback.
	 *
	 * @param {function(v, k): boolean} callback - A função de callback que define a condição de busca.
	 * @returns {k | undefined} A primeira chave que atende à condição ou `undefined` se nenhuma chave for encontrada.
	 */
	findIndex(callback: (value: v, key: k) => boolean | void): k | undefined {
		for (const [key, value] of this) {
			if (callback(value, key)) {
				return key;
			}
		}
		return undefined;
	}

	/**
	 * Encontra o primeiro valor que atende a uma condição definida em um callback.
	 *
	 * @param {function(v, k): boolean} callback - A função de callback que define a condição de busca.
	 * @returns {v | undefined} O primeiro valor que atende à condição ou `undefined` se nenhum valor for encontrado.
	 */
	find(callback: (value: v, key: k) => boolean | void): v | undefined {
		const key = this.findIndex(callback);
		return !key ? undefined : this.get(key);
	}

	/**
	 * Remove os itens do mapa que atendem a uma condição definida em um callback.
	 *
	 * @param {function(v, k): boolean} callback - A função de callback que define a condição para remover os itens.
	 */
	removeItems(callback: (value: v, key: k) => boolean) {
		const keysToDelete: k[] = [];
		for (const [key, value] of this) {
			if (callback(value, key)) {
				keysToDelete.push(key);
			}
		}
		for (const key of keysToDelete) {
			this.delete(key);
		}
	}

	/**
	 * Mapeia os valores do mapa e retorna um array de resultados após aplicar um callback a cada valor.
	 *
	 * @template t O tipo dos resultados do mapeamento.
	 * @param {function(v, k): t} callback - A função de callback que mapeia os valores.
	 * @returns {t[]} Um array dos resultados do mapeamento.
	 */
	map<t = any>(callback: (value: v, key: k) => t): t[] {
		const list: t[] = [];
		for (const [key, value] of this) {
			list.push(callback(value, key));
		}
		return list;
	}
}

/**
 * Classe que representa um nó com configurações específicas.
 */
export default class Node extends SimpleEventEmitter {
	/**
	 * As configurações do nó.
	 */
	readonly settings: NodeSettings;

	/**
	 * Uma matriz de informações sobre nós de armazenamento.
	 */
	readonly nodes = new CustomMap<string, StorageNodeInfo>();

	/**
	 * Cria uma nova instância de Node.
	 * @param byNodes - Uma matriz de informações sobre nós de armazenamento para inicializar o nó.
	 * @param options - Opções para configurar o nó.
	 */
	constructor(byNodes: StorageNodeInfo[] = [], options: Partial<NodeSettings> = {}) {
		super();

		this.settings = new NodeSettings(options);
		this.push(byNodes);

		if (this.isPathExists("") !== true) {
			this.writeNode("", {});
		}
	}

	/**
	 * Aplica as alterações especificadas ao nó.
	 * @param changes - Um objeto contendo as alterações a serem aplicadas.
	 */
	private applyChanges(changes: NodeChanges) {
		/**
		 * Um objeto que mapeia os tipos de alterações ('add', 'remove', etc.) para
		 * os caminhos alterados e seus nós pais correspondentes.
		 * @type {Object<string, Array<[string, StorageNodeInfo | undefined]>[]>}
		 */
		const nodesChanged: {
			[k in keyof NodeChanges]: Array<[string, Array<StorageNodeInfo | undefined>]>;
		} = Object.fromEntries(
			Object.entries(changes).map(([change, paths]) => {
				return [change, paths.map((p) => [p, this.getResponsibleNodeBy(p)])];
			}) as [any, Array<[string, StorageNodeInfo | undefined]>][],
		);

		nodesChanged.changed = nodesChanged.changed.concat(nodesChanged.removed.filter(([p, n]) => n != undefined || n != null));
		nodesChanged.removed = [...nodesChanged.removed, ...nodesChanged.changed, ...nodesChanged.added].filter(([p, n]) => !n);
		nodesChanged.changed = nodesChanged.changed.filter(([p, n]) => n != undefined || n != null);
		nodesChanged.added = nodesChanged.added.filter(([p, n]) => n != undefined || n != null);

		console.log(JSON.stringify(nodesChanged, null, 4));
	}

	/**
	 * Verifica se um caminho específico existe no nó.
	 * @param path - O caminho a ser verificado.
	 * @returns {boolean} `true` se o caminho existir no nó, `false` caso contrário.
	 */
	isPathExists(path: string): boolean {
		const pathInfo = PathInfo.get(path);
		return (
			this.nodes.findIndex(({ path: nodePath }) => {
				return pathInfo.isOnTrailOf(nodePath);
			}) !== undefined
		);
	}

	/**
	 * Sincroniza o nó com os nós correspondentes com base no caminho especificado.
	 * @param path - O caminho a ser sincronizado.
	 * @param allHeirs - Um valor booleano que determina se todos os herdeiros devem ser sincronizados.
	 * @returns {Promise<void>} Uma promessa que é resolvida após a sincronização.
	 */
	async synchronize(path: string, allHeirs: boolean = false) {
		const pathsRegex: string[] = [];

		/**
		 * Substitui o caminho por uma expressão regular.
		 * @param path - O caminho a ser convertido em expressão regular.
		 * @returns {string} O caminho convertido em expressão regular.
		 */
		const replasePathToRegex = (path: string) => {
			path = path.replace(/\/((\*)|(\$[^/\$]*))/g, "/([^/]*)");
			path = path.replace(/\[\*\]/g, "\\[(\\d+)\\]");
			return path;
		};

		pathsRegex.push(`${replasePathToRegex(path)}(/([^/]*))${allHeirs ? "+" : ""}?`);

		const parentPath = new PathInfo(path).parentPath;
		pathsRegex.push(`${replasePathToRegex(parentPath)}(/([^/]*))${allHeirs ? "+" : ""}?`);

		const fullRegex: RegExp = new RegExp(`^(${pathsRegex.join("$)|(")}$)`);

		if (typeof this.settings.dataSynchronization === "function") {
			const nodes: StorageNodeInfo[] = (await this.settings.dataSynchronization(fullRegex, "get")) ?? [];
			this.push(nodes);
		}
	}

	/**
	 * Adiciona um ou mais nós ao nó atual.
	 * @param nodes - Um ou mais nós a serem adicionados.
	 * @returns {Node} O nó atual após a adição dos nós.
	 */
	push(...nodes: (StorageNodeInfo[] | StorageNodeInfo)[]) {
		const forNodes: StorageNodeInfo[] =
			Array.prototype.concat
				.apply(
					[],
					nodes.map((node) => (Array.isArray(node) ? node : [node])),
				)
				.filter((node: any = {}) => node && typeof node.path === "string" && "content" in node) ?? [];

		for (let node of forNodes) {
			this.nodes.set(node.path, node);
		}

		// this.nodes.removeItems(({ path, content }, i, l) => {
		// 	//const isRemove = l.findIndex((n) => new PathInfo(path).isChildOf(n.path)) < 0 || l.findIndex((n) => n.path === path) !== i;
		// 	const isRemove = l.findIndex((n) => n.path === path && n.content.modified >= content.modified) !== i;
		// 	return !isRemove;
		// });
		return this;
	}

	static get VALUE_TYPES() {
		return VALUE_TYPES;
	}

	/**
	 * Verifica se um valor pode ser armazenado em um objeto pai ou se deve ser movido
	 * para um registro dedicado com base nas configurações de tamanho máximo (`maxInlineValueSize`).
	 * @param value - O valor a ser verificado.
	 * @returns {boolean} `true` se o valor pode ser armazenado inline, `false` caso contrário.
	 * @throws {TypeError} Lança um erro se o tipo do valor não for suportado.
	 */
	private valueFitsInline(value: any) {
		if (typeof value === "number" || typeof value === "boolean" || isDate(value)) {
			return true;
		} else if (typeof value === "string") {
			if (value.length > this.settings.maxInlineValueSize) {
				return false;
			}
			// Se a string contém caracteres Unicode, o tamanho em bytes será maior do que `value.length`.
			const encoded = encodeString(value);
			return encoded.length < this.settings.maxInlineValueSize;
		} else if (value instanceof PathReference) {
			if (value.path.length > this.settings.maxInlineValueSize) {
				return false;
			}
			// Se o caminho contém caracteres Unicode, o tamanho em bytes será maior do que `value.path.length`.
			const encoded = encodeString(value.path);
			return encoded.length < this.settings.maxInlineValueSize;
		} else if (value instanceof ArrayBuffer) {
			return value.byteLength < this.settings.maxInlineValueSize;
		} else if (value instanceof Array) {
			return value.length === 0;
		} else if (typeof value === "object") {
			return Object.keys(value).length === 0;
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
	private getTypedChildValue(val: any):
		| string
		| number
		| boolean
		| {
				type: (typeof nodeValueTypes)[keyof Pick<typeof nodeValueTypes, "DATETIME" | "REFERENCE" | "BINARY">];
				value: string | number | boolean;
		  }
		| undefined {
		if (val === null) {
			throw new Error(`Not allowed to store null values. remove the property`);
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
	}

	/**
	 * Processa o valor de um nó de armazenamento durante a leitura, convertendo valores tipados de volta ao formato original.
	 * @param node - O nó de armazenamento a ser processado.
	 * @returns {StorageNode} O nó de armazenamento processado.
	 * @throws {Error} Lança um erro se o tipo de registro autônomo for inválido.
	 */
	private processReadNodeValue(node: StorageNode): StorageNode {
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
			case VALUE_TYPES.ARRAY:
			case VALUE_TYPES.OBJECT: {
				// Verifica se algum valor precisa ser convertido
				// NOTA: Arrays são armazenados com propriedades numéricas
				const obj = node.value;
				Object.keys(obj).forEach((key) => {
					const item = obj[key];
					if (typeof item === "object" && "type" in item) {
						obj[key] = getTypedChildValue(item);
					}
				});
				node.value = obj;
				break;
			}

			case VALUE_TYPES.BINARY: {
				node.value = ascii85.decode(node.value);
				break;
			}

			case VALUE_TYPES.REFERENCE: {
				node.value = new PathReference(node.value);
				break;
			}

			case VALUE_TYPES.STRING: {
				// Nenhuma ação necessária
				// node.value = node.value;
				break;
			}

			default:
				throw new Error(`Invalid standalone record value type`); // nunca deve acontecer
		}

		return node;
	}

	/**
	 * Obtém uma matriz de informações sobre nós de armazenamento com base no caminho especificado.
	 * @param path - O caminho para o qual os nós devem ser obtidos.
	 * @returns {StorageNodeInfo[]} Uma matriz de informações sobre os nós correspondentes ao caminho.
	 */
	getNodesBy(path: string): StorageNodeInfo[] {
		const pathInfo = PathInfo.get(path);
		return this.nodes.filterValues((node) => {
			const nodePath = PathInfo.get(node.path);
			return nodePath.path == pathInfo.path || pathInfo.isAncestorOf(nodePath);
		});
	}

	/**
	 * Obtém o nó pai de um caminho específico.
	 * @param path - O caminho para o qual o nó pai deve ser obtido.
	 * @returns {StorageNodeInfo | undefined} O nó pai correspondente ao caminho ou `undefined` se não for encontrado.
	 */
	getNodeParentBy(path: string): StorageNodeInfo | undefined {
		const pathInfo = PathInfo.get(path);
		return this.nodes
			.filterValues((node) => {
				const nodePath = PathInfo.get(node.path);
				return nodePath.path === "" || pathInfo.path === nodePath.path || nodePath.isParentOf(pathInfo);
			})
			.sort((a: StorageNodeInfo, b: StorageNodeInfo): number => {
				const pathA = PathInfo.get(a.path);
				const pathB = PathInfo.get(b.path);
				return pathA.isDescendantOf(pathB.path) ? -1 : pathB.isDescendantOf(pathA.path) ? 1 : 0;
			})
			.shift();
	}

	getResponsibleNodeBy(path: string): StorageNodeInfo | undefined {
		const pathInfo = PathInfo.get(path);
		return this.nodes
			.filterValues((node) => {
				const nodePath = PathInfo.get(node.path);
				return nodePath.path === "" || pathInfo.equals(nodePath.path) || nodePath.isParentOf(pathInfo);
			})
			.sort((a: StorageNodeInfo, b: StorageNodeInfo): number => {
				const pathA = PathInfo.get(a.path);
				const pathB = PathInfo.get(b.path);
				return pathA.equals(pathB.path) || pathA.isParentOf(pathB.path) ? -1 : pathB.equals(pathA.path) || pathB.isParentOf(pathA.path) ? 1 : 0;
			})
			.find((node) => PathInfo.get(node.path).equals(pathInfo) || PathInfo.get(node.path).isParentOf(pathInfo));
	}

	/**
	 * Obtém as chaves dos nós filhos de um caminho específico.
	 * @param path - O caminho para o qual as chaves dos nós filhos devem ser obtidas.
	 * @returns {string[]} Uma matriz de chaves dos nós filhos.
	 */
	private getKeysBy(path: string): string[] {
		const pathInfo = PathInfo.get(path);
		return this.nodes
			.filterValues((node) => pathInfo.isParentOf(node.path))
			.map((node) => {
				const key = PathInfo.get(node.path).key;
				return key ? key.toString() : null;
			})
			.filter((keys) => typeof keys === "string") as string[];
	}

	/**
	 * Obtém informações personalizadas sobre um nó com base no caminho especificado.
	 * @param path - O caminho do nó para o qual as informações devem ser obtidas.
	 * @param options - Opções adicionais para controlar o comportamento.
	 * @param options.include_child_count - Um valor booleano que indica se o número de filhos deve ser incluído nas informações.
	 * @returns {CustomStorageNodeInfo} Informações personalizadas sobre o nó especificado.
	 */
	getInfoBy(
		path: string,
		options: {
			include_child_count?: boolean;
		} = {},
	): CustomStorageNodeInfo {
		const pathInfo = PathInfo.get(path);
		const node = this.getNodeParentBy(pathInfo.path);

		const defaultNode = new CustomStorageNodeInfo({
			path: pathInfo.path,
			key: typeof pathInfo.key === "string" ? pathInfo.key : undefined,
			index: typeof pathInfo.key === "number" ? pathInfo.key : undefined,
			type: 0 as NodeValueType,
			exists: false,
			address: undefined,
			created: new Date(),
			modified: new Date(),
			revision: "",
			revision_nr: 0,
		});

		if (!node) {
			return defaultNode;
		}

		const content = this.processReadNodeValue(node.content);
		let value = content.value;

		if (node.path !== pathInfo.path) {
			const keys = [pathInfo.key];
			let currentPath = pathInfo.parent;

			while (currentPath instanceof PathInfo && currentPath.path !== node.path) {
				if (currentPath.key !== null) keys.unshift(currentPath.key);
				currentPath = currentPath.parent;
			}

			keys.forEach((key, index) => {
				if (value === null) {
					return;
				}

				if (key !== null && [VALUE_TYPES.OBJECT, VALUE_TYPES.ARRAY].includes(getValueType(value)) && key in value) {
					value = value[key];
					return;
				}

				value = null;
			});
		}

		const containsChild = this.nodes.findIndex((node) => node && typeof node.path === "string" && pathInfo.isAncestorOf(node.path)) !== undefined;
		const isArrayChild = (() => {
			if (containsChild) return false;
			const child = this.nodes.find((node) => node && typeof node.path === "string" && pathInfo.isParentOf(node.path));
			return child ? typeof PathInfo.get(child.path).key === "number" : false;
		})();

		const info = new CustomStorageNodeInfo({
			path: pathInfo.path,
			key: typeof pathInfo.key === "string" ? pathInfo.key : undefined,
			index: typeof pathInfo.key === "number" ? pathInfo.key : undefined,
			type: value !== null ? getValueType(value) : containsChild ? (isArrayChild ? VALUE_TYPES.ARRAY : VALUE_TYPES.OBJECT) : (0 as NodeValueType),
			exists: value !== null || containsChild,
			address: new NodeAddress(node.path),
			created: new Date(content.created) ?? new Date(),
			modified: new Date(content.modified) ?? new Date(),
			revision: content.revision ?? "",
			revision_nr: content.revision_nr ?? 0,
		});

		const prepareValue = (value) => {
			return [VALUE_TYPES.OBJECT, VALUE_TYPES.ARRAY].includes(getValueType(value))
				? Object.keys(value).reduce((result, key) => {
						result[key] = this.getTypedChildValue(value[key]);
						return result;
				  }, {})
				: this.getTypedChildValue(value);
		};

		info.value = value ? prepareValue(value) : [VALUE_TYPES.OBJECT, VALUE_TYPES.ARRAY].includes(info.type as any) ? (info.type === VALUE_TYPES.ARRAY ? [] : {}) : null;

		if (options.include_child_count) {
			info.childCount = value ? Object.keys(value ?? {}).length : 0;
			if (containsChild && [VALUE_TYPES.OBJECT, VALUE_TYPES.ARRAY].includes(info.valueType as any) && info.address) {
				// Get number of children
				info.childCount = value ? Object.keys(value ?? {}).length : 0;
				info.childCount += this.nodes
					.filterValues(({ path }) => pathInfo.isAncestorOf(path))
					.map(({ path }) => PathInfo.get(path.replace(new RegExp(`^${pathInfo.path}`, "gi"), "")).keys[1] ?? "")
					.filter((path, index, list) => {
						return list.indexOf(path) === index;
					}).length;
			}
		}

		return info;
	}

	/**
	 * Escreve um nó no armazenamento com o caminho e valor especificados.
	 * @param path - O caminho do nó a ser escrito.
	 * @param value - O valor a ser armazenado no nó.
	 * @param options - Opções adicionais para controlar o comportamento da escrita.
	 * @param options.merge - Um valor booleano que indica se a escrita deve ser mesclada com o valor existente no nó, se houver.
	 * @param options.revision - Uma string que representa a revisão associada ao nó.
	 * @param options.currentValue - O valor atual no nó, se disponível.
	 * @param options.diff - A diferença entre o valor atual e o novo valor, se disponível.
	 * @returns {NodeChanges} As alterações feitas no nó, incluindo alterações, adições e remoções.
	 */
	private writeNode(
		path: string,
		value: any,
		options: {
			merge?: boolean;
			revision?: string;
			currentValue?: any;
			diff?: Types.ValueCompareResult;
		} = {},
	): NodeChanges {
		if (!options.merge && this.valueFitsInline(value) && path !== "") {
			throw new Error(`invalid value to store in its own node`);
		} else if (path === "" && (typeof value !== "object" || value instanceof Array)) {
			throw new Error(`Invalid root node value. Must be an object`);
		}

		const pathChanges: NodeChanges = {
			changed: [],
			added: [],
			removed: [],
		};

		const joinChanges = (...c: NodeChanges[]): NodeChanges => {
			c.forEach((n) => {
				Object.entries(n).forEach(([change, keys]) => {
					pathChanges[change] = pathChanges[change].concat(keys).filter((p, i, l) => l.indexOf(p) === i);
				});
			});
			return pathChanges;
		};

		if (options.merge && typeof options.currentValue === "undefined" && this.isPathExists(path)) {
			options.currentValue = this.getNode(path).content.value;
		}

		//options.currentValue = options.currentValue ?? this.toJson(path);

		// Check if the value for this node changed, to prevent recursive calls to
		// perform unnecessary writes that do not change any data
		if (typeof options.diff === "undefined" && typeof options.currentValue !== "undefined") {
			options.diff = compareValues(options.currentValue, value);
			if (options.merge && typeof options.diff === "object") {
				options.diff.removed = options.diff.removed.filter((key) => value[key] === null); // Only keep "removed" items that are really being removed by setting to null
				if (([] as any[]).concat(options.diff.changed, options.diff.added, options.diff.removed).length === 0) {
					options.diff = "identical";
				}
			}
		}

		if (options.diff === "identical") {
			return pathChanges; // Done!
		}

		const pathInfo = PathInfo.get(path);

		switch (options.diff) {
			case "added":
				pathChanges.added.push(pathInfo.path);
				break;
			case "removed":
				pathChanges.removed.push(pathInfo.path);
				break;
			case "changed":
				pathChanges.changed.push(pathInfo.path);
				break;
			default:
				if (typeof options.diff === "object") {
					const { added, removed, changed } = options.diff;
					joinChanges({
						added: added.map((k) => pathInfo.childPath(k)),
						removed: removed.map((k) => pathInfo.childPath(k)),
						changed: changed.map(({ key }) => key).map((k) => pathInfo.childPath(k)),
					});
				}
		}

		//const currentRow = options.currentValue.content;

		// Get info about current node at path
		const currentRow = options.currentValue === null ? null : this.getNode(path, true, false).content;

		if (options.merge && currentRow) {
			if (currentRow.type === VALUE_TYPES.ARRAY && !(value instanceof Array) && typeof value === "object" && Object.keys(value).some((key) => isNaN(parseInt(key)))) {
				throw new Error(`Cannot merge existing array of path "${path}" with an object`);
			}
			if (value instanceof Array && currentRow.type !== VALUE_TYPES.ARRAY) {
				throw new Error(`Cannot merge existing object of path "${path}" with an array`);
			}
		}

		const revision = ID.generate();

		const mainNode = {
			type: currentRow && currentRow.type === VALUE_TYPES.ARRAY ? VALUE_TYPES.ARRAY : VALUE_TYPES.OBJECT,
			value: {} as Record<string, any> | string,
		};

		const childNodeValues = {} as Record<string | number, any>;

		if (value instanceof Array) {
			mainNode.type = VALUE_TYPES.ARRAY;
			// Convert array to object with numeric properties
			const obj = {} as Record<number, any>;
			for (let i = 0; i < value.length; i++) {
				obj[i] = value[i];
			}
			value = obj;
		} else if (value instanceof PathReference) {
			mainNode.type = VALUE_TYPES.REFERENCE;
			mainNode.value = value.path;
		} else if (value instanceof ArrayBuffer) {
			mainNode.type = VALUE_TYPES.BINARY;
			mainNode.value = ascii85.encode(value);
		} else if (typeof value === "string") {
			mainNode.type = VALUE_TYPES.STRING;
			mainNode.value = value;
		}

		const currentIsObjectOrArray = currentRow ? [VALUE_TYPES.OBJECT, VALUE_TYPES.ARRAY].includes(currentRow.type) : false;
		const newIsObjectOrArray = [VALUE_TYPES.OBJECT, VALUE_TYPES.ARRAY].includes(mainNode.type);

		const children = {
			current: [] as string[],
			new: [] as string[],
		};

		const isArray = mainNode.type === VALUE_TYPES.ARRAY;

		let currentObject = null;
		if (currentIsObjectOrArray) {
			currentObject = currentRow?.value;
			children.current = Object.keys(currentObject ?? {});
			// if (currentObject instanceof Array) { // ALWAYS FALSE BECAUSE THEY ARE STORED AS OBJECTS WITH NUMERIC PROPERTIES
			//     // Convert array to object with numeric properties
			//     const obj = {};
			//     for (let i = 0; i < value.length; i++) {
			//         obj[i] = value[i];
			//     }
			//     currentObject = obj;
			// }
			if (newIsObjectOrArray) {
				(mainNode.value as any) = currentObject;
			}
		}

		if (newIsObjectOrArray) {
			// Object or array. Determine which properties can be stored in the main node,
			// and which should be stored in their own nodes
			if (!options.merge) {
				// Check which keys are present in the old object, but not in newly given object
				Object.keys(mainNode.value).forEach((key) => {
					if (!(key in value)) {
						// Property that was in old object, is not in new value -> set to null to mark deletion!
						value[key] = null;
					}
				});
			}
			Object.keys(value).forEach((key) => {
				const val = value[key];
				delete (mainNode.value as Record<string, any>)[key]; // key is being overwritten, moved from inline to dedicated, or deleted. TODO: check if this needs to be done SQLite & MSSQL implementations too
				if (val === null) {
					//  || typeof val === 'undefined'
					// This key is being removed
					return;
				} else if (typeof val === "undefined") {
					if (this.settings.removeVoidProperties === true) {
						delete value[key]; // Kill the property in the passed object as well, to prevent differences in stored and working values
						return;
					} else {
						throw new Error(`Property "${key}" has invalid value. Cannot store undefined values. Set removeVoidProperties option to true to automatically remove undefined properties`);
					}
				}
				// Where to store this value?
				if (this.valueFitsInline(val)) {
					// Store in main node
					(mainNode.value as Record<string, any>)[key] = val;
				} else {
					// (mainNode.value as Record<string, any>)[key] = {
					// 	type: VALUE_TYPES.DEDICATED_RECORD,
					// 	value: getNodeValueType(val),
					// 	path: pathInfo.childPath(isArray ? parseInt(key) : key),
					// };
					// Store in child node
					delete (mainNode.value as Record<string, any>)[key];
					childNodeValues[key] = val;
				}
			});

			const original = mainNode.value;
			mainNode.value = {};
			// If original is an array, it'll automatically be converted to an object now
			Object.keys(original).forEach((key) => {
				mainNode.value[key] = this.getTypedChildValue(original[key]);
			});
		}

		const updateFor: StorageNodeInfo[] = [];

		if (currentRow) {
			if (currentIsObjectOrArray || newIsObjectOrArray) {
				const changes: {
					insert: string[];
					update: string[];
					delete: string[];
				} = {
					insert: [],
					update: [],
					delete: [],
				};

				const keys: string[] = this.getKeysBy(pathInfo.path);

				children.current = children.current.concat(keys).filter((key, i, l) => l.indexOf(key) === i);

				if (newIsObjectOrArray) {
					if (options && options.merge) {
						children.new = children.current.slice();
					}
					Object.keys(value).forEach((key) => {
						if (!children.new.includes(key)) {
							children.new.push(key);
						}
					});
				}

				changes.insert = children.new.filter((key) => !children.current.includes(key));
				changes.delete = options && options.merge ? Object.keys(value).filter((key) => value[key] === null) : children.current.filter((key) => !children.new.includes(key));
				changes.update = children.new.filter((key) => children.current.includes(key) && !changes.delete.includes(key));

				if (isArray && options.merge && (changes.insert.length > 0 || changes.delete.length > 0)) {
					// deletes or inserts of individual array entries are not allowed, unless it is the last entry:
					// - deletes would cause the paths of following items to change, which is unwanted because the actual data does not change,
					// eg: removing index 3 on array of size 10 causes entries with index 4 to 9 to 'move' to indexes 3 to 8
					// - inserts might introduce gaps in indexes,
					// eg: adding to index 7 on an array of size 3 causes entries with indexes 3 to 6 to go 'missing'
					const newArrayKeys = changes.update.concat(changes.insert);
					const isExhaustive = newArrayKeys.every((k, index, arr) => arr.includes(index.toString()));
					if (!isExhaustive) {
						throw new Error(
							`Elements cannot be inserted beyond, or removed before the end of an array. Rewrite the whole array at path "${path}" or change your schema to use an object collection instead`,
						);
					}
				}

				for (let key in childNodeValues) {
					const keyOrIndex = isArray ? parseInt(key) : key;
					const childDiff = typeof options.diff === "object" ? options.diff.forChild(keyOrIndex) : undefined;
					if (childDiff === "identical") {
						continue;
					}

					const childPath = pathInfo.childPath(keyOrIndex);
					const childValue = childNodeValues[keyOrIndex];

					// Pass current child value to _writeNode
					const currentChildValue =
						typeof options.currentValue === "undefined" // Fixing issue #20
							? undefined
							: options.currentValue !== null && typeof options.currentValue === "object" && keyOrIndex in options.currentValue
							? options.currentValue[keyOrIndex]
							: null;

					joinChanges(
						this.writeNode(childPath, childValue, {
							revision,
							merge: false,
							currentValue: currentChildValue,
							diff: childDiff,
						}),
					);
				}

				// Delete all child nodes that were stored in their own record, but are being removed
				// Also delete nodes that are being moved from a dedicated record to inline
				const movingNodes = newIsObjectOrArray ? keys.filter((key) => key in (mainNode.value as Record<string, any>)) : []; // moving from dedicated to inline value

				const deleteDedicatedKeys = changes.delete.concat(movingNodes);

				for (let key of deleteDedicatedKeys) {
					const keyOrIndex = isArray ? parseInt(key) : key;
					const childPath = pathInfo.childPath(keyOrIndex);
					pathChanges.removed = pathChanges.removed.concat(this.deleteNode(childPath));
				}
			}

			updateFor.push({
				path: pathInfo.path,
				content: {
					type: mainNode.type,
					value: mainNode.value,
					revision: currentRow.revision,
					revision_nr: currentRow.revision_nr + 1,
					created: currentRow.created,
					modified: Date.now(),
				},
			});
		} else {
			for (let key in childNodeValues) {
				const keyOrIndex = isArray ? parseInt(key) : key;
				const childPath = pathInfo.childPath(keyOrIndex);
				const childValue = childNodeValues[keyOrIndex];

				joinChanges(
					this.writeNode(childPath, childValue, {
						revision,
						merge: false,
						currentValue: null,
					}),
				);
			}

			updateFor.push({
				path: pathInfo.path,
				content: {
					type: mainNode.type,
					value: mainNode.value,
					revision: revision,
					revision_nr: 1,
					created: Date.now(),
					modified: Date.now(),
				},
			});
		}

		updateFor.forEach((node) => {
			pathChanges.removed = pathChanges.removed.concat(this.deleteNode(node.path, true));
			this.nodes.set(node.path, node);
			//length > 0 ? changes.changed.unshift(node.path) : changes.added.unshift(node.path);
		});

		const allPaths = [...pathChanges.added, ...pathChanges.changed];
		pathChanges.removed = pathChanges.removed.filter((p, i, l) => !allPaths.includes(p));

		return Object.fromEntries(
			Object.entries(pathChanges).map(([k, paths]) => {
				return [k, paths.filter((p, i, l) => l.indexOf(p) === i)];
			}),
		) as any;
	}

	/**
	 * Exclui um nó no armazenamento com o caminho especificado.
	 * @param path - O caminho do nó a ser excluído.
	 * @param specificNode - Um valor booleano que indica se apenas um nó específico deve ser excluído.
	 * @returns {string[]} Uma lista de caminhos dos nós excluídos.
	 */
	private deleteNode(path: string, specificNode: boolean = false): string[] {
		const pathInfo = PathInfo.get(path);
		let removed: string[] = [];
		this.nodes.removeItems(({ path }) => {
			const nodePath = PathInfo.get(path);
			const isPersists = specificNode ? pathInfo.path !== nodePath.path : !pathInfo.isAncestorOf(nodePath) && pathInfo.path !== nodePath.path;
			if (!isPersists) {
				removed.push(path);
			}
			return !isPersists;
		});
		return removed;
	}

	/**
	 * Define um nó no armazenamento com o caminho e valor especificados.
	 * @param path - O caminho do nó a ser definido.
	 * @param value - O valor a ser armazenado no nó.
	 * @param options - Opções adicionais para controlar o comportamento da definição.
	 * @param options.assert_revision - Uma string que representa a revisão associada ao nó, se necessário.
	 * @returns {NodeChanges} As alterações feitas no nó, incluindo alterações, adições e remoções.
	 */
	setNode(
		path: string,
		value: any,
		options: {
			assert_revision?: string;
		} = {},
	): NodeChanges {
		const pathInfo = PathInfo.get(path);

		let changes: NodeChanges;

		try {
			if (path === "") {
				if (value === null || typeof value !== "object" || value instanceof Array || value instanceof ArrayBuffer || ("buffer" in value && value.buffer instanceof ArrayBuffer)) {
					throw new Error(`Invalid value for root node: ${value}`);
				}

				changes = this.writeNode("", value, { merge: false });
			} else if (typeof options.assert_revision !== "undefined") {
				const info = this.getInfoBy(path);

				if (info.revision !== options.assert_revision) {
					throw new NodeRevisionError(`revision '${info.revision}' does not match requested revision '${options.assert_revision}'`);
				}

				if (info.address && info.address.path === path && value !== null && !this.valueFitsInline(value)) {
					// Overwrite node
					changes = this.writeNode(path, value, { merge: false });
				} else {
					// Update parent node
					// const lockPath = transaction.moveToParentPath(pathInfo.parentPath);
					// assert(lockPath === pathInfo.parentPath, `transaction.moveToParentPath() did not move to the right parent path of "${path}"`);
					changes = this.writeNode(pathInfo.parentPath, { [pathInfo.key as any]: value }, { merge: true });
				}
			} else {
				// Delegate operation to update on parent node
				// const lockPath = await transaction.moveToParentPath(pathInfo.parentPath);
				// assert(lockPath === pathInfo.parentPath, `transaction.moveToParentPath() did not move to the right parent path of "${path}"`);
				changes = this.updateNode(pathInfo.parentPath, { [pathInfo.key as any]: value });
			}
		} catch (err) {
			throw err;
		}

		this.applyChanges(changes);
		return changes;
	}

	/**
	 * Atualiza um nó no armazenamento com o caminho e atualizações especificados.
	 * @param path - O caminho do nó a ser atualizado.
	 * @param updates - As atualizações a serem aplicadas ao nó.
	 * @returns {NodeChanges} As alterações feitas no nó, incluindo alterações, adições e remoções.
	 */
	private updateNode(path: string, updates: any): NodeChanges {
		let changes: NodeChanges = {
			added: [],
			changed: [],
			removed: [],
		};

		if (typeof updates !== "object") {
			throw new Error(`invalid updates argument`); //. Must be a non-empty object or array
		} else if (Object.keys(updates).length === 0) {
			return changes; // Nothing to update. Done!
		}

		try {
			const nodeInfo = this.getInfoBy(path);
			const pathInfo = PathInfo.get(path);

			if (nodeInfo.exists && nodeInfo.address && nodeInfo.address.path === path) {
				changes = this.writeNode(path, updates, { merge: true });
			} else if (nodeInfo.exists) {
				// Node exists, but is stored in its parent node.
				// const pathInfo = PathInfo.get(path);
				// const lockPath = transaction.moveToParentPath(pathInfo.parentPath);
				// assert(lockPath === pathInfo.parentPath, `transaction.moveToParentPath() did not move to the right parent path of "${path}"`);
				changes = this.writeNode(pathInfo.parentPath, { [pathInfo.key as any]: updates }, { merge: true });
			} else {
				// The node does not exist, it's parent doesn't have it either. Update the parent instead
				// const lockPath = transaction.moveToParentPath(pathInfo.parentPath);
				// assert(lockPath === pathInfo.parentPath, `transaction.moveToParentPath() did not move to the right parent path of "${path}"`);
				changes = this.updateNode(pathInfo.parentPath, { [pathInfo.key as any]: updates });
			}
		} catch (err) {
			throw err;
		}

		return changes;
	}

	/**
	 * Importa um valor JSON no nó com o caminho especificado.
	 * @param path - O caminho do nó onde o valor JSON será importado.
	 * @param value - O valor JSON a ser importado.
	 * @returns {Node} O próprio nó.
	 */
	importJson(path: string, value: any): Node {
		this.setNode(path, value);
		return this;
	}

	/**
	 * Analisa e armazena um valor JSON no nó com o caminho especificado.
	 * @param path - O caminho do nó onde o valor JSON será armazenado.
	 * @param value - O valor JSON a ser armazenado.
	 * @param options - Opções adicionais para controlar o comportamento do armazenamento.
	 * @returns {StorageNodeInfo[]} Uma lista de informações sobre os nós armazenados.
	 */
	static parse(path: string, value: any, options: Partial<NodeSettings> = {}): StorageNodeInfo[] {
		const n = new Node([], options);
		n.writeNode(path, value);
		return n.getNodesBy(path);
	}

	/**
	 * Exporta os nós para um nó montado.
	 * @param {string} path - Caminho de um nó raiz.
	 * @param {boolean} onlyChildren - Se verdadeiro, exporta apenas os filhos do nó especificado.
	 * @param {boolean} includeChildrenDedicated - Se verdadeiro, inclui os filhos separadamente.
	 * @returns {StorageNodeInfo} O nó montado.
	 */
	getNode(path: string, onlyChildren: boolean = false, includeChildrenDedicated: boolean = true): StorageNodeInfo {
		const pathRoot: PathInfo = new PathInfo(path);

		let nodes: StorageNodeInfo[] = this.getNodesBy(pathRoot.path);

		let byNodes = nodes.map((node) => {
			node = JSON.parse(JSON.stringify(node));
			node.content = this.processReadNodeValue(node.content);
			return node;
		}) as StorageNodeInfo[];

		let revision = (byNodes[0]?.content ?? {}).revision ?? ID.generate();

		const rootNode: StorageNodeInfo = {
			path: pathRoot.path,
			content: {
				type: 1,
				value: {},
				revision: revision,
				revision_nr: 1,
				created: Date.now(),
				modified: Date.now(),
			},
		};

		if (byNodes.length === 0) {
			return rootNode;
		}

		byNodes.sort((a: StorageNodeInfo, b: StorageNodeInfo): number => {
			const pathA = PathInfo.get(a.path);
			const pathB = PathInfo.get(b.path);
			return pathA.isDescendantOf(pathB.path) ? 1 : pathB.isDescendantOf(pathA.path) ? -1 : 0;
		});

		const rootExists = byNodes.findIndex(({ path }) => pathRoot.path === path) >= 0;

		if (!rootExists) {
			rootNode.content.revision = byNodes[0]?.content.revision ?? revision;
			rootNode.content.revision_nr = byNodes[0]?.content.revision_nr ?? 1;
			rootNode.content.created = byNodes[0]?.content.created ?? Date.now();
			rootNode.content.modified = byNodes[0]?.content.modified ?? Date.now();
			byNodes.unshift(rootNode);
		}

		const { path: shiftNodePath, content: targetNode } = byNodes.shift() as StorageNodeInfo;

		const result = targetNode;

		if (!includeChildrenDedicated) {
			onlyChildren = false;
		}

		if (onlyChildren) {
			byNodes = byNodes
				.filter((node) => {
					const nodePath = PathInfo.get(node.path);
					const isChild = nodePath.isChildOf(shiftNodePath);
					if (!isChild && nodePath.isDescendantOf(shiftNodePath)) {
						const childKeys = PathInfo.get(nodePath.path.replace(new RegExp(`^${shiftNodePath}`, "gi"), "")).keys;
						if (childKeys[1] && !(childKeys[1] in result.value)) {
							result.value[childKeys[1]] = typeof childKeys[2] === "number" ? [] : {};
						}
					}
					return isChild;
				})
				.map((node) => {
					node.content.value = node.content.type === VALUE_TYPES.OBJECT ? {} : node.content.type === VALUE_TYPES.ARRAY ? [] : node.content.value;
					return node;
				})
				.filter((node) => node.content.value !== null);
		}

		const objectToArray = (obj: Record<string, any>) => {
			// Convert object value to array
			const arr = [] as any[];
			Object.keys(obj).forEach((key) => {
				const index = parseInt(key);
				arr[index] = obj[index];
			});
			return arr;
		};

		if (targetNode.type === VALUE_TYPES.ARRAY) {
			result.value = objectToArray(result.value);
		}

		if ([VALUE_TYPES.OBJECT, VALUE_TYPES.ARRAY].includes(targetNode.type)) {
			const targetPathKeys = PathInfo.getPathKeys(shiftNodePath);
			const value = targetNode.value;

			for (let { path: otherPath, content: otherNode } of byNodes) {
				const pathKeys = PathInfo.getPathKeys(otherPath);
				const trailKeys = pathKeys.slice(targetPathKeys.length);
				let parent = value;

				for (let j = 0; j < trailKeys.length; j++) {
					assert(typeof parent === "object", "parent must be an object/array to have children!!");
					const key = trailKeys[j];
					const isLast = j === trailKeys.length - 1;
					const nodeType = isLast ? otherNode.type : typeof trailKeys[j + 1] === "number" ? VALUE_TYPES.ARRAY : VALUE_TYPES.OBJECT;
					let nodeValue: any;

					if (!isLast) {
						nodeValue = nodeType === VALUE_TYPES.OBJECT ? {} : [];
					} else {
						nodeValue = otherNode.value;
						if (nodeType === VALUE_TYPES.ARRAY) {
							nodeValue = objectToArray(nodeValue);
						}
					}

					const mergePossible = key in parent && typeof parent[key] === typeof nodeValue && [VALUE_TYPES.OBJECT, VALUE_TYPES.ARRAY].includes(nodeType);

					if (mergePossible) {
						Object.keys(nodeValue).forEach((childKey) => {
							parent[key][childKey] = nodeValue[childKey];
						});
					} else {
						parent[key] = nodeValue;
					}

					parent = parent[key];
				}
			}
		}

		if (!includeChildrenDedicated && [VALUE_TYPES.OBJECT, VALUE_TYPES.ARRAY].includes(result.type)) {
			Object.keys(result.value).forEach((key) => {
				const val = result.value[key];
				delete (result.value as Record<string, any>)[key];
				if (val === null || typeof val === "undefined") {
					return;
				}
				if (this.valueFitsInline(val)) {
					(result.value as Record<string, any>)[key] = val;
				} else {
					delete (result.value as Record<string, any>)[key];
				}
			});
		}

		return {
			path: shiftNodePath,
			content: result,
		};
	}

	/**
	 * Converte uma lista de nós em um objeto JSON.
	 * @param {StorageNodeInfo[]} nodes - Uma lista de nós a serem convertidos.
	 * @param {boolean} onlyChildren - Se verdadeiro, converte apenas os filhos dos nós.
	 * @param {Partial<NodeSettings>} options - Opções adicionais para controlar o comportamento da conversão.
	 * @returns {StorageNodeInfo} O objeto JSON convertido.
	 */
	static toJson(nodes: StorageNodeInfo[], onlyChildren: boolean = false, options: Partial<NodeSettings> = {}): StorageNodeInfo {
		return new Node(nodes, options).getNode("", onlyChildren);
	}
}
