import { SimpleEventEmitter } from "ivipbase-core";
import { CustomStorageNodeInfo, NodesPending, StorageNode, StorageNodeInfo } from "./NodeInfo";
import { VALUE_TYPES } from "./utils";
export { VALUE_TYPES, StorageNode, StorageNodeInfo };
/**
 * Representa as configurações de um MDE.
 */
export declare class MDESettings {
    /**
     * O prefixo associado ao armazenamento de dados. Por padrão, é "root".
     * @type {string}
     * @default "root"
     */
    prefix: string;
    /**
     * Tamanho máximo, em bytes, dos dados filhos a serem armazenados em um registro pai
     * antes de serem movidos para um registro dedicado. O valor padrão é 50.
     * @type {number}
     * @default 50
     */
    maxInlineValueSize: number;
    /**
     * Em vez de lançar erros em propriedades não definidas, esta opção permite
     * remover automaticamente as propriedades não definidas. O valor padrão é false.
     * @type {boolean}
     * @default false
     */
    removeVoidProperties: boolean;
    /**
     * @returns {Promise<any>}
     */
    commit: () => Promise<any> | any;
    /**
     * @param reason
     */
    rollback: (reason: Error) => Promise<any> | any;
    /**
     * Uma função que realiza um get/pesquisa de dados na base de dados com base em uma expressão regular resultada da propriedade pathToRegex em MDE.
     *
     * @type {((expression: RegExp) => Promise<StorageNodeInfo[]> | StorageNodeInfo[]) | undefined}
     * @default undefined
     */
    getMultiple: (expression: RegExp) => Promise<StorageNodeInfo[]> | StorageNodeInfo[];
    /**
     * Uma função que realiza um set de um node na base de dados com base em um path especificado.
     *
     * @type {(((path:string, content: StorageNode, node: StorageNodeInfo) => Promise<void> | void) | undefined}
     * @default undefined
     */
    setNode: (path: string, content: StorageNode, node: StorageNodeInfo) => Promise<void> | void;
    /**
     * Uma função que realiza um remove de um node na base de dados com base em um path especificado.
     *
     * @type {(((path:string, content: StorageNode, node: StorageNodeInfo) => Promise<void> | void) | undefined}
     * @default undefined
     */
    removeNode: (path: string, content: StorageNode, node: StorageNodeInfo) => Promise<void> | void;
    init: ((this: MDE) => void) | undefined;
    /**
     * Cria uma instância de MDESettings com as opções fornecidas.
     * @param options - Opções para configurar o node.
     */
    constructor(options: Partial<MDESettings>);
}
export default class MDE extends SimpleEventEmitter {
    /**
     * As configurações do node.
     */
    readonly settings: MDESettings;
    /**
     * Uma lista de informações sobre nodes, mantido em cache até que as modificações sejam processadas no BD com êxito.
     *
     * @type {NodesPending[]}
     */
    private nodes;
    private batch;
    private sendingNodes;
    constructor(options?: Partial<MDESettings>);
    private init;
    /**
     * Converte um caminho em uma expressão regular.
     *
     * @param {string} path - O caminho a ser convertido em expressão regular.
     * @param {boolean} [onlyChildren=false] - Se verdadeiro, exporta apenas os filhos do node especificado.
     * @param {boolean} [allHeirs=false] - Se verdadeiro, exporta todos os descendentes em relação ao path especificado.
     * @returns {RegExp} - A expressão regular resultante.
     */
    private pathToRegex;
    /**
     * Verifica se um caminho específico existe no nó.
     * @param path - O caminho a ser verificado.
     * @returns {Promise<boolean>} `true` se o caminho existir no nó, `false` caso contrário.
     */
    isPathExists(path: string): Promise<boolean>;
    /**
     * Obtém uma lista de nodes com base em um caminho e opções adicionais.
     *
     * @param {string} path - O caminho a ser usado para filtrar os nodes.
     * @param {boolean} [onlyChildren=false] - Se verdadeiro, exporta apenas os filhos do node especificado.
     * @param {boolean} [allHeirs=false] - Se verdadeiro, exporta todos os descendentes em relação ao path especificado.
     * @returns {Promise<StorageNodeInfo[]>} - Uma Promise que resolve para uma lista de informações sobre os nodes.
     * @throws {Error} - Lança um erro se ocorrer algum problema durante a busca assíncrona.
     */
    getNodesBy(path: string, onlyChildren?: boolean, allHeirs?: boolean): Promise<StorageNodeInfo[]>;
    /**
     * Obtém o node pai de um caminho específico.
     * @param path - O caminho para o qual o node pai deve ser obtido.
     * @returns {Promise<StorageNodeInfo | undefined>} O node pai correspondente ao caminho ou `undefined` se não for encontrado.
     */
    getNodeParentBy(path: string): Promise<StorageNodeInfo | undefined>;
    sendNodes(): Promise<void>;
    /**
     * Adiciona um ou mais nodes a matriz de nodes atual e aplica evento de alteração.
     * @param nodes - Um ou mais nós a serem adicionados.
     * @returns {MDE} O nó atual após a adição dos nós.
     */
    pushNode(...nodes: (NodesPending[] | NodesPending)[]): MDE;
    /**
     * Obtém informações personalizadas sobre um node com base no caminho especificado.
     *
     * @param {string} path - O caminho do node para o qual as informações devem ser obtidas.
     * @returns {CustomStorageNodeInfo} - Informações personalizadas sobre o node especificado.
     */
    getInfoBy(path: string, options?: {
        include_child_count?: boolean;
    }): Promise<CustomStorageNodeInfo>;
    getChildren(path: string): {
        next: (callback: (info: CustomStorageNodeInfo) => false | undefined) => Promise<void>;
    };
    /**
     * Obtém valor referente ao path específico.
     *
     * @template T - Tipo genérico para o retorno da função.
     * @param {string} path - Caminho de um node raiz.
     * @param {boolean} [onlyChildren=true] - Se verdadeiro, exporta apenas os filhos do node especificado.
     * @return {Promise<T | undefined>} - Retorna valor referente ao path ou undefined se nenhum node for encontrado.
     */
    get<t = any>(path: string, options?: {
        include?: string[];
        exclude?: string[];
        onlyChildren?: boolean;
    }): Promise<t | undefined>;
    /**
     * Define um valor no armazenamento com o caminho especificado.
     *
     * @param {string} path - O caminho do node a ser definido.
     * @param {any} value - O valor a ser armazenado em nodes.
     * @param {Object} [options] - Opções adicionais para controlar o comportamento da definição.
     * @param {string} [options.assert_revision] - Uma string que representa a revisão associada ao node, se necessário.
     * @returns {Promise<void>}
     */
    set(path: string, value: any, options?: {
        assert_revision?: string;
    }): Promise<void>;
    update(path: string, value: any, options?: {
        assert_revision?: string;
    }): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map