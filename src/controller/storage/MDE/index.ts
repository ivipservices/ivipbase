import { PathInfo, SimpleEventEmitter, Utils } from "ivipbase-core";
import { CustomStorageNodeInfo, NodeAddress, NodesPending, StorageNode, StorageNodeInfo } from "./NodeInfo";
import { NodeValueType, VALUE_TYPES, getValueType, nodeValueTypes, processReadNodeValue, promiseState } from "./utils";
import prepareMergeNodes from "./prepareMergeNodes";
import structureNodes from "./structureNodes";
import destructureData from "./destructureData";
import { removeNulls } from "../../../utils";

export { VALUE_TYPES, StorageNode, StorageNodeInfo };

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
	 * @type {((expression: RegExp) => Promise<StorageNodeInfo[]> | StorageNodeInfo[]) | undefined}
	 * @default undefined
	 */
	getMultiple: (database: string, expression: RegExp) => Promise<StorageNodeInfo[]> | StorageNodeInfo[] = () => [];

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

	/**
	 * As configurações do node.
	 */
	readonly settings: MDESettings;

	/**
	 * Uma lista de informações sobre nodes, mantido em cache até que as modificações sejam processadas no BD com êxito.
	 *
	 * @type {NodesPending[]}
	 */
	private nodes: Record<string, NodesPending[]> = {};

	constructor(options: Partial<MDESettings> = {}) {
		super();
		this.settings = new MDESettings(options);
		this.once("ready", () => {
			this._ready = true;
		});
		this.init();
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
			await new Promise((resolve) => this.on("ready", resolve));
		}
		callback?.();
	}

	/**
	 * Converte um caminho em uma expressão regular.
	 *
	 * @param {string} path - O caminho a ser convertido em expressão regular.
	 * @param {boolean} [onlyChildren=false] - Se verdadeiro, exporta apenas os filhos do node especificado.
	 * @param {boolean} [allHeirs=false] - Se verdadeiro, exporta todos os descendentes em relação ao path especificado.
	 * @returns {RegExp} - A expressão regular resultante.
	 */
	private pathToRegex(path: string, onlyChildren: boolean = false, allHeirs: boolean = false): RegExp {
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
		pathsRegex.push(replasePathToRegex(path));

		if (onlyChildren) {
			pathsRegex.forEach((exp) => pathsRegex.push(`${exp}((\/([^\/]*)){1})`));
		} else if (allHeirs) {
			pathsRegex.forEach((exp) => pathsRegex.push(`${exp}((\/([^\/]*)){1,})`));
		}

		// Obtém o caminho pai e adiciona a expressão regular correspondente ao array.
		pathsRegex.push(replasePathToRegex(PathInfo.get(path).parentPath as any));

		// Cria a expressão regular completa combinando as expressões individuais no array.
		const fullRegex: RegExp = new RegExp(`^(${pathsRegex.join("$)|(")}$)`);

		return fullRegex;
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
	async getNodesBy(database: string, path: string, onlyChildren: boolean = false, allHeirs: boolean = false): Promise<StorageNodeInfo[]> {
		const reg = this.pathToRegex(path, onlyChildren, allHeirs);
		let nodeList: StorageNodeInfo[] = (this.nodes[database] ?? [])
			.filter(({ path }) => reg.test(path))
			.sort(({ content: { modified: aM } }, { content: { modified: bM } }) => {
				return aM > bM ? -1 : aM < bM ? 1 : 0;
			})
			.filter(({ path }, i, list) => {
				return list.findIndex(({ path: p }) => PathInfo.get(p).equals(path)) === i;
			})
			.sort(({ path: a }, { path: b }) => {
				return PathInfo.get(a).isAncestorOf(b) ? 1 : PathInfo.get(a).isDescendantOf(b) ? -1 : 0;
			});

		// console.log("getNodesBy::1::", JSON.stringify(nodeList, null, 4));

		let byNodes: StorageNodeInfo[] = [];

		try {
			byNodes = await this.settings.getMultiple(database, reg);
		} catch {}

		// console.log("getNodesBy::2::", JSON.stringify(byNodes, null, 4));

		const { result } = prepareMergeNodes.apply(this, [byNodes, nodeList]);

		let nodes = result.filter(({ path: p }) => PathInfo.get(path).equals(p));

		if (nodes.length <= 0) {
			nodes = result.filter(({ path: p }) => PathInfo.get(path).isChildOf(p));
		} else if (onlyChildren) {
			nodes = result.filter(({ path: p }) => PathInfo.get(path).equals(p) || PathInfo.get(path).isParentOf(p));
		} else if (allHeirs) {
			nodes = result.filter(({ path: p }) => PathInfo.get(path).equals(p) || PathInfo.get(path).isAncestorOf(p));
		}

		return nodes;
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

	async sendNodes(database: string) {
		const batch = this.nodes[database].splice(0).sort(({ content: { modified: aM } }, { content: { modified: bM } }) => {
			return aM > bM ? -1 : aM < bM ? 1 : 0;
		});

		const batchError: NodesPending[] = [];

		try {
			const forAsync = prepareMergeNodes.apply(this, [batch]);

			let byNodes: StorageNodeInfo[] = [];

			const paths = batch
				.filter((node, i, self) => {
					return self.findIndex(({ path }) => path === node.path) === i;
				})
				.map(({ path }) => path);

			for (const path of paths) {
				const reg = this.pathToRegex(path, false, false);
				const by = await this.settings.getMultiple(database, reg);
				byNodes = byNodes.concat(by);
			}

			byNodes = byNodes.filter((node, i, self) => {
				return self.findIndex(({ path }) => path === node.path) === i;
			});

			const { added, modified, removed, result } = prepareMergeNodes.apply(this, [byNodes, batch]);

			// console.log("added: ", JSON.stringify(added, null, 4));
			// console.log("modified: ", JSON.stringify(modified, null, 4));
			// console.log("removed: ", JSON.stringify(removed, null, 4));
			// console.log("result: ", JSON.stringify(result, null, 4));

			for (let node of modified) {
				await Promise.race([this.settings.setNode(database, node.path, removeNulls(node.content), removeNulls(node))]).catch(() => {
					batchError.push(node);
				});
			}

			for (let node of added) {
				await Promise.race([this.settings.setNode(database, node.path, removeNulls(node.content), removeNulls(node))]).catch(() => {
					batchError.push(node);
				});
			}

			for (let node of removed) {
				const reg = this.pathToRegex(node.path, false, true);
				const byNodes = await this.settings.getMultiple(database, reg);

				for (let r of byNodes) {
					await Promise.race([this.settings.removeNode(database, r.path, r.content, r)]).catch(() => {
						batchError.push({
							path: r.path,
							content: {
								...r.content,
								type: 0,
								value: null,
							},
						});
					});
				}
			}
		} catch {}

		const next = Object.keys(this.nodes).find((n) => this.nodes[n].length > 0);
		if (next) {
			this.sendNodes(next);
		}
	}

	/**
	 * Adiciona um ou mais nodes a matriz de nodes atual e aplica evento de alteração.
	 * @param {string} database - Nome do banco de dados.
	 * @param nodes - Um ou mais nós a serem adicionados.
	 * @returns {MDE} O nó atual após a adição dos nós.
	 */
	pushNode(database: string, ...nodes: (NodesPending[] | NodesPending)[]): MDE {
		const forNodes: NodesPending[] =
			Array.prototype.concat
				.apply(
					[],
					nodes.map((node) => (Array.isArray(node) ? node : [node])),
				)
				.filter((node: any = {}) => node && typeof node.path === "string" && "content" in node) ?? [];

		if (!Array.isArray(this.nodes[database])) {
			this.nodes[database] = [];
		}

		for (let node of forNodes) {
			this.nodes[database].push(node);
		}

		this.sendNodes(database);
		return this;
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
		} = {},
	): Promise<CustomStorageNodeInfo> {
		const pathInfo = PathInfo.get(path);
		const nodes = await this.getNodesBy(database, path, options.include_child_count, false);
		const mainNode = nodes.find(({ path: p }) => PathInfo.get(p).equals(path) || PathInfo.get(p).isParentOf(path));

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

		if (!mainNode || !pathInfo.key) {
			return defaultNode;
		}

		const content = processReadNodeValue(mainNode.content);
		let value = content.value;

		if (pathInfo.isChildOf(mainNode.path)) {
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
			path: pathInfo.path,
			key: typeof pathInfo.key === "string" ? pathInfo.key : undefined,
			index: typeof pathInfo.key === "number" ? pathInfo.key : undefined,
			type: value !== null ? getValueType(value) : containsChild ? (isArrayChild ? VALUE_TYPES.ARRAY : VALUE_TYPES.OBJECT) : (0 as NodeValueType),
			exists: value !== null || containsChild,
			address: new NodeAddress(mainNode.path),
			created: new Date(content.created) ?? new Date(),
			modified: new Date(content.modified) ?? new Date(),
			revision: content.revision ?? "",
			revision_nr: content.revision_nr ?? 0,
		});

		info.value = value ? value : null;

		if (options.include_child_count && (containsChild || isArrayChild)) {
			info.childCount = nodes.reduce((c, { path: p }) => c + (pathInfo.isParentOf(p) ? 1 : 0), Object.keys(info.value).length);
		}

		return info;
	}

	getChildren(database: string, path: string) {
		const pathInfo = PathInfo.get(path);

		const next = async (callback: (info: CustomStorageNodeInfo) => false | undefined) => {
			const nodes = await this.getNodesBy(database, path, true, false);
			let isContinue = true;

			for (let node of nodes) {
				if (!isContinue) {
					break;
				}

				if (pathInfo.equals(node.path) && pathInfo.isDescendantOf(node.path)) {
					continue;
				}

				const info = await this.getInfoBy(database, node.path, { include_child_count: false });

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
	 * @param {boolean} [onlyChildren=true] - Se verdadeiro, exporta apenas os filhos do node especificado.
	 * @return {Promise<T | undefined>} - Retorna valor referente ao path ou undefined se nenhum node for encontrado.
	 */
	async get<t = any>(
		database: string,
		path: string,
		options?: {
			include?: string[];
			exclude?: string[];
			onlyChildren?: boolean;
		},
	): Promise<t | undefined> {
		path = PathInfo.get([this.settings.prefix, path]).path;
		const nodes = await this.getNodesBy(database, path, options?.onlyChildren, true);
		// console.log(JSON.stringify(nodes, null, 4));
		return removeNulls(structureNodes(path, nodes, options));
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
		} = {},
		type: "SET" | "UPDATE" = "SET",
	): Promise<void> {
		path = PathInfo.get([this.settings.prefix, path]).path;
		const nodes = destructureData.apply(this, [type, path, value, options]);
		//console.log("now", JSON.stringify(nodes.find((node) => node.path === "root/test") ?? {}, null, 4));
		const byNodes = await this.getNodesBy(database, path, false, true);
		//console.log("olt", JSON.stringify(byNodes.find((node) => node.path === "root/test") ?? {}, null, 4));
		const { added, modified, removed } = prepareMergeNodes.apply(this, [byNodes, nodes]);

		// console.log("set", JSON.stringify(nodes, null, 4));
		// console.log("set-added", JSON.stringify(added, null, 4));
		// console.log("set-modified", JSON.stringify(modified, null, 4));
		// console.log("set-removed", JSON.stringify(removed, null, 4));

		for (let node of modified) {
			this.emit("change", {
				name: "change",
				path: PathInfo.get(PathInfo.get(node.path).keys.slice(1)).path,
				value: removeNulls(node.content.value),
				previous: removeNulls(node.previous_content?.value),
			});
		}

		for (let node of added) {
			this.emit("add", {
				name: "add",
				path: PathInfo.get(PathInfo.get(node.path).keys.slice(1)).path,
				value: removeNulls(node.content.value),
			});
		}

		for (let node of removed) {
			const reg = this.pathToRegex(node.path, false, true);
			Promise.race([this.settings.getMultiple(database, reg)]).then((byNodes) => {
				for (let r of byNodes) {
					this.emit("remove", {
						name: "remove",
						path: PathInfo.get(PathInfo.get(node.path).keys.slice(1)).path,
						value: removeNulls(r.content.value),
					});
				}
			});
		}

		this.pushNode(database, nodes);
	}

	async update(
		database: string,
		path: string,
		value: any,
		options: {
			assert_revision?: string;
		} = {},
	): Promise<void> {
		this.set(database, path, value, options, "UPDATE");
	}
}
