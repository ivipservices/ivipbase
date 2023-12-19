import { SimpleEventEmitter } from "ivipbase-core";
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
export declare function getValueTypeName(valueType: number): "array" | "binary" | "boolean" | "date" | "number" | "object" | "reference" | "string" | "bigint" | "dedicated_record" | undefined;
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
declare class NodeAddress {
    readonly path: string;
    constructor(path: string);
    toString(): string;
    /**
     * Compares this address to another address
     */
    equals(address: NodeAddress): boolean;
}
declare class NodeInfo {
    path?: string;
    type?: NodeValueType;
    index?: number;
    key?: string;
    exists?: boolean;
    /** TODO: Move this to BinaryNodeInfo */
    address?: NodeAddress;
    value?: any;
    childCount?: number;
    constructor(info: Partial<NodeInfo>);
    get valueType(): NodeValueType | undefined;
    get valueTypeName(): "array" | "binary" | "boolean" | "date" | "number" | "object" | "reference" | "string" | "bigint" | "dedicated_record" | undefined;
    toString(): string;
}
declare class CustomStorageNodeInfo extends NodeInfo {
    address?: NodeAddress;
    revision: string;
    revision_nr: number;
    created: Date;
    modified: Date;
    constructor(info: Omit<CustomStorageNodeInfo, "valueType" | "valueTypeName">);
}
type StorageNodeValue = {
    type: 0;
    value: null;
} | {
    type: 1;
    value: object;
} | {
    type: 2;
    value: any[];
} | {
    type: 3;
    value: number;
} | {
    type: 4;
    value: boolean;
} | {
    type: 5;
    value: string;
} | {
    type: 7;
    value: bigint;
} | {
    type: 6;
    value: number;
} | {
    type: 8;
    value: typeof Uint8Array;
};
/** Interface for metadata combined with a stored value */
export type StorageNode = {
    /** cuid (time sortable revision id). Nodes stored in the same operation share this id */
    revision: string;
    /** Number of revisions, starting with 1. Resets to 1 after deletion and recreation */
    revision_nr: number;
    /** Creation date/time in ms since epoch UTC */
    created: number;
    /** Last modification date/time in ms since epoch UTC */
    modified: number;
    /** Type of the node's value. 1=object, 2=array, 3=number, 4=boolean, 5=string, 6=date, 7=reserved, 8=binary, 9=reference */
    type: NodeValueType;
} & StorageNodeValue;
export interface StorageNodeInfo {
    path: string;
    content: StorageNode;
}
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
type NodesPending = StorageNodeInfo & {
    type?: "SET" | "MODIFY" | "VERIFY";
};
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
     * Verifica se um valor pode ser armazenado em um objeto pai ou se deve ser movido
     * para um registro dedicado com base nas configurações de tamanho máximo (`maxInlineValueSize`).
     * @param value - O valor a ser verificado.
     * @returns {boolean} `true` se o valor pode ser armazenado inline, `false` caso contrário.
     * @throws {TypeError} Lança um erro se o tipo do valor não for suportado.
     */
    private valueFitsInline;
    /**
     * Obtém um valor tipado apropriado para armazenamento com base no tipo do valor fornecido.
     * @param val - O valor a ser processado.
     * @returns {any} O valor processado.
     * @throws {Error} Lança um erro se o valor não for suportado ou se for nulo.
     */
    private getTypedChildValue;
    /**
     * Processa o valor de um nó de armazenamento durante a leitura, convertendo valores tipados de volta ao formato original.
     * @param node - O nó de armazenamento a ser processado.
     * @returns {StorageNode} O nó de armazenamento processado.
     * @throws {Error} Lança um erro se o tipo de registro autônomo for inválido.
     */
    private processReadNodeValue;
    /**
     * Responsável pela mesclagem de nodes soltos, apropriado para evitar conflitos de dados.
     *
     * @param {StorageNodeInfo[]} nodes - Lista de nodes a serem processados.
     * @param {StorageNodeInfo[]} comparison - Lista de nodes para comparação.
     *
     * @returns {{
     *   result: StorageNodeInfo[];
     *   added: StorageNodeInfo[];
     *   modified: StorageNodeInfo[];
     *   removed: StorageNodeInfo[];
     * }} Retorna uma lista de informações sobre os nodes de acordo com seu estado.
     */
    private prepareMergeNodes;
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
    private getNodeParentBy;
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
    get<t = any>(path: string, onlyChildren?: boolean): Promise<t | undefined>;
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
}
export {};
//# sourceMappingURL=MDE.d.ts.map