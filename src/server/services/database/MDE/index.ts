import { randomUUID } from "crypto";
import { PathInfo, PathReference, SimpleEventEmitter, Utils } from "ivipbase-core";

const { encodeString, isDate } = Utils;

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

class NodeAddress {
	constructor(public readonly path: string) {}

	toString() {
		return `"/${this.path}"`;
	}

	/**
	 * Compares this address to another address
	 */
	equals(address: NodeAddress) {
		return this.path === address.path;
	}
}

class NodeInfo {
	path?: string;
	type?: NodeValueType;
	index?: number;
	key?: string;
	exists?: boolean;
	/** TODO: Move this to BinaryNodeInfo */
	address?: NodeAddress;
	value?: any;
	childCount?: number;

	constructor(info: Partial<NodeInfo>) {
		this.path = info.path;
		this.type = info.type;
		this.index = info.index;
		this.key = info.key;
		this.exists = info.exists;
		this.address = info.address;
		this.value = info.value;
		this.childCount = info.childCount;

		if (typeof this.path === "string" && typeof this.key === "undefined" && typeof this.index === "undefined") {
			const pathInfo = PathInfo.get(this.path);
			if (typeof pathInfo.key === "number") {
				this.index = pathInfo.key;
			} else {
				this.key = pathInfo.key as any;
			}
		}
		if (typeof this.exists === "undefined") {
			this.exists = true;
		}
	}

	get valueType() {
		return this.type;
	}

	get valueTypeName() {
		return getValueTypeName(this.valueType as any);
	}

	toString() {
		if (!this.exists) {
			return `"${this.path}" doesn't exist`;
		}
		if (this.address) {
			return `"${this.path}" is ${this.valueTypeName} stored at ${this.address.toString()}`;
		} else {
			return `"${this.path}" is ${this.valueTypeName} with value ${this.value}`;
		}
	}
}

class CustomStorageNodeInfo extends NodeInfo {
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
class StorageNodeMetaData {
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
class StorageNode extends StorageNodeMetaData {
	/** only Object, Array, large string and binary values. */
	value: any = null;
	constructor() {
		super();
	}
}

interface StorageNodeInfo {
	path: string;
	content: StorageNode;
}

/**
 * Representa as configurações de um MDE.
 */
class MDESettings {
	/**
	 * O prefixo associado ao armazenamento de dados. Por padrão, é "root".
	 * @type {string}
	 * @default "root"
	 */
	prefix: string = "root";

	/**
	 * Tamanho máximo, em bytes, dos dados filhos a serem armazenados em um registro pai
	 * antes de serem movidos para um registro dedicado. O valor padrão é 50.
	 * @type {number}
	 * @default 50
	 */
	maxInlineValueSize: number = 50;

	/**
	 * Em vez de lançar erros em propriedades não definidas, esta opção permite
	 * remover automaticamente as propriedades não definidas. O valor padrão é false.
	 * @type {boolean}
	 * @default false
	 */
	removeVoidProperties: boolean = false;

	/**
	 * Uma função que realiza uma pesquisa de dados na base de dados com base em uma expressão regular resultada da propriedade pathToRegex em MDE.
	 *
	 * @type {((expression: RegExp) => Promise<StorageNodeInfo[]> ) | undefined}
	 * @default undefined
	 */
	searchData: ((expression: RegExp) => Promise<StorageNodeInfo[]>) | undefined = undefined;

	/**
	 * Cria uma instância de MDESettings com as opções fornecidas.
	 * @param options - Opções para configurar o node.
	 */
	constructor(options: Partial<MDESettings>) {
		if (typeof options.prefix === "string" && options.prefix.trim() !== "") {
			this.prefix = options.prefix;
		}

		if (typeof options.maxInlineValueSize === "number") {
			this.maxInlineValueSize = options.maxInlineValueSize;
		}

		if (typeof options.removeVoidProperties === "boolean") {
			this.removeVoidProperties = options.removeVoidProperties;
		}

		if (typeof options.removeVoidProperties === "boolean") {
			this.removeVoidProperties = options.removeVoidProperties;
		}

		if (typeof options.searchData === "function") {
			this.searchData = options.searchData;
		}
	}
}

export default class MDE extends SimpleEventEmitter {
	/**
	 * As configurações do node.
	 */
	readonly settings: MDESettings;

