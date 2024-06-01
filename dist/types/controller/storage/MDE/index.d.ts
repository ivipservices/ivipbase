import { DebugLogger, SimpleEventEmitter, Types } from "ivipbase-core";
import { CustomStorageNodeInfo, StorageNode, StorageNodeInfo } from "./NodeInfo";
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
     * @type {((database: database: string, expression: {regex: RegExp, query: string[] }, simplifyValues?: boolean) => Promise<StorageNodeInfo[]> | StorageNodeInfo[]) | undefined}
     * @default undefined
     */
    getMultiple: (database: string, expression: {
        regex: RegExp;
        query: string[];
    }, simplifyValues?: boolean) => Promise<StorageNodeInfo[]> | StorageNodeInfo[];
    /**
     * Uma função que realiza um set de um node na base de dados com base em um path especificado.
     *
     * @type {(((path:string, content: StorageNode, node: StorageNodeInfo) => Promise<void> | void) | undefined}
     * @default undefined
     */
    setNode: (database: string, path: string, content: StorageNode, node: StorageNodeInfo) => Promise<void> | void;
    /**
     * Uma função que realiza um remove de um node na base de dados com base em um path especificado.
     *
     * @type {(((path:string, content: StorageNode, node: StorageNodeInfo) => Promise<void> | void) | undefined}
     * @default undefined
     */
    removeNode: (database: string, path: string, content: StorageNode, node: StorageNodeInfo) => Promise<void> | void;
    init: ((this: MDE) => void) | undefined;
    /**
     * Cria uma instância de MDESettings com as opções fornecidas.
     * @param options - Opções para configurar o node.
     */
    constructor(options: Partial<MDESettings>);
}
export default class MDE extends SimpleEventEmitter {
    protected _ready: boolean;
    /**
     * As configurações do node.
     */
    readonly settings: MDESettings;
    private _lastTid;
    createTid(): string | number;
    private schemas;
    constructor(options?: Partial<MDESettings>);
    get debug(): DebugLogger;
    private init;
    /**
     * Aguarda o serviço estar pronto antes de executar o seu callback.
     * @param callback (opcional) função de retorno chamada quando o serviço estiver pronto para ser usado. Você também pode usar a promise retornada.
     * @returns retorna uma promise que resolve quando estiver pronto
     */
    ready(callback?: () => void): Promise<void>;
    /**
     * Converte um caminho em uma consulta de expressão regular e SQL LIKE pattern.
     *
     * @param {string} path - O caminho a ser convertido.
     * @param {boolean} [onlyChildren=false] - Se verdadeiro, exporta apenas os filhos do node especificado.
     * @param {boolean} [allHeirs=false] - Se verdadeiro, exporta todos os descendentes em relação ao path especificado.
     * @returns {{regex: RegExp, query: string[]}} - O objeto contendo a expressão regular e a query resultante.
     */
    private preparePathQuery;
    /**
     * Verifica se um caminho específico existe no nó.
     * @param {string} database - Nome do banco de dados.
     * @param path - O caminho a ser verificado.
     * @returns {Promise<boolean>} `true` se o caminho existir no nó, `false` caso contrário.
     */
    isPathExists(database: string, path: string): Promise<boolean>;
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
    getNodesBy(database: string, path: string, onlyChildren?: boolean, allHeirs?: boolean | number, includeAncestor?: boolean, simplifyValues?: boolean): Promise<StorageNodeInfo[]>;
    /**
     * Obtém o node pai de um caminho específico.
     * @param {string} database - Nome do banco de dados.
     * @param path - O caminho para o qual o node pai deve ser obtido.
     * @returns {Promise<StorageNodeInfo | undefined>} O node pai correspondente ao caminho ou `undefined` se não for encontrado.
     */
    getNodeParentBy(database: string, path: string): Promise<StorageNodeInfo | undefined>;
    /**
     * Obtém informações personalizadas sobre um node com base no caminho especificado.
     *
     * @param {string} database - Nome do banco de dados.
     * @param {string} path - O caminho do node para o qual as informações devem ser obtidas.
     * @returns {CustomStorageNodeInfo} - Informações personalizadas sobre o node especificado.
     */
    getInfoBy(database: string, path: string, options?: {
        include_child_count?: boolean;
        include_prefix?: boolean;
        cache_nodes?: StorageNodeInfo[];
    }): Promise<CustomStorageNodeInfo>;
    getChildren(database: string, path: string, options?: {
        keyFilter?: string[] | number[];
    }): {
        next: (callback: (info: CustomStorageNodeInfo) => false | undefined) => Promise<void>;
    };
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
    get<t = any>(database: string, path: string, options?: {
        include?: Array<string | number>;
        exclude?: Array<string | number>;
        onlyChildren?: boolean;
        include_info_node?: boolean;
    }): Promise<t | undefined>;
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
    get<t = any>(database: string, path: string, options: {
        include?: Array<string | number>;
        exclude?: Array<string | number>;
        onlyChildren?: boolean;
        include_info_node: boolean;
    }): Promise<StorageNode | undefined>;
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
    set(database: string, path: string, value: any, options?: {
        assert_revision?: string;
        tid?: string;
        suppress_events?: boolean;
        context?: {
            [k: string]: any;
        };
    }, type?: "SET" | "UPDATE"): Promise<void>;
    update(database: string, path: string, value: any, options?: {
        assert_revision?: string;
        tid?: string;
        suppress_events?: boolean;
        context?: {
            [k: string]: any;
        };
    }): Promise<void>;
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
    transact(database: string, path: string, callback: (value: any) => any, options?: Partial<{
        tid: string;
        suppress_events: boolean;
        context: object;
        no_lock: boolean;
    }>): Promise<string | void>;
    byPrefix(prefix: string): MDE;
    /**
     * Adiciona, atualiza ou remove uma definição de esquema para validar os valores do nó antes que sejam armazenados no caminho especificado
     * @param database nome do banco de dados
     * @param path caminho de destino para impor o esquema, pode incluir curingas. Ex: 'users/*\/posts/*' ou 'users/$uid/posts/$postid'
     * @param schema definições de tipo de esquema. Quando um valor nulo é passado, um esquema previamente definido é removido.
     */
    setSchema(database: string, path: string, schema: string | object, warnOnly?: boolean): void;
    /**
     * Obtém a definição de esquema atualmente ativa para o caminho especificado
     */
    getSchema(database: string, path: string): {
        path: string;
        schema: string | object;
        text: string;
    };
    /**
     * Obtém todas as definições de esquema atualmente ativas
     */
    getSchemas(database: string): {
        path: string;
        schema: string | object;
        text: string;
    }[];
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
    validateSchema(database: string, path: string, value: any, options?: {
        /**
         * Se um nó existente está sendo atualizado (mesclado), isso só irá impor regras de esquema definidas nas propriedades que estão sendo atualizadas.
         */
        updates: boolean;
    }): Types.ISchemaCheckResult;
}
//# sourceMappingURL=index.d.ts.map