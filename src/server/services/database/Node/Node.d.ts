import { StorageNodeInfo, VALUE_TYPES, nodeValueTypes, CustomStorageNodeInfo, NodeChanges } from "./index";

interface NodeChanges {
	changed: StorageNodeInfo[];
	added: StorageNodeInfo[];
	removed: StorageNodeInfo[];
}

/**
 * Classe que representa um nó com configurações específicas.
 */
export default class Node extends SimpleEventEmitter {
	constructor(byNodes: StorageNodeInfo[] = []);

	/**
	 * Verifica se um caminho específico existe no nó.
	 * @param path - O caminho a ser verificado.
	 * @returns {boolean} `true` se o caminho existir no nó, `false` caso contrário.
	 */
	isPathExists(path: string): boolean;

	/**
	 * Adiciona um ou mais nós ao nó atual.
	 * @param nodes - Um ou mais nós a serem adicionados.
	 * @returns {Node} O nó atual após a adição dos nós.
	 */
	push(nodes: StorageNodeInfo[]);

	static get VALUE_TYPES(): typeof VALUE_TYPES;

	/**
	 * Verifica se um valor pode ser armazenado em um objeto pai ou se deve ser movido
	 * para um registro dedicado com base nas configurações de tamanho máximo (`maxInlineValueSize`).
	 * @param value - O valor a ser verificado.
	 * @returns {boolean} `true` se o valor pode ser armazenado inline, `false` caso contrário.
	 * @throws {TypeError} Lança um erro se o tipo do valor não for suportado.
	 */
	valueFitsInline(value: any): boolean;

	/**
	 * Obtém um valor tipado apropriado para armazenamento com base no tipo do valor fornecido.
	 * @param val - O valor a ser processado.
	 * @returns {any} O valor processado.
	 * @throws {Error} Lança um erro se o valor não for suportado ou se for nulo.
	 */
	getTypedChildValue(val: any):
		| string
		| number
		| boolean
		| {
				type: (typeof nodeValueTypes)[keyof Pick<typeof nodeValueTypes, "DATETIME" | "REFERENCE" | "BINARY">];
				value: string | number | boolean;
		  }
		| undefined;

	/**
	 * Processa o valor de um nó de armazenamento durante a leitura, convertendo valores tipados de volta ao formato original.
	 * @param node - O nó de armazenamento a ser processado.
	 * @returns {StorageNode} O nó de armazenamento processado.
	 * @throws {Error} Lança um erro se o tipo de registro autônomo for inválido.
	 */
	processReadNodeValue(node: StorageNode): StorageNode;

	/**
	 * Obtém uma matriz de informações sobre nós de armazenamento com base no caminho especificado.
	 * @param path - O caminho para o qual os nós devem ser obtidos.
	 * @returns {StorageNodeInfo[]} Uma matriz de informações sobre os nós correspondentes ao caminho.
	 */
	getNodesBy(path: string): StorageNodeInfo[];

	/**
	 * Obtém o nó pai de um caminho específico.
	 * @param path - O caminho para o qual o nó pai deve ser obtido.
	 * @returns {StorageNodeInfo | undefined} O nó pai correspondente ao caminho ou `undefined` se não for encontrado.
	 */
	getNodeParentBy(path: string): StorageNodeInfo | undefined;

	getResponsibleNodeBy(path: string): StorageNodeInfo | undefined;

	/**
	 * Obtém as chaves dos nós filhos de um caminho específico.
	 * @param path - O caminho para o qual as chaves dos nós filhos devem ser obtidas.
	 * @returns {string[]} Uma matriz de chaves dos nós filhos.
	 */
	getKeysBy(path: string): string[];

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
	): CustomStorageNodeInfo;

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
	): NodeChanges;

	/**
	 * Importa um valor JSON no nó com o caminho especificado.
	 * @param path - O caminho do nó onde o valor JSON será importado.
	 * @param value - O valor JSON a ser importado.
	 * @returns {Node} O próprio nó.
	 */
	importJson(path: string, value: any): Node;

	/**
	 * Analisa e armazena um valor JSON no nó com o caminho especificado.
	 * @param path - O caminho do nó onde o valor JSON será armazenado.
	 * @param value - O valor JSON a ser armazenado.
	 * @returns {StorageNodeInfo[]} Uma lista de informações sobre os nós armazenados.
	 */
	static parse(path: string, value: any): StorageNodeInfo[];

	/**
	 * Exporta os nós para um nó montado.
	 * @param {string} path - Caminho de um nó raiz.
	 * @param {boolean} onlyChildren - Se verdadeiro, exporta apenas os filhos do nó especificado.
	 * @param {boolean} includeChildrenDedicated - Se verdadeiro, inclui os filhos separadamente.
	 * @returns {StorageNodeInfo} O nó montado.
	 */
	getNode(path: string, onlyChildren: boolean = false, includeChildrenDedicated: boolean = true): StorageNodeInfo;

	getNodeChanges(): NodeChanges;
}
