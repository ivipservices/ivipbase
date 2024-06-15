import { DebugLogger, ID, PathInfo, SchemaDefinition, SimpleEventEmitter, Types, Utils } from "ivipbase-core";
import { CustomStorageNodeInfo, NodeAddress, NodesPending, StorageNode, StorageNodeInfo } from "./NodeInfo";
import { NodeValueType, VALUE_TYPES, getTypeFromStoredValue, getValueType, nodeValueTypes, processReadNodeValue, promiseState } from "./utils";
import prepareMergeNodes from "./prepareMergeNodes";
import structureNodes from "./structureNodes";
import destructureData from "./destructureData";
import { joinObjects, removeNulls, replaceUndefined } from "../../../utils";

export type { StorageNode, StorageNodeInfo };
export { VALUE_TYPES };

const DEBUG_MODE = false;

const NOOP = () => {};

/**
 * Representa as configurações de um MDE.
 */
export class MDESettings {
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
	 * @returns {Promise<any>}
	 */
	commit: () => Promise<any> | any = () => {};

	/**
	 * @param reason
	 */
	rollback: (reason: Error) => Promise<any> | any = () => {};

	/**
	 * Uma função que realiza um get/pesquisa de dados na base de dados com base em uma expressão regular resultada da propriedade pathToRegex em MDE.
	 *
	 * @type {((database: database: string, expression: {regex: RegExp, query: string[] }, simplifyValues?: boolean) => Promise<StorageNodeInfo[]> | StorageNodeInfo[]) | undefined}
	 * @default undefined
	 */
	getMultiple: (
		database: string,
		expression: {
			regex: RegExp;
			query: string[];
		},
		simplifyValues?: boolean,
	) => Promise<StorageNodeInfo[]> | StorageNodeInfo[] = () => [];

	/**
	 * Uma função que realiza um set de um node na base de dados com base em um path especificado.
	 *
	 * @type {(((path:string, content: StorageNode, node: StorageNodeInfo) => Promise<void> | void) | undefined}
	 * @default undefined
	 */
	setNode: (database: string, path: string, content: StorageNode, node: StorageNodeInfo) => Promise<void> | void = () => {};

	/**
	 * Uma função que realiza um remove de um node na base de dados com base em um path especificado.
	 *
	 * @type {(((path:string, content: StorageNode, node: StorageNodeInfo) => Promise<void> | void) | undefined}
	 * @default undefined
	 */
	removeNode: (database: string, path: string, content: StorageNode, node: StorageNodeInfo) => Promise<void> | void = () => {};

	init: ((this: MDE) => void) | undefined;

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

		if (typeof options.commit === "function") {
			this.commit = options.commit;
		}

		if (typeof options.rollback === "function") {
			this.rollback = options.rollback;
		}

		this.getMultiple = async (database, reg) => {
			if (typeof options.getMultiple === "function") {
				return await Promise.race([options.getMultiple(database, reg)]).then((response) => {
					return Promise.resolve(response ?? []);
				});
			}
			return [];
		};

		this.setNode = async (database, path, content, node) => {
			if (typeof options.setNode === "function") {
				await Promise.race([options.setNode(database, path, removeNulls(content), removeNulls(node))]);
			}
		};

		this.removeNode = async (database, path, content, node) => {
			if (typeof options.removeNode === "function") {
				await Promise.race([options.removeNode(database, path, removeNulls(content), removeNulls(node))]);
			}
		};

		if (typeof options.init === "function") {
			this.init = options.init;
		}
	}
}

export default class MDE extends SimpleEventEmitter {
	protected _ready = false;
	// readonly debug: DebugLogger = new DebugLogger(undefined, "MDE");

	/**
	 * As configurações do node.
	 */
	readonly settings: MDESettings;

	private _lastTid: number;
	createTid() {
		return DEBUG_MODE ? ++this._lastTid : ID.generate();
	}

	private schemas: { [dbName: string]: Array<{ path: string; schema: SchemaDefinition }> } = {};

	constructor(options: Partial<MDESettings> = {}) {
		super();
		this.settings = new MDESettings(options);
		this._lastTid = 0;
		this.on("ready", () => {
			this._ready = true;
		});
		this.init();
	}

	get debug(): DebugLogger {
		return new DebugLogger(undefined, "MDE");
	}

	private init() {
		if (typeof this.settings.init === "function") {
			this.settings.init.apply(this, []);
		}
	}

	/**
	 * Aguarda o serviço estar pronto antes de executar o seu callback.
	 * @param callback (opcional) função de retorno chamada quando o serviço estiver pronto para ser usado. Você também pode usar a promise retornada.
	 * @returns retorna uma promise que resolve quando estiver pronto
	 */
	async ready(callback?: () => void) {
		if (!this._ready) {
			// Aguarda o evento ready
			await new Promise((resolve) => this.once("ready", resolve));
		}
		callback?.();
	}

	destructureData(
		path: string,
		value: any,
		options: {
			assert_revision?: string;
		} = {},
		type: "SET" | "UPDATE" = "SET",
	) {
		type = typeof value !== "object" || value instanceof Array || value instanceof ArrayBuffer || value instanceof Date ? "UPDATE" : type;
		path = PathInfo.get([this.settings.prefix, path]).path;
		return destructureData(type, path, value, { ...(options ?? {}), ...this.settings });
	}

	/**
	 * Converte um caminho em uma consulta de expressão regular e SQL LIKE pattern.
	 *
	 * @param {string} path - O caminho a ser convertido.
	 * @param {boolean} [onlyChildren=false] - Se verdadeiro, exporta apenas os filhos do node especificado.
	 * @param {boolean} [allHeirs=false] - Se verdadeiro, exporta todos os descendentes em relação ao path especificado.
	 * @returns {{regex: RegExp, query: string[]}} - O objeto contendo a expressão regular e a query resultante.
	 */
	private preparePathQuery(path: string, onlyChildren: boolean = false, allHeirs: boolean | number = false, includeAncestor: boolean = false): { regex: RegExp; query: string[] } {
		const pathsRegex: string[] = [];
		const querys: string[] = [];
		const pathsLike: string[] = [];

		/**
		 * Substitui o caminho por uma expressão regular.
		 * @param path - O caminho a ser convertido em expressão regular.
		 * @returns {string} O caminho convertido em expressão regular.
		 */
		const replasePathToRegex = (path: string) => {
			path = path.replace(/\/((\*)|(\$[^/\$]*))/g, "/([^/]*)");
			path = path.replace(/\[\*\]/g, "\\[(\\d+)\\]");
			path = path.replace(/\[(\d+)\]/g, "\\[$1\\]");
			return path;
		};

		/**
		 * Substitui o caminho por um padrão SQL LIKE.
		 * @param path - O caminho a ser convertido em um padrão SQL LIKE.
		 * @returns {string} O caminho convertido em um padrão SQL LIKE.
		 */
		const replacePathToLike = (path: string): string => {
			path = path.replace(/\/((\*)|(\$[^/\$]*))/g, "/%");
			path = path.replace(/\[\*\]/g, "[%]");
			path = path.replace(/\[(\d+)\]/g, "[$1]");
			return path;
		};

		// Adiciona a expressão regular do caminho principal ao array.
		pathsRegex.push(replasePathToRegex(path));

		// Adiciona o padrão SQL LIKE do caminho principal ao array.
		pathsLike.push(replacePathToLike(path).replace(/\/$/gi, ""));
		querys.push(`LIKE '${replacePathToLike(path).replace(/\/$/gi, "")}'`);

		if (onlyChildren) {
			pathsRegex.forEach((exp) => pathsRegex.push(`${exp}(((\/([^/\\[\\]]*))|(\\[([0-9]*)\\])){1})`));
			pathsLike.forEach((exp) => querys.push(`LIKE '${exp}/%'`));
			pathsLike.forEach((exp) => pathsLike.push(`${exp}/%`));
		} else if (allHeirs === true) {
			pathsRegex.forEach((exp) => pathsRegex.push(`${exp}(((\/([^/\\[\\]]*))|(\\[([0-9]*)\\])){1,})`));
			pathsLike.forEach((exp) => querys.push(`LIKE '${exp}/%'`));
			pathsLike.forEach((exp) => pathsLike.push(`${exp}/%`));
		} else if (typeof allHeirs === "number") {
			pathsRegex.forEach((exp) => pathsRegex.push(`${exp}(((\/([^/\\[\\]]*))|(\\[([0-9]*)\\])){1,${allHeirs}})`));
			// pathsLike.forEach((exp) => querys.push(`LIKE '${exp}/%'`));
			// pathsLike.forEach((exp) => pathsLike.push(`${exp}/%`));
			const p = pathsLike;
			let m = "/%";
			for (let i = 0; i < allHeirs; i++) {
				p.forEach((exp) => querys.push(`LIKE '${exp}${m}'`));
				p.forEach((exp) => pathsLike.push(`${exp}${m}`));
				m += "/%";
			}
		}

		let parent = PathInfo.get(path).parent;

		// Obtém o caminho pai e adiciona a expressão regular correspondente ao array.
		if (includeAncestor) {
			while (parent) {
				pathsRegex.push(replasePathToRegex(parent.path));
				pathsLike.push(replacePathToLike(parent.path).replace(/\/$/gi, ""));
				querys.push(`LIKE '${replacePathToLike(parent.path).replace(/\/$/gi, "")}'`);
				parent = parent.parent;
			}
		} else if (parent) {
			pathsRegex.push(replasePathToRegex(parent.path));
			pathsLike.push(replacePathToLike(parent.path).replace(/\/$/gi, ""));
			querys.push(`LIKE '${replacePathToLike(parent.path).replace(/\/$/gi, "")}'`);
		}

		// Cria a expressão regular completa combinando as expressões individuais no array.
		const fullRegex: RegExp = new RegExp(`^(${pathsRegex.map((e) => e.replace(/\/$/gi, "/?")).join("$)|(")}$)`);

		return {
			regex: fullRegex,
			query: querys.filter((e, i, l) => l.indexOf(e) === i && e !== ""),
		};
	}

	/**
	 * Verifica se um caminho específico existe no nó.
	 * @param {string} database - Nome do banco de dados.
	 * @param path - O caminho a ser verificado.
	 * @returns {Promise<boolean>} `true` se o caminho existir no nó, `false` caso contrário.
	 */
	async isPathExists(database: string, path: string): Promise<boolean> {
		path = PathInfo.get([this.settings.prefix, path]).path;
		const nodeList = await this.getNodesBy(database, path, false, false).then((nodes) => {
			return Promise.resolve(
				nodes
					.sort(({ content: { modified: aM } }, { content: { modified: bM } }) => {
						return aM > bM ? -1 : aM < bM ? 1 : 0;
					})
					.filter(({ path, content: { modified } }, i, l) => {
						const indexRecent = l.findIndex(({ path: p, content: { modified: m } }) => p === path && m > modified);
						return indexRecent < 0 || indexRecent === i;
					}),
			);
		});

		let nodeSelected = nodeList.find(({ path: p }) => PathInfo.get(p).equals(path) || PathInfo.get(p).isParentOf(path));

		if (!nodeSelected) {
			return false;
		} else if (PathInfo.get(nodeSelected.path).isParentOf(path)) {
			const key = PathInfo.get(path).key;
			return key !== null && nodeSelected.content.type === nodeValueTypes.OBJECT && (Object.keys(nodeSelected.content.value) as Array<string | number>).includes(key);
		}

		return PathInfo.get(nodeSelected.path).equals(path);
	}

	/**
	 * Obtém uma lista de nodes com base em um caminho e opções adicionais.
	 *
	 * @param {string} database - Nome do banco de dados.
	 * @param {string} path - O caminho a ser usado para filtrar os nodes.
	 * @param {boolean} [onlyChildren=false] - Se verdadeiro, exporta apenas os filhos do node especificado.
	 * @param {boolean} [allHeirs=false] - Se verdadeiro, exporta todos os descendentes em relação ao path especificado.
	 * @returns {Promise<StorageNodeInfo[]>} - Uma Promise que resolve para uma lista de informações sobre os nodes.
	 * @throws {Error} - Lança um erro se ocorrer algum problema durante a busca assíncrona.
	 */
	async getNodesBy(
		database: string,
		path: string,
		onlyChildren: boolean = false,
		allHeirs: boolean | number = false,
		includeAncestor: boolean = false,
		simplifyValues: boolean = false,
	): Promise<StorageNodeInfo[]> {
		const expression = this.preparePathQuery(path, onlyChildren, allHeirs, includeAncestor);

		// console.log("getNodesBy::1::", reg.source);

		let result: StorageNodeInfo[] = [];

		try {
			result = await this.settings.getMultiple(database, expression, simplifyValues);
		} catch {}

		// console.log("getNodesBy::2::", JSON.stringify(result, null, 4));

		let nodes = result.filter(({ path: p, content }) => PathInfo.get(path).equals(p) && (content.type !== nodeValueTypes.EMPTY || content.value !== null || content.value !== undefined));

		if (nodes.length <= 0) {
			nodes = result.filter(({ path: p }) => PathInfo.get(path).isChildOf(p));
		} else if (onlyChildren) {
			nodes = result.filter(({ path: p }) => PathInfo.get(path).equals(p) || PathInfo.get(path).isParentOf(p));
		} else if (allHeirs === true || typeof allHeirs === "number") {
			nodes = result.filter(({ path: p }) => PathInfo.get(path).equals(p) || PathInfo.get(path).isAncestorOf(p));
		}

		if (includeAncestor) {
			nodes = result.filter(({ path: p }) => PathInfo.get(p).isParentOf(path) || PathInfo.get(p).isAncestorOf(path)).concat(nodes);
		}

		return nodes.filter(({ path }, i, l) => l.findIndex(({ path: p }) => p === path) === i);
	}

	/**
	 * Obtém o node pai de um caminho específico.
	 * @param {string} database - Nome do banco de dados.
	 * @param path - O caminho para o qual o node pai deve ser obtido.
	 * @returns {Promise<StorageNodeInfo | undefined>} O node pai correspondente ao caminho ou `undefined` se não for encontrado.
	 */
	async getNodeParentBy(database: string, path: string): Promise<StorageNodeInfo | undefined> {
		const pathInfo = PathInfo.get(path);

		const nodes = await this.getNodesBy(database, path, false);

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
	 * Obtém informações personalizadas sobre um node com base no caminho especificado.
	 *
	 * @param {string} database - Nome do banco de dados.
	 * @param {string} path - O caminho do node para o qual as informações devem ser obtidas.
	 * @returns {CustomStorageNodeInfo} - Informações personalizadas sobre o node especificado.
	 */
	async getInfoBy(
		database: string,
		path: string,
		options: {
			include_child_count?: boolean;
			include_prefix?: boolean;
			cache_nodes?: StorageNodeInfo[];
		} = {},
	): Promise<CustomStorageNodeInfo> {
		const { include_child_count = true, include_prefix = true, cache_nodes } = options;

		const pathInfo = include_prefix ? PathInfo.get([this.settings.prefix, path]) : PathInfo.get(path);
		const mainPath = include_prefix ? pathInfo.path.replace(this.settings.prefix + "/", "") : pathInfo.path;
		const nodes = await this.getNodesBy(database, pathInfo.path, true, false);
		const mainNode = nodes.find(({ path: p }) => PathInfo.get(p).equals(pathInfo.path) || PathInfo.get(p).isParentOf(pathInfo.path));

		const defaultNode = new CustomStorageNodeInfo({
			path: mainPath,
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

		if (!mainNode) {
			return defaultNode;
		}

		const content = processReadNodeValue(mainNode.content);
		let value = content.value;

		if (pathInfo.isChildOf(mainNode.path) && pathInfo.key) {
			if ([nodeValueTypes.OBJECT, nodeValueTypes.ARRAY].includes(mainNode.content.type as any)) {
				if ((Object.keys(value as any) as Array<string | number>).includes(pathInfo.key)) {
					value = (value as any)[pathInfo.key];
				} else {
					value = null;
				}
			} else {
				value = null;
			}
		}

		const containsChild = nodes.findIndex(({ path: p }) => pathInfo.isParentOf(p)) >= 0;
		const isArrayChild = !containsChild && mainNode.content.type === nodeValueTypes.ARRAY;

		const info = new CustomStorageNodeInfo({
			path: mainPath,
			key: typeof pathInfo.key === "string" ? pathInfo.key : typeof pathInfo.key !== "number" ? "" : undefined,
			index: typeof pathInfo.key === "number" ? pathInfo.key : undefined,
			type: value !== null ? getValueType(value) : containsChild ? (isArrayChild ? VALUE_TYPES.ARRAY : VALUE_TYPES.OBJECT) : (0 as NodeValueType),
			exists: value !== null || containsChild,
			address: new NodeAddress(mainPath),
			created: new Date(content.created) ?? new Date(),
			modified: new Date(content.modified) ?? new Date(),
			revision: content.revision ?? "",
			revision_nr: content.revision_nr ?? 0,
		});

		info.value = value !== null || value !== undefined ? value : null;

		// if (!PathInfo.get(mainNode.path).equals(pathInfo.path)) {
		// 	info.value = (typeof info.key === "string" ? info.value[info.key] : typeof info.index === "number" ? info.value[info.index] : null) ?? null;
		// }

		if (include_child_count && (containsChild || isArrayChild)) {
			info.childCount = nodes.reduce((c, { path: p }) => c + (pathInfo.isParentOf(p) ? 1 : 0), Object.keys(info.value).length);
		}

		if (info.value !== null && ["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(info.value))) {
			info.value = Object.fromEntries(
				Object.entries(info.value).sort((a, b) => {
					const key1 = a[0].toString();
					const key2 = b[0].toString();
					return key1.startsWith("__") && !key2.startsWith("__") ? 1 : !key1.startsWith("__") && key2.startsWith("__") ? -1 : key1 > key2 ? 1 : key1 < key2 ? -1 : 0;
				}),
			);
		}

		return info;
	}

	getChildren(database: string, path: string, options: { keyFilter?: string[] | number[] } = {}) {
		const pathInfo = PathInfo.get([this.settings.prefix, path]);

		const next = async (callback: (info: CustomStorageNodeInfo) => false | undefined) => {
			const nodes = await this.getNodesBy(database, pathInfo.path, true, false);
			const mainNode = nodes.find(({ path: p }) => PathInfo.get(p).equals(pathInfo.path));

			let isContinue = true;

			if (!mainNode || ![VALUE_TYPES.OBJECT, VALUE_TYPES.ARRAY].includes(mainNode.content.type ?? -1)) {
				return;
			}

			const isArray = mainNode.content.type === VALUE_TYPES.ARRAY;
			const value = mainNode.content.value as any;
			let keys = Object.keys(value).map((key) => (isArray ? parseInt(key) : key));

			if (options.keyFilter) {
				keys = keys.filter((key) => (options.keyFilter as any[]).includes(key));
			}

			keys.length > 0 &&
				keys.every((key) => {
					const child = getTypeFromStoredValue(value[key] as any);

					const info = new CustomStorageNodeInfo({
						path: pathInfo.childPath(key).replace(this.settings.prefix + "/", ""),
						key: isArray ? undefined : (key as string),
						index: isArray ? (key as number) : undefined,
						type: child.type,
						address: null,
						exists: true,
						value: child.value,
						revision: mainNode.content.revision,
						revision_nr: mainNode.content.revision_nr,
						created: new Date(mainNode.content.created),
						modified: new Date(mainNode.content.modified),
					});

					isContinue = callback(info) ?? true;
					return isContinue; // stop .every loop if canceled
				});

			if (!isContinue) {
				return;
			}

			const childNodes = nodes
				.filter((node) => !(pathInfo.equals(node.path) || !pathInfo.isParentOf(node.path)))
				.sort((a, b) => {
					const key1 = (PathInfo.get(a.path).key ?? a.path).toString();
					const key2 = (PathInfo.get(b.path).key ?? b.path).toString();

					return key1.startsWith("__") && !key2.startsWith("__") ? 1 : !key1.startsWith("__") && key2.startsWith("__") ? -1 : key1 > key2 ? 1 : key1 < key2 ? -1 : 0;
				});

			for (let node of childNodes) {
				if (!isContinue) {
					break;
				}

				if (pathInfo.equals(node.path) || !pathInfo.isParentOf(node.path)) {
					continue;
				}

				if (options.keyFilter) {
					const key = PathInfo.get(node.path).key;
					if ((options.keyFilter as Array<string | number>).includes(key ?? "")) {
						continue;
					}
				}

				const key = PathInfo.get(node.path).key;

				const info = new CustomStorageNodeInfo({
					path: node.path.replace(this.settings.prefix + "/", ""),
					type: node.content.type,
					key: isArray ? undefined : (key as string) ?? "",
					index: isArray ? (key as number) : undefined,
					address: new NodeAddress(node.path),
					exists: true,
					value: null, // not loaded
					revision: node.content.revision,
					revision_nr: node.content.revision_nr,
					created: new Date(node.content.created),
					modified: new Date(node.content.modified),
				});

				isContinue = callback(info) ?? true;
			}
		};

		return {
			next,
		};
	}

	/**
	 * Obtém valor referente ao path específico.
	 *
	 * @template T - Tipo genérico para o retorno da função.
	 * @param {string} database - Nome do banco de dados.
	 * @param {string} path - Caminho de um node raiz.
	 * @param {Object} [options] - Opções adicionais para controlar o comportamento da busca.
	 * @param {Array<string|number>} [options.include] - Lista de chaves a serem incluídas no valor.
	 * @param {Array<string|number>} [options.exclude] - Lista de chaves a serem excluídas do valor.
	 * @param {boolean} [options.onlyChildren] - Se verdadeiro, exporta apenas os filhos do node especificado.
	 * @return {Promise<T | undefined>} - Retorna valor referente ao path ou undefined se nenhum node for encontrado.
	 */
	async get<t = any>(
		database: string,
		path: string,
		options?: {
			include?: Array<string | number>;
			exclude?: Array<string | number>;
			onlyChildren?: boolean;
			include_info_node?: boolean;
		},
	): Promise<t | undefined>;

	/**
	 * Obtém valor referente ao path específico.
	 * @param {string} database - Nome do banco de dados.
	 * @param {string} path - Caminho de um node raiz.
	 * @param {Object} options - Opções adicionais para controlar o comportamento da busca.
	 * @param {Array<string|number>} options.include - Lista de chaves a serem incluídas no valor.
	 * @param {Array<string|number>} options.exclude - Lista de chaves a serem excluídas do valor.
	 * @param {boolean} options.onlyChildren - Se verdadeiro, exporta apenas os filhos do node especificado.
	 * @param {boolean} options.include_info_node - Se verdadeiro, inclui informações sobre o node no retorno.
	 * @return {Promise<StorageNode | undefined>} - Retorna valor referente ao path ou undefined se nenhum node for encontrado.
	 */
	async get<t = any>(
		database: string,
		path: string,
		options: {
			include?: Array<string | number>;
			exclude?: Array<string | number>;
			onlyChildren?: boolean;
			include_info_node: boolean;
		},
	): Promise<StorageNode | undefined>;
	async get<t = any>(
		database: string,
		path: string,
		options?: {
			include?: Array<string | number>;
			exclude?: Array<string | number>;
			onlyChildren?: boolean;
			include_info_node?: boolean;
		},
	): Promise<t | StorageNode | undefined> {
		const { include_info_node, onlyChildren, ..._options } = options ?? {};
		path = PathInfo.get([this.settings.prefix, path]).path;
		const nodes = await this.getNodesBy(database, path, onlyChildren, true);
		const main_node = nodes.find(({ path: p }) => PathInfo.get(p).equals(path) || PathInfo.get(p).isParentOf(path));
		if (!main_node) {
			return undefined;
		}

		// console.log(JSON.stringify(nodes, null, 4));
		const value = removeNulls(structureNodes(path, nodes, _options)) ?? null;

		return !include_info_node ? value : { ...main_node.content, value };
	}

	/**
	 * Define um valor no armazenamento com o caminho especificado.
	 *
	 * @param {string} database - Nome do banco de dados.
	 * @param {string} path - O caminho do node a ser definido.
	 * @param {any} value - O valor a ser armazenado em nodes.
	 * @param {Object} [options] - Opções adicionais para controlar o comportamento da definição.
	 * @param {string} [options.assert_revision] - Uma string que representa a revisão associada ao node, se necessário.
	 * @returns {Promise<void>}
	 */
	async set(
		database: string,
		path: string,
		value: any,
		options: {
			assert_revision?: string;
			tid?: string;
			suppress_events?: boolean;
			context?: {
				[k: string]: any;
			};
		} = {},
		type: "SET" | "UPDATE" = "SET",
	): Promise<void> {
		type = typeof value !== "object" || value instanceof Array || value instanceof ArrayBuffer || value instanceof Date ? "UPDATE" : type;

		path = PathInfo.get([this.settings.prefix, path]).path;
		const nodes = destructureData(type, path, value, { ...(options ?? {}), ...this.settings });
		//console.log("now", JSON.stringify(nodes.find((node) => node.path === "root/test") ?? {}, null, 4));
		const byNodes = await this.getNodesBy(database, path, false, true, true);
		//console.log("olt", JSON.stringify(byNodes.find((node) => node.path === "root/test") ?? {}, null, 4));
		const { added, modified, removed } = prepareMergeNodes(path, byNodes, nodes);

		// console.log(JSON.stringify(modified, null, 4));

		// console.log("set", JSON.stringify(nodes, null, 4));
		// console.log("set-added", JSON.stringify(added, null, 4));
		// console.log("set-modified", JSON.stringify(modified, null, 4));
		// console.log("set-removed", JSON.stringify(removed, null, 4));

		const suppress_events = options.suppress_events === true;

		const batchError: NodesPending[] = [];
		const promises: (() => Promise<any>)[] = [];

		for (let node of removed) {
			if (!suppress_events) {
				this.emit("remove", {
					dbName: database,
					name: "remove",
					path: PathInfo.get(PathInfo.get(node.path).keys.slice(1)).path,
					value: removeNulls(node.content.value),
				});
			}

			promises.push(async () => {
				try {
					await Promise.race([this.settings.removeNode(database, node.path, node.content, node)]).catch((e) => {
						batchError.push({
							path: node.path,
							content: {
								...node.content,
								type: 0,
								value: null,
							},
						});
					});
				} catch {}
			});
		}

		for (let node of modified) {
			if (!suppress_events) {
				this.emit("change", {
					dbName: database,
					name: "change",
					path: PathInfo.get(PathInfo.get(node.path).keys.slice(1)).path,
					value: removeNulls(node.content.value),
					previous: removeNulls(node.previous_content?.value),
				});
			}

			promises.push(async () => {
				try {
					await Promise.race([this.settings.setNode(database, node.path, removeNulls(node.content), removeNulls(node))]).catch((e) => {
						batchError.push(node);
					});
				} catch {}
			});
		}

		for (let node of added) {
			if (!suppress_events) {
				this.emit("add", {
					dbName: database,
					name: "add",
					path: PathInfo.get(PathInfo.get(node.path).keys.slice(1)).path,
					value: removeNulls(node.content.value),
				});
			}

			promises.push(async () => {
				try {
					await Promise.race([this.settings.setNode(database, node.path, removeNulls(node.content), removeNulls(node))]).catch((e) => {
						batchError.push(node);
					});
				} catch {}
			});
		}

		for (let p of promises) {
			try {
				await p();
			} catch {}
		}
	}

	async update(
		database: string,
		path: string,
		value: any,
		options: {
			assert_revision?: string;
			tid?: string;
			suppress_events?: boolean;
			context?: {
				[k: string]: any;
			};
		} = {},
	): Promise<void> {
		// const beforeValue = await this.get(database, path);
		// value = joinObjects(beforeValue, value);
		await this.set(database, path, value, options, "UPDATE");
	}

	/**
	 * Atualiza um nó obtendo seu valor, executando uma função de retorno de chamada que transforma
	 * o valor atual e retorna o novo valor a ser armazenado. Garante que o valor lido
	 * não mude enquanto a função de retorno de chamada é executada, ou executa a função de retorno de chamada novamente se isso acontecer.
	 * @param database nome do banco de dados
	 * @param path caminho
	 * @param callback função que transforma o valor atual e retorna o novo valor a ser armazenado. Pode retornar uma Promise
	 * @param options opções opcionais usadas pela implementação para chamadas recursivas
	 * @returns Retorna um novo cursor se o registro de transação estiver habilitado
	 */
	async transact(
		database: string,
		path: string,
		callback: (value: any) => any,
		options: Partial<{
			tid: string;
			suppress_events: boolean;
			context: object;
			no_lock: boolean;
		}> = { no_lock: false, suppress_events: false, context: undefined },
	): Promise<string | void> {
		const useFakeLock = options && options.no_lock === true;
		const tid = this.createTid() as string;
		// const lock = useFakeLock
		//     ? { tid, release: NOOP } // Trava falsa, vamos usar verificação de revisão e tentativas novamente em vez disso
		//     : await this.nodeLocker.lock(path, tid, true, 'transactNode');
		const lock = { tid, release: NOOP };

		try {
			const node = await this.get(database, path, { include_info_node: true });
			const checkRevision = node?.revision ?? ID.generate();
			let newValue: any;
			try {
				newValue = await Promise.race([callback(node?.value ?? null)]).catch((err) => {
					this.debug.error(`Error in transaction callback: ${err.message}`);
				});
			} catch (err) {
				this.debug.error(`Error in transaction callback: ${(err as any).message}`);
			}
			if (typeof newValue === "undefined") {
				// Callback did not return value. Cancel transaction
				return;
			}
			const cursor = await this.update(database, path, newValue, { assert_revision: checkRevision, tid: lock.tid, suppress_events: options.suppress_events, context: options.context });
			return cursor;
		} catch (err) {
			throw err;
		} finally {
			lock.release();
		}
	}

	byPrefix(prefix: string): MDE {
		return {
			...this,
			prefix: prefix,
		};
	}

	/**
	 * Adiciona, atualiza ou remove uma definição de esquema para validar os valores do nó antes que sejam armazenados no caminho especificado
	 * @param database nome do banco de dados
	 * @param path caminho de destino para impor o esquema, pode incluir curingas. Ex: 'users/*\/posts/*' ou 'users/$uid/posts/$postid'
	 * @param schema definições de tipo de esquema. Quando um valor nulo é passado, um esquema previamente definido é removido.
	 */
	setSchema(database: string, path: string, schema: string | object, warnOnly = false) {
		const schemas = this.schemas[database] ?? (this.schemas[database] = []);
		if (typeof schema === "undefined") {
			throw new TypeError("schema argument must be given");
		}
		if (schema === null) {
			// Remove o esquema previamente definido no caminho
			const i = schemas.findIndex((s) => s.path === path);
			i >= 0 && schemas.splice(i, 1);
			return;
		}
		// Analise o esquema, adicione ou atualize-o
		const definition = new SchemaDefinition(schema, {
			warnOnly,
			warnCallback: (message: string) => this.debug.warn(message),
		});
		const item = schemas.find((s) => s.path === path);
		if (item) {
			item.schema = definition;
		} else {
			schemas.push({ path, schema: definition });
			schemas.sort((a, b) => {
				const ka = PathInfo.getPathKeys(a.path),
					kb = PathInfo.getPathKeys(b.path);
				if (ka.length === kb.length) {
					return 0;
				}
				return ka.length < kb.length ? -1 : 1;
			});
		}
		this.schemas[database] = schemas;
	}

	/**
	 * Obtém a definição de esquema atualmente ativa para o caminho especificado
	 */
	getSchema(database: string, path: string): { path: string; schema: string | object; text: string } {
		const schemas = this.schemas[database] ?? (this.schemas[database] = []);
		const item = schemas.find((item) => item.path === path);
		return item
			? { path, schema: item.schema.source, text: item.schema.text }
			: {
					path: path,
					schema: {},
					text: "",
			  };
	}

	/**
	 * Obtém todas as definições de esquema atualmente ativas
	 */
	getSchemas(database: string) {
		const schemas = this.schemas[database] ?? (this.schemas[database] = []);
		return schemas.map((item) => ({ path: item.path, schema: item.schema.source, text: item.schema.text }));
	}

	/**
	 * Valida os esquemas do nó que está sendo atualizado e de seus filhos
	 * @param database nome do banco de dados
	 * @param path caminho sendo gravado
	 * @param value o novo valor, ou atualizações para o valor atual
	 * @example
	 * // defina o esquema para cada tag de cada post do usuário:
	 * db.schema.set(
	 *  'root',
	 *  'users/$uid/posts/$postId/tags/$tagId',
	 *  { name: 'string', 'link_id?': 'number' }
	 * );
	 *
	 * // Inserção que falhará:
	 * db.ref('users/352352/posts/572245').set({
	 *  text: 'this is my post',
	 *  tags: { sometag: 'negue isso' } // <-- sometag deve ser do tipo objeto
	 * });
	 *
	 * // Inserção que falhará:
	 * db.ref('users/352352/posts/572245').set({
	 *  text: 'this is my post',
	 *  tags: {
	 *      tag1: { name: 'firstpost', link_id: 234 },
	 *      tag2: { name: 'novato' },
	 *      tag3: { title: 'Não permitido' } // <-- propriedade title não permitida
	 *  }
	 * });
	 *
	 * // Atualização que falha se o post não existir:
	 * db.ref('users/352352/posts/572245/tags/tag1').update({
	 *  name: 'firstpost'
	 * }); // <-- o post está faltando a propriedade text
	 */
	validateSchema(
		database: string,
		path: string,
		value: any,
		options: {
			/**
			 * Se um nó existente está sendo atualizado (mesclado), isso só irá impor regras de esquema definidas nas propriedades que estão sendo atualizadas.
			 */
			updates: boolean;
		} = { updates: false },
	): Types.ISchemaCheckResult {
		const schemas = this.schemas[database] ?? (this.schemas[database] = []);
		let result: Types.ISchemaCheckResult = { ok: true };
		const pathInfo = PathInfo.get(path);

		schemas
			.filter(
				(s) => pathInfo.isOnTrailOf(s.path), //pathInfo.equals(s.path) || pathInfo.isAncestorOf(s.path)
			)
			.every((s) => {
				if (pathInfo.isDescendantOf(s.path)) {
					// Dado que o caminho de verificação é um descendente do caminho de definição de esquema
					const ancestorPath = PathInfo.fillVariables(s.path, path);
					const trailKeys = pathInfo.keys.slice(PathInfo.getPathKeys(s.path).length);
					result = s.schema.check(ancestorPath, value, options.updates, trailKeys);
					return result.ok;
				}

				// Dado que o caminho de verificação está no caminho de definição de esquema ou em um caminho superior
				const trailKeys = PathInfo.getPathKeys(s.path).slice(pathInfo.keys.length);
				if (options.updates === true && trailKeys.length > 0 && !(trailKeys[0] in value)) {
					// Corrige #217: esta atualização em um caminho superior não afeta nenhum dado no caminho alvo do esquema
					return result.ok;
				}
				const partial = options.updates === true && trailKeys.length === 0;
				const check = (path: string, value: any, trailKeys: Array<string | number>): Types.ISchemaCheckResult => {
					if (trailKeys.length === 0) {
						// Check this node
						return s.schema.check(path, value, partial);
					} else if (value === null) {
						return { ok: true }; // Não no final do caminho, mas não há mais nada para verificar
					}
					const key = trailKeys[0];
					if (typeof key === "string" && (key === "*" || key[0] === "$")) {
						// Curinga. Verifique cada chave em valor recursivamente
						if (value === null || typeof value !== "object") {
							// Não é possível verificar os filhos, porque não há nenhum. Isso é
							// possível se outra regra permitir que o valor no caminho atual
							// seja algo diferente de um objeto.
							return { ok: true };
						}
						let result: any;
						Object.keys(value).every((childKey) => {
							const childPath = PathInfo.getChildPath(path, childKey);
							const childValue = value[childKey];
							result = check(childPath, childValue, trailKeys.slice(1));
							return result.ok;
						});
						return result;
					} else {
						const childPath = PathInfo.getChildPath(path, key);
						const childValue = value[key];
						return check(childPath, childValue, trailKeys.slice(1));
					}
				};
				result = check(path, value, trailKeys);
				return result.ok;
			});

		return result;
	}
}