	/**
	 * Uma lista de informações sobre nodes, mantido em cache até que as modificações sejam processadas no BD com êxito.
	 *
	 * @type {StorageNodeInfo[]}
	 */
	private nodes: StorageNodeInfo[] = [];

	constructor(options: Partial<MDESettings>) {
		super();
		this.settings = new MDESettings(options);
	}

	/**
	 * Converte um caminho em uma expressão regular.
	 *
	 * @param {string} path - O caminho a ser convertido em expressão regular.
	 * @param {boolean} allHeirs - Indica se todos os descendentes devem ser incluídos.
	 * @returns {RegExp} - A expressão regular resultante.
	 */
	private pathToRegex(path: string, allHeirs: boolean = false): RegExp {
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

		// Adiciona a expressão regular do caminho principal ao array.
		pathsRegex.push(`${replasePathToRegex(path)}(/([^/]*))${allHeirs ? "+" : ""}?`);

		// Obtém o caminho pai e adiciona a expressão regular correspondente ao array.
		const parentPath = new PathInfo(path).parentPath;
		pathsRegex.push(`${replasePathToRegex(parentPath)}(/([^/]*))${allHeirs ? "+" : ""}?`);

		// Cria a expressão regular completa combinando as expressões individuais no array.
		const fullRegex: RegExp = new RegExp(`^(${pathsRegex.join("$)|(")}$)`);

		return fullRegex;
	}

	/**
	 * Verifica se um caminho específico existe no nó.
	 * @param path - O caminho a ser verificado.
	 * @returns {Promise<boolean>} `true` se o caminho existir no nó, `false` caso contrário.
	 */
	async isPathExists(path: string): Promise<boolean> {
		const reg = this.pathToRegex(path, false);
		let nodeList: StorageNodeInfo[] = this.nodes.filter(({ path }) => reg.test(path));

		if (this.settings.searchData) {
			try {
				const response = await this.settings.searchData(reg);
				nodeList = nodeList.concat(response ?? []);
			} catch {}
		}

		nodeList = nodeList
			.sort(({ content: { modified: aM } }, { content: { modified: bM } }) => {
				return aM > bM ? -1 : aM < bM ? 1 : 0;
			})
			.filter(({ path, content: { modified } }, i, l) => {
				const indexRecent = l.findIndex(({ path: p, content: { modified: m } }) => p === path && m > modified);
				return indexRecent < 0 || indexRecent === i;
			});

		return nodeList.findIndex(({ path: p }) => p === path) >= 0;
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
	 * Responsável pela mesclagem de nodes soltos, apropriado para evitar conflitos de dados.
	 * @param nodes - Lista de nodes a serem processados.
	 * @returns {StorageNodeInfo[]} Retorna uma lista de informações sobre os nodes.
	 */
	private prepareMergeNodes = (nodes: StorageNodeInfo[]): StorageNodeInfo[] => {
		const result: StorageNodeInfo[] = [];
		const pathsRemoved: string[] = [];

		for (let node of nodes) {
			const containsUsRemoved: boolean = pathsRemoved.findIndex((path) => PathInfo.get(path).isAncestorOf(node.path)) >= 0;

			if (containsUsRemoved || node.content.type === nodeValueTypes.EMPTY || node.content.value === null) {
				pathsRemoved.push(node.path);
				continue;
			}

			const pathInfo = PathInfo.get(node.path);
			const index = result.findIndex(({ path }) => pathInfo.equals(path) || pathInfo.isParentOf(path) || pathInfo.isChildOf(path));
			if (index < 0) {
				result.push(node);
				continue;
			}

			const lastNode = result[index];

			if (pathInfo.equals(lastNode.path)) {
				switch (lastNode.content.type) {
					case nodeValueTypes.OBJECT:
					case nodeValueTypes.ARRAY: {
						const contents = [lastNode.content, node.content];

						const content_values: object[] = contents.map(({ value }) => value);

						const new_content_value = Object.assign.apply(null, (lastNode.content.modified > node.content.modified ? content_values.reverse() : content_values) as any);

						result[index].content = Object.assign.apply(null, [
							...(lastNode.content.modified > node.content.modified ? contents.reverse() : contents),
							{
								value: new_content_value,
							},
						] as any);

						break;
					}
					default: {
						if (lastNode.content.modified < node.content.modified) {
							result[index] = node;
						}
					}
				}

				continue;
			}

			const parentNodeIsLast = pathInfo.isChildOf(lastNode.path);
			const parentNode = !parentNodeIsLast ? node : lastNode;
			const childNode = parentNodeIsLast ? node : lastNode;
			const childKey = PathInfo.get(childNode.path).key;

			if (parentNode.content.type === nodeValueTypes.OBJECT && childKey !== null) {
				let parentNodeModified: boolean = false;

				if (
					[nodeValueTypes.STRING, nodeValueTypes.BIGINT, nodeValueTypes.BOOLEAN, nodeValueTypes.DATETIME, nodeValueTypes.NUMBER].includes(childNode.content.type as any) &&
					this.valueFitsInline(childNode.content.value)
				) {
					parentNode.content.value[childKey] = childNode.content.value;
					parentNodeModified = true;
				} else if (childNode.content.type === nodeValueTypes.EMPTY) {
					parentNode.content.value[childKey] = null;
					parentNodeModified = true;
				}

				if (parentNodeModified) {
					result[index] = parentNode;
					continue;
				}
			}

			result.push(node);
		}

		return result;
	};

	/**
	 * Obtém uma lista de nodes com base em um caminho e opções adicionais.
	 *
	 * @param {string} path - O caminho a ser usado para filtrar os nodes.
	 * @param {boolean} [allHeirs=false] - Indica se todos os descendentes devem ser incluídos.
	 * @returns {Promise<StorageNodeInfo[]>} - Uma Promise que resolve para uma lista de informações sobre os nodes.
	 * @throws {Error} - Lança um erro se ocorrer algum problema durante a busca assíncrona.
	 */
	private async getNodesBy(path: string, allHeirs: boolean = false): Promise<StorageNodeInfo[]> {
		const reg = this.pathToRegex(path, allHeirs);
		let nodeList: StorageNodeInfo[] = this.nodes.filter(({ path }) => reg.test(path));

		if (this.settings.searchData) {
			try {
				const response = await this.settings.searchData(reg);
				nodeList = nodeList.concat(response ?? []);
			} catch {}
		}

		return this.prepareMergeNodes(
			nodeList.sort(({ content: { modified: aM } }, { content: { modified: bM } }) => {
				return aM > bM ? -1 : aM < bM ? 1 : 0;
			}),
		);
	}

	/**
	 * Obtém o node pai de um caminho específico.
	 * @param path - O caminho para o qual o node pai deve ser obtido.
	 * @returns {Promise<StorageNodeInfo | undefined>} O node pai correspondente ao caminho ou `undefined` se não for encontrado.
	 */
	private async getNodeParentBy(path: string): Promise<StorageNodeInfo | undefined> {
		const pathInfo = PathInfo.get(path);

		const nodes = await this.getNodesBy(path, false);

		return nodes
			.filter((node) => {
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

	/**
	 * Adiciona um ou mais nodes a matriz de nodes atual e aplica evento de alteração.
	 * @param nodes - Um ou mais nós a serem adicionados.
	 * @returns {MDE} O nó atual após a adição dos nós.
	 */
	private pushNode(...nodes: (StorageNodeInfo[] | StorageNodeInfo)[]): MDE {
		const forNodes: StorageNodeInfo[] =
			Array.prototype.concat
				.apply(
					[],
					nodes.map((node) => (Array.isArray(node) ? node : [node])),
				)
				.filter((node: any = {}) => node && typeof node.path === "string" && "content" in node) ?? [];

		for (let node of forNodes) {
			this.nodes.push(node);
		}

		return this;
	}

	/**
	 * Obtém informações personalizadas sobre um node com base no caminho especificado.
	 *
	 * @param {string} path - O caminho do node para o qual as informações devem ser obtidas.
	 * @returns {CustomStorageNodeInfo} - Informações personalizadas sobre o node especificado.
	 */
	getInfoBy(path: string): CustomStorageNodeInfo {
		const pathInfo = PathInfo.get(path);

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

		return defaultNode;
	}

	/**
	 * Obtém valor referente ao path específico.
	 *
	 * @template T - Tipo genérico para o retorno da função.
	 * @param {string} path - Caminho de um node raiz.
	 * @param {boolean} [onlyChildren=true] - Se verdadeiro, exporta apenas os filhos do node especificado.
	 * @return {T | undefined} - Retorna valor referente ao path ou undefined se nenhum node for encontrado.
	 */
	get<t = any>(path: string, onlyChildren: boolean = true): t | undefined {
		return undefined;
	}

	/**
	 * Define um valor no armazenamento com o caminho especificado.
	 *
	 * @param {string} path - O caminho do node a ser definido.
	 * @param {any} value - O valor a ser armazenado em nodes.
	 * @param {Object} [options] - Opções adicionais para controlar o comportamento da definição.
	 * @param {string} [options.assert_revision] - Uma string que representa a revisão associada ao node, se necessário.
	 * @returns {void}
	 */
	set(path: string, value: any, options: { assert_revision?: string } = {}): Result[] {
		const results: Result[] = [];
	
		if (path.trim() === "") {
			throw new Error(`Invalid path node`);
		}
	
		const pathInfo = PathInfo.get(path);
	
		if (typeof value === "object" && !Array.isArray(value)) {
			this.processObject(value, { path: pathInfo.path }, results, options);
		}
		let currentPath = "";
	
		PathInfo.get(path).keys.forEach((part, i) => {
			currentPath += (i > 0 ? "/" : "") + part;
	
			if (!Array.isArray(value)) {
				const arrayResult = {
					path: currentPath.substring(1),
					type: "VERIFY",
					content: {
						// type: nodeValueTypes.ARRAY,
						type: this.getType(value),
						value: {},
						revision: this.generateShortUUID(),
						revision_nr: 1,
						created: Date.now(),
						modified: Date.now(),
					},
				};
				if (arrayResult.path) {
					results.push(arrayResult as any);
				}
			}
		});
	
		const theKey: any = pathInfo.key;
	
		if (Array.isArray(value) && value.length > 0) {
			value.forEach((obj, i) => {
				const currentPath = `${path}[${i}]`;
				const processedValue = {
					[theKey]: obj,
				};
				const arrayResult: Result = {
					path: currentPath,
					type: "SET",
					content: {
						type: nodeValueTypes.ARRAY,
						value: processedValue,
						revision: this.generateShortUUID(),
						revision_nr: 1,
						created: Date.now(),
						modified: Date.now(),
					},
				};
				results.push(arrayResult);
			});
			const arrayResult: Result = {
				path: pathInfo.path,
				type: "SET",
				content: {
					type: nodeValueTypes.ARRAY,
					value: {},
					revision: this.generateShortUUID(),
					revision_nr: 1,
					created: Date.now(),
					modified: Date.now(),
				},
			};
			results.push(arrayResult);
		} else {
			const valueType = this.getType(value);
			const processedValue = {
				[theKey]: value,
			};
	
			if (typeof value === "string") {
				const processedValue = {
					[theKey]: value,
				};
				const nonObjectResult: Result = {
					path: pathInfo.parentPath as string,
					type: "SET",
					content: {
						type: valueType as any,
						value: processedValue,
						revision: this.generateShortUUID(),
						revision_nr: 1,
						created: Date.now(),
						modified: Date.now(),
					},
				};
				results.push(nonObjectResult);
			}
		}
		return results;
	}
	
		
	public getType(value: unknown): number {
		if (Array.isArray(value)) {
			return nodeValueTypes.ARRAY;
		} else if (value && typeof value === "object") {
			return nodeValueTypes.OBJECT;
		} else if (typeof value === "number") {
			return nodeValueTypes.NUMBER;
		} else if (typeof value === "boolean") {
			return nodeValueTypes.BOOLEAN;
		} else if (typeof value === "string") {
			return nodeValueTypes.STRING;
		} else if (typeof value === "bigint") {
			return nodeValueTypes.BIGINT;
		} else if (typeof value === "object" && (value as any).type === 6) {
			return nodeValueTypes.DATETIME;
		} else {
			return nodeValueTypes.EMPTY;
		}
	}

	public generateShortUUID(): string {
		const fullUUID = randomUUID();
		const shortUUID = fullUUID.replace(/-/g, "").slice(0, 24);
		return shortUUID;
	}

	public processObject(obj, pathInfo, results, options) {
		const currentPath = pathInfo.path;
		const { assert_revision = "lnt02q7v0007oohx37705737" } = options;
		const MAX_KEY_LENGTH = 50;
	
		if (typeof obj !== "object" || Array.isArray(obj)) {
			return;
		}
	
		const nonObjectKeys = {};
		let otherObject;
		let maior;
	
		for (const [key, value] of Object.entries(obj)) {
			const childPath = `${currentPath}/${key}`;
	
			if (Array.isArray(value)) {
				value.forEach((element, index) => {
					const arrayElementPath = `${childPath}[${index}]`;
					this.processObject(element, { path: arrayElementPath }, results, options);
				});
				const resultContent = {
					path: childPath,
					type: "SET",
					content: {
						type: nodeValueTypes.ARRAY,
						value: {},
						revision: this.generateShortUUID(),
						revision_nr: 1,
						created: Date.now(),
						modified: Date.now(),
					},
				};
				results.push(resultContent);
			} else if (typeof value === "object") {
				this.processObject(value, { path: childPath }, results, options);
			} else {
				const valueType = this.getType(value);
				if (String(value).length >= MAX_KEY_LENGTH) {
					const resultContent = {
						path: childPath,
						type: "SET",
						content: {
							type: valueType,
							value: value,
							revision: this.generateShortUUID(),
							revision_nr: 1,
							created: Date.now(),
							modified: Date.now(),
						},
					};
					results.push(resultContent);
				} else {
					nonObjectKeys[key] = value;
					if (String(value).length >= MAX_KEY_LENGTH) {
						maior = Object.entries(nonObjectKeys)
							.filter(([k, v]) => typeof v !== "string" || String(v).length >= MAX_KEY_LENGTH)
							.reduce((acc, [k, v]) => {
								acc[k] = v;
								return acc;
							}, {});
					}
				}
			}
		}
	
		if (Object.keys(nonObjectKeys).length > 0) {
			const resultContent = {
				path: currentPath,
				type: "SET",
				content: {
					type: nodeValueTypes.OBJECT,
					value: otherObject || nonObjectKeys,
					revision: this.generateShortUUID(),
					revision_nr: 1,
					created: Date.now(),
					modified: Date.now(),
				},
			};
			results.push(resultContent);
		}
	
		if (maior) {
			const resultContent = {
				path: `${currentPath}/maior`,
				type: "SET",
				content: {
					type: nodeValueTypes.OBJECT,
					value: maior,
					revision: this.generateShortUUID(),
					revision_nr: 1,
					created: Date.now(),
					modified: Date.now(),
				},
			};
			results.push(resultContent);
		}
	}
}


type Result = {
	path: string;
	type: string,
	content: {
		type: (typeof nodeValueTypes)[keyof typeof nodeValueTypes];
		value: Record<string, unknown> | string | number;
		revision: string;
		revision_nr: number;
		created: number;
		modified: number;
	};
};