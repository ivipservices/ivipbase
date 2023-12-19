import NodeInfo from "./NodeInfo";
import { NodeAddress } from "./NodeAddress";
import { SimpleEventEmitter } from "ivipbase-core";
export * from "./NodeAddress";
export * from "./NodeCache";
export * from "./NodeChanges";
export { default as NodeInfo } from "./NodeInfo";
export * from "./NodeLock";
export declare class NodeNotFoundError extends Error {
}
export declare class NodeRevisionError extends Error {
}
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
export declare class CustomStorageNodeInfo extends NodeInfo {
    address?: NodeAddress;
    revision: string;
    revision_nr: number;
    created: Date;
    modified: Date;
    constructor(info: Omit<CustomStorageNodeInfo, "valueType" | "valueTypeName">);
}
/** Interface for metadata being stored for nodes */
export declare class StorageNodeMetaData {
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
}
/** Interface for metadata combined with a stored value */
export declare class StorageNode extends StorageNodeMetaData {
    /** only Object, Array, large string and binary values. */
    value: any;
    constructor();
}
export interface StorageNodeInfo {
    path: string;
    content: StorageNode;
}
/**
 * Representa as configurações de um nó de armazenamento.
 */
export declare class NodeSettings {
    /**
     * Tamanho máximo, em bytes, dos dados filhos a serem armazenados em um registro pai
     * antes de serem movidos para um registro dedicado. O valor padrão é 50.
     * @default 50
     */
    maxInlineValueSize: number;
    /**
     * Em vez de lançar erros em propriedades não definidas, esta opção permite
     * remover automaticamente as propriedades não definidas. O valor padrão é false.
     * @default false
     */
    removeVoidProperties: boolean;
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
    constructor(options: Partial<NodeSettings>);
}
interface NodeChanges {
    changed: string[] | any[];
    added: string[] | any[];
    removed: string[] | any[];
}
/**
 * Uma classe estendida de Map que oferece métodos adicionais para manipular seus valores.
 *
 * @template k O tipo das chaves no mapa.
 * @template v O tipo dos valores no mapa.
 */
declare class CustomMap<k = any, v = any> extends Map<k, v> {
    /**
     * Filtra os valores do mapa com base em um callback e retorna um array dos valores que atendem à condição.
     *
     * @param {function(v, k): boolean} callback - A função de callback que define a condição para filtrar os valores.
     * @returns {v[]} Um array dos valores filtrados.
     */
    filterValues(callback: (value: v, key: k) => boolean | void): v[];
    /**
     * Encontra a primeira chave que atende a uma condição definida em um callback.
     *
     * @param {function(v, k): boolean} callback - A função de callback que define a condição de busca.
     * @returns {k | undefined} A primeira chave que atende à condição ou `undefined` se nenhuma chave for encontrada.
     */
    findIndex(callback: (value: v, key: k) => boolean | void): k | undefined;
    /**
     * Encontra o primeiro valor que atende a uma condição definida em um callback.
     *
     * @param {function(v, k): boolean} callback - A função de callback que define a condição de busca.
     * @returns {v | undefined} O primeiro valor que atende à condição ou `undefined` se nenhum valor for encontrado.
     */
    find(callback: (value: v, key: k) => boolean | void): v | undefined;
    /**
     * Remove os itens do mapa que atendem a uma condição definida em um callback.
     *
     * @param {function(v, k): boolean} callback - A função de callback que define a condição para remover os itens.
     */
    removeItems(callback: (value: v, key: k) => boolean): void;
    /**
     * Mapeia os valores do mapa e retorna um array de resultados após aplicar um callback a cada valor.
     *
     * @template t O tipo dos resultados do mapeamento.
     * @param {function(v, k): t} callback - A função de callback que mapeia os valores.
     * @returns {t[]} Um array dos resultados do mapeamento.
     */
    map<t = any>(callback: (value: v, key: k) => t): t[];
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
    readonly nodes: CustomMap<string, StorageNodeInfo>;
    /**
     * Cria uma nova instância de Node.
     * @param byNodes - Uma matriz de informações sobre nós de armazenamento para inicializar o nó.
     * @param options - Opções para configurar o nó.
     */
    constructor(byNodes?: StorageNodeInfo[], options?: Partial<NodeSettings>);
    /**
     * Aplica as alterações especificadas ao nó.
     * @param changes - Um objeto contendo as alterações a serem aplicadas.
     */
    private applyChanges;
    /**
     * Verifica se um caminho específico existe no nó.
     * @param path - O caminho a ser verificado.
     * @returns {boolean} `true` se o caminho existir no nó, `false` caso contrário.
     */
    isPathExists(path: string): boolean;
    /**
     * Sincroniza o nó com os nós correspondentes com base no caminho especificado.
     * @param path - O caminho a ser sincronizado.
     * @param allHeirs - Um valor booleano que determina se todos os herdeiros devem ser sincronizados.
     * @returns {Promise<void>} Uma promessa que é resolvida após a sincronização.
     */
    synchronize(path: string, allHeirs?: boolean): Promise<void>;
    /**
     * Adiciona um ou mais nós ao nó atual.
     * @param nodes - Um ou mais nós a serem adicionados.
     * @returns {Node} O nó atual após a adição dos nós.
     */
    push(...nodes: (StorageNodeInfo[] | StorageNodeInfo)[]): this;
    static get VALUE_TYPES(): Record<"EMPTY" | "OBJECT" | "ARRAY" | "NUMBER" | "BOOLEAN" | "STRING" | "BIGINT" | "DATETIME" | "BINARY" | "REFERENCE" | "DEDICATED_RECORD", NodeValueType>;
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
    private getKeysBy;
    /**
     * Obtém informações personalizadas sobre um nó com base no caminho especificado.
     * @param path - O caminho do nó para o qual as informações devem ser obtidas.
     * @param options - Opções adicionais para controlar o comportamento.
     * @param options.include_child_count - Um valor booleano que indica se o número de filhos deve ser incluído nas informações.
     * @returns {CustomStorageNodeInfo} Informações personalizadas sobre o nó especificado.
     */
    getInfoBy(path: string, options?: {
        include_child_count?: boolean;
    }): CustomStorageNodeInfo;
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
    private writeNode;
    /**
     * Exclui um nó no armazenamento com o caminho especificado.
     * @param path - O caminho do nó a ser excluído.
     * @param specificNode - Um valor booleano que indica se apenas um nó específico deve ser excluído.
     * @returns {string[]} Uma lista de caminhos dos nós excluídos.
     */
    private deleteNode;
    /**
     * Define um nó no armazenamento com o caminho e valor especificados.
     * @param path - O caminho do nó a ser definido.
     * @param value - O valor a ser armazenado no nó.
     * @param options - Opções adicionais para controlar o comportamento da definição.
     * @param options.assert_revision - Uma string que representa a revisão associada ao nó, se necessário.
     * @returns {NodeChanges} As alterações feitas no nó, incluindo alterações, adições e remoções.
     */
    setNode(path: string, value: any, options?: {
        assert_revision?: string;
    }): NodeChanges;
    /**
     * Atualiza um nó no armazenamento com o caminho e atualizações especificados.
     * @param path - O caminho do nó a ser atualizado.
     * @param updates - As atualizações a serem aplicadas ao nó.
     * @returns {NodeChanges} As alterações feitas no nó, incluindo alterações, adições e remoções.
     */
    private updateNode;
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
     * @param options - Opções adicionais para controlar o comportamento do armazenamento.
     * @returns {StorageNodeInfo[]} Uma lista de informações sobre os nós armazenados.
     */
    static parse(path: string, value: any, options?: Partial<NodeSettings>): StorageNodeInfo[];
    /**
     * Exporta os nós para um nó montado.
     * @param {string} path - Caminho de um nó raiz.
     * @param {boolean} onlyChildren - Se verdadeiro, exporta apenas os filhos do nó especificado.
     * @param {boolean} includeChildrenDedicated - Se verdadeiro, inclui os filhos separadamente.
     * @returns {StorageNodeInfo} O nó montado.
     */
    getNode(path: string, onlyChildren?: boolean, includeChildrenDedicated?: boolean): StorageNodeInfo;
    /**
     * Converte uma lista de nós em um objeto JSON.
     * @param {StorageNodeInfo[]} nodes - Uma lista de nós a serem convertidos.
     * @param {boolean} onlyChildren - Se verdadeiro, converte apenas os filhos dos nós.
     * @param {Partial<NodeSettings>} options - Opções adicionais para controlar o comportamento da conversão.
     * @returns {StorageNodeInfo} O objeto JSON convertido.
     */
    static toJson(nodes: StorageNodeInfo[], onlyChildren?: boolean, options?: Partial<NodeSettings>): StorageNodeInfo;
}
//# sourceMappingURL=index.d.ts.map