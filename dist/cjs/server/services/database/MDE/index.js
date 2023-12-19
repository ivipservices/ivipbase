"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MDESettings = exports.getValueType = exports.getNodeValueType = exports.getValueTypeName = exports.VALUE_TYPES = exports.nodeValueTypes = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const ivip_utils_1 = require("ivip-utils");
const { assert } = ivipbase_core_1.Lib;
const NodeRestructureJson_1 = require("../Node/NodeRestructureJson");
const crypto_1 = require("crypto");
exports.nodeValueTypes = {
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
};
exports.VALUE_TYPES = exports.nodeValueTypes;
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
function getValueTypeName(valueType) {
    switch (valueType) {
        case exports.VALUE_TYPES.ARRAY:
            return "array";
        case exports.VALUE_TYPES.BINARY:
            return "binary";
        case exports.VALUE_TYPES.BOOLEAN:
            return "boolean";
        case exports.VALUE_TYPES.DATETIME:
            return "date";
        case exports.VALUE_TYPES.NUMBER:
            return "number";
        case exports.VALUE_TYPES.OBJECT:
            return "object";
        case exports.VALUE_TYPES.REFERENCE:
            return "reference";
        case exports.VALUE_TYPES.STRING:
            return "string";
        case exports.VALUE_TYPES.BIGINT:
            return "bigint";
        case exports.VALUE_TYPES.DEDICATED_RECORD:
            return "dedicated_record";
        default:
            "unknown";
    }
}
exports.getValueTypeName = getValueTypeName;
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
function getValueTypeDefault(valueType) {
    switch (valueType) {
        case exports.VALUE_TYPES.ARRAY:
            return [];
        case exports.VALUE_TYPES.OBJECT:
            return {};
        case exports.VALUE_TYPES.NUMBER:
            return 0;
        case exports.VALUE_TYPES.BOOLEAN:
            return false;
        case exports.VALUE_TYPES.STRING:
            return "";
        case exports.VALUE_TYPES.BIGINT:
            return BigInt(0);
        case exports.VALUE_TYPES.DATETIME:
            return new Date().toISOString();
        case exports.VALUE_TYPES.BINARY:
            return new Uint8Array();
        case exports.VALUE_TYPES.REFERENCE:
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
function getNodeValueType(value) {
    if (value instanceof Array) {
        return exports.VALUE_TYPES.ARRAY;
    }
    else if (value instanceof ivipbase_core_1.PathReference) {
        return exports.VALUE_TYPES.REFERENCE;
    }
    else if (value instanceof ArrayBuffer) {
        return exports.VALUE_TYPES.BINARY;
    }
    else if ((0, ivip_utils_1.isDate)(value)) {
        return exports.VALUE_TYPES.DATETIME;
    }
    // TODO else if (value instanceof DataDocument) { return VALUE_TYPES.DOCUMENT; }
    else if (typeof value === "string") {
        return exports.VALUE_TYPES.STRING;
    }
    else if (typeof value === "object") {
        return exports.VALUE_TYPES.OBJECT;
    }
    else if (typeof value === "bigint") {
        return exports.VALUE_TYPES.BIGINT;
    }
    return exports.VALUE_TYPES.EMPTY;
}
exports.getNodeValueType = getNodeValueType;
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
function getValueType(value) {
    if (value instanceof Array) {
        return exports.VALUE_TYPES.ARRAY;
    }
    else if (value instanceof ivipbase_core_1.PathReference) {
        return exports.VALUE_TYPES.REFERENCE;
    }
    else if (value instanceof ArrayBuffer) {
        return exports.VALUE_TYPES.BINARY;
    }
    else if ((0, ivip_utils_1.isDate)(value)) {
        return exports.VALUE_TYPES.DATETIME;
    }
    // TODO else if (value instanceof DataDocument) { return VALUE_TYPES.DOCUMENT; }
    else if (typeof value === "string") {
        return exports.VALUE_TYPES.STRING;
    }
    else if (typeof value === "object") {
        return exports.VALUE_TYPES.OBJECT;
    }
    else if (typeof value === "number") {
        return exports.VALUE_TYPES.NUMBER;
    }
    else if (typeof value === "boolean") {
        return exports.VALUE_TYPES.BOOLEAN;
    }
    else if (typeof value === "bigint") {
        return exports.VALUE_TYPES.BIGINT;
    }
    return exports.VALUE_TYPES.EMPTY;
}
exports.getValueType = getValueType;
class NodeAddress {
    constructor(path) {
        this.path = path;
    }
    toString() {
        return `"/${this.path}"`;
    }
    /**
     * Compares this address to another address
     */
    equals(address) {
        return ivipbase_core_1.PathInfo.get(this.path).equals(address.path);
    }
}
class NodeInfo {
    constructor(info) {
        this.path = info.path;
        this.type = info.type;
        this.index = info.index;
        this.key = info.key;
        this.exists = info.exists;
        this.address = info.address;
        this.value = info.value;
        this.childCount = info.childCount;
        if (typeof this.path === "string" && typeof this.key === "undefined" && typeof this.index === "undefined") {
            const pathInfo = ivipbase_core_1.PathInfo.get(this.path);
            if (typeof pathInfo.key === "number") {
                this.index = pathInfo.key;
            }
            else {
                this.key = pathInfo.key;
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
        return getValueTypeName(this.valueType);
    }
    toString() {
        if (!this.exists) {
            return `"${this.path}" doesn't exist`;
        }
        if (this.address) {
            return `"${this.path}" is ${this.valueTypeName} stored at ${this.address.toString()}`;
        }
        else {
            return `"${this.path}" is ${this.valueTypeName} with value ${this.value}`;
        }
    }
}
class CustomStorageNodeInfo extends NodeInfo {
    constructor(info) {
        super(info);
        this.revision = info.revision;
        this.revision_nr = info.revision_nr;
        this.created = info.created;
        this.modified = info.modified;
    }
}
/**
 * Representa as configurações de um MDE.
 */
class MDESettings {
    /**
     * Cria uma instância de MDESettings com as opções fornecidas.
     * @param options - Opções para configurar o node.
     */
    constructor(options) {
        /**
         * O prefixo associado ao armazenamento de dados. Por padrão, é "root".
         * @type {string}
         * @default "root"
         */
        this.prefix = "root";
        /**
         * Tamanho máximo, em bytes, dos dados filhos a serem armazenados em um registro pai
         * antes de serem movidos para um registro dedicado. O valor padrão é 50.
         * @type {number}
         * @default 50
         */
        this.maxInlineValueSize = 50;
        /**
         * Em vez de lançar erros em propriedades não definidas, esta opção permite
         * remover automaticamente as propriedades não definidas. O valor padrão é false.
         * @type {boolean}
         * @default false
         */
        this.removeVoidProperties = false;
        /**
         * @returns {Promise<any>}
         */
        this.commit = () => { };
        /**
         * @param reason
         */
        this.rollback = () => { };
        /**
         * Uma função que realiza um get/pesquisa de dados na base de dados com base em uma expressão regular resultada da propriedade pathToRegex em MDE.
         *
         * @type {((expression: RegExp) => Promise<StorageNodeInfo[]> | StorageNodeInfo[]) | undefined}
         * @default undefined
         */
        this.getMultiple = () => [];
        /**
         * Uma função que realiza um set de um node na base de dados com base em um path especificado.
         *
         * @type {(((path:string, content: StorageNode, node: StorageNodeInfo) => Promise<void> | void) | undefined}
         * @default undefined
         */
        this.setNode = () => { };
        /**
         * Uma função que realiza um remove de um node na base de dados com base em um path especificado.
         *
         * @type {(((path:string, content: StorageNode, node: StorageNodeInfo) => Promise<void> | void) | undefined}
         * @default undefined
         */
        this.removeNode = () => { };
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
        this.getMultiple = async (reg) => {
            if (typeof options.getMultiple === "function") {
                return await Promise.race([options.getMultiple(reg)]);
            }
            return [];
        };
        this.setNode = async (path, content, node) => {
            if (typeof options.setNode === "function") {
                await Promise.race([options.setNode(path, content, node)]);
            }
        };
        this.removeNode = async (path, content, node) => {
            if (typeof options.removeNode === "function") {
                await Promise.race([options.removeNode(path, content, node)]);
            }
        };
        if (typeof options.init === "function") {
            this.init = options.init;
        }
    }
}
exports.MDESettings = MDESettings;
class MDE extends ivipbase_core_1.SimpleEventEmitter {
    constructor(options = {}) {
        super();
        /**
         * Uma lista de informações sobre nodes, mantido em cache até que as modificações sejam processadas no BD com êxito.
         *
         * @type {NodesPending[]}
         */
        this.nodes = [];
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
        this.prepareMergeNodes = (nodes, comparison = undefined) => {
            let result = [];
            let added = [];
            let modified = [];
            let removed = [];
            if (!comparison) {
                comparison = nodes;
                nodes = nodes
                    .sort(({ content: { modified: aM } }, { content: { modified: bM } }) => {
                    return aM > bM ? 1 : aM < bM ? -1 : 0;
                })
                    .filter(({ path }, i, list) => {
                    return list.findIndex(({ path: p }) => ivipbase_core_1.PathInfo.get(p).equals(path)) === i;
                });
            }
            if (comparison.length === 0) {
                return {
                    result: nodes,
                    added,
                    modified,
                    removed,
                };
            }
            comparison = comparison.sort(({ content: { modified: aM } }, { content: { modified: bM } }) => {
                return aM > bM ? -1 : aM < bM ? 1 : 0;
            });
            const setNodeBy = (node) => {
                const nodesIndex = nodes.findIndex(({ path }) => ivipbase_core_1.PathInfo.get(node.path).equals(path));
                if (nodesIndex < 0) {
                    const addedIndex = added.findIndex(({ path }) => ivipbase_core_1.PathInfo.get(node.path).equals(path));
                    if (addedIndex < 0) {
                        added.push(node);
                    }
                    else {
                        added[addedIndex] = node;
                    }
                }
                else {
                    const modifiedIndex = modified.findIndex(({ path }) => ivipbase_core_1.PathInfo.get(node.path).equals(path));
                    if (modifiedIndex < 0) {
                        modified.push(node);
                    }
                    else {
                        added[modifiedIndex] = node;
                    }
                }
                const index = result.findIndex(({ path }) => ivipbase_core_1.PathInfo.get(node.path).equals(path));
                if (index < 0) {
                    result.push(node);
                    result = result.sort(({ path: p1 }, { path: p2 }) => {
                        return ivipbase_core_1.PathInfo.get(p1).isAncestorOf(p2) ? -1 : ivipbase_core_1.PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
                    });
                }
                result[index] = node;
                return result.findIndex(({ path }) => ivipbase_core_1.PathInfo.get(node.path).equals(path));
            };
            let pathsRemoved = comparison
                .sort(({ content: { modified: aM } }, { content: { modified: bM } }) => {
                return aM > bM ? -1 : aM < bM ? 1 : 0;
            })
                .filter(({ path, content: { modified } }, i, l) => {
                const indexRecent = l.findIndex(({ path: p, content: { modified: m } }) => p === path && m > modified);
                return indexRecent < 0 || indexRecent === i;
            })
                .filter(({ content }) => content.type === exports.nodeValueTypes.EMPTY || content.value === null)
                .map(({ path }) => path);
            pathsRemoved = nodes
                .filter(({ path }) => {
                var _a;
                const { content } = (_a = comparison === null || comparison === void 0 ? void 0 : comparison.find(({ path: p }) => ivipbase_core_1.PathInfo.get(p).isParentOf(path))) !== null && _a !== void 0 ? _a : {};
                const key = ivipbase_core_1.PathInfo.get(path).key;
                return content ? (typeof key === "number" ? content.type !== exports.nodeValueTypes.ARRAY : content.type !== exports.nodeValueTypes.OBJECT) : false;
            })
                .map(({ path }) => path)
                .concat(pathsRemoved)
                .filter((path, i, l) => l.indexOf(path) === i)
                .filter((path, i, l) => l.findIndex((p) => ivipbase_core_1.PathInfo.get(p).isAncestorOf(path)) < 0);
            removed = nodes.filter(({ path }) => {
                return pathsRemoved.findIndex((p) => ivipbase_core_1.PathInfo.get(p).equals(path) || ivipbase_core_1.PathInfo.get(p).isAncestorOf(path)) >= 0;
            });
            comparison = comparison
                .filter(({ path }) => {
                return pathsRemoved.findIndex((p) => ivipbase_core_1.PathInfo.get(p).equals(path) || ivipbase_core_1.PathInfo.get(p).isAncestorOf(path)) < 0;
            })
                .sort(({ path: p1 }, { path: p2 }) => {
                return ivipbase_core_1.PathInfo.get(p1).isAncestorOf(p2) ? -1 : ivipbase_core_1.PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
            });
            result = nodes
                .filter(({ path }) => {
                return pathsRemoved.findIndex((p) => ivipbase_core_1.PathInfo.get(p).equals(path) || ivipbase_core_1.PathInfo.get(p).isAncestorOf(path)) < 0;
            })
                .sort(({ path: p1 }, { path: p2 }) => {
                return ivipbase_core_1.PathInfo.get(p1).isAncestorOf(p2) ? -1 : ivipbase_core_1.PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
            });
            for (let node of comparison) {
                const pathInfo = ivipbase_core_1.PathInfo.get(node.path);
                let index = result.findIndex(({ path }) => pathInfo.equals(path));
                index = index < 0 ? result.findIndex(({ path }) => pathInfo.isParentOf(path) || pathInfo.isChildOf(path)) : index;
                if (index < 0) {
                    setNodeBy(node);
                    continue;
                }
                const lastNode = result[index];
                if (pathInfo.equals(lastNode.path) && lastNode.content.type !== node.content.type) {
                    setNodeBy(node);
                    continue;
                }
                if (pathInfo.equals(lastNode.path)) {
                    switch (lastNode.content.type) {
                        case exports.nodeValueTypes.OBJECT:
                        case exports.nodeValueTypes.ARRAY: {
                            const { created, revision_nr } = lastNode.content.modified > node.content.modified ? node.content : lastNode.content;
                            const contents = lastNode.content.modified > node.content.modified ? [node.content, lastNode.content] : [lastNode.content, node.content];
                            const content_values = contents.map(({ value }) => value);
                            const new_content_value = Object.assign.apply(null, content_values);
                            const content = Object.assign.apply(null, [
                                ...contents,
                                {
                                    value: Object.fromEntries(Object.entries(new_content_value).filter(([k, v]) => v !== null)),
                                    created,
                                    revision_nr: revision_nr + 1,
                                },
                            ]);
                            setNodeBy(Object.assign(lastNode, {
                                content,
                            }));
                            break;
                        }
                        default: {
                            if (lastNode.content.modified < node.content.modified) {
                                setNodeBy(node);
                            }
                        }
                    }
                    continue;
                }
                const parentNodeIsLast = pathInfo.isChildOf(lastNode.path);
                const parentNode = !parentNodeIsLast ? node : lastNode;
                const childNode = parentNodeIsLast ? node : lastNode;
                const childKey = ivipbase_core_1.PathInfo.get(childNode.path).key;
                if (parentNode.content.type === exports.nodeValueTypes.OBJECT && childKey !== null) {
                    let parentNodeModified = false;
                    if ([exports.nodeValueTypes.STRING, exports.nodeValueTypes.BIGINT, exports.nodeValueTypes.BOOLEAN, exports.nodeValueTypes.DATETIME, exports.nodeValueTypes.NUMBER].includes(childNode.content.type) &&
                        this.valueFitsInline(childNode.content.value)) {
                        parentNode.content.value[childKey] = childNode.content.value;
                        parentNodeModified = true;
                    }
                    else if (childNode.content.type === exports.nodeValueTypes.EMPTY) {
                        parentNode.content.value[childKey] = null;
                        parentNodeModified = true;
                    }
                    if (parentNodeModified) {
                        result[index] = parentNode;
                        setNodeBy(result[index]);
                        continue;
                    }
                }
                setNodeBy(node);
            }
            result = result.map(({ path, content }) => ({ path, content }));
            added = added
                .sort(({ path: p1 }, { path: p2 }) => {
                return ivipbase_core_1.PathInfo.get(p1).isAncestorOf(p2) ? -1 : ivipbase_core_1.PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
            })
                .map(({ path, content }) => ({ path, content }));
            modified = modified
                .sort(({ path: p1 }, { path: p2 }) => {
                return ivipbase_core_1.PathInfo.get(p1).isAncestorOf(p2) ? -1 : ivipbase_core_1.PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
            })
                .map(({ path, content }) => ({ path, content }));
            removed = removed
                .sort(({ path: p1 }, { path: p2 }) => {
                return ivipbase_core_1.PathInfo.get(p1).isAncestorOf(p2) ? -1 : ivipbase_core_1.PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
            })
                .map(({ path, content }) => ({ path, content }));
            return { result, added, modified, removed };
        };
        this.settings = new MDESettings(options);
        this.init();
    }
    init() {
        if (typeof this.settings.init === "function") {
            this.settings.init.apply(this, []);
        }
    }
    /**
     * Converte um caminho em uma expressão regular.
     *
     * @param {string} path - O caminho a ser convertido em expressão regular.
     * @param {boolean} [onlyChildren=false] - Se verdadeiro, exporta apenas os filhos do node especificado.
     * @param {boolean} [allHeirs=false] - Se verdadeiro, exporta todos os descendentes em relação ao path especificado.
     * @returns {RegExp} - A expressão regular resultante.
     */
    pathToRegex(path, onlyChildren = false, allHeirs = false) {
        const pathsRegex = [];
        /**
         * Substitui o caminho por uma expressão regular.
         * @param path - O caminho a ser convertido em expressão regular.
         * @returns {string} O caminho convertido em expressão regular.
         */
        const replasePathToRegex = (path) => {
            path = path.replace(/\/((\*)|(\$[^/\$]*))/g, "/([^/]*)");
            path = path.replace(/\[\*\]/g, "\\[(\\d+)\\]");
            return path;
        };
        // Adiciona a expressão regular do caminho principal ao array.
        pathsRegex.push(replasePathToRegex(path));
        if (onlyChildren) {
            pathsRegex.forEach((exp) => pathsRegex.push(`${exp}((\/([^\/]*)){1})`));
        }
        else if (allHeirs) {
            pathsRegex.forEach((exp) => pathsRegex.push(`${exp}((\/([^\/]*)){1,})`));
        }
        // Obtém o caminho pai e adiciona a expressão regular correspondente ao array.
        pathsRegex.push(replasePathToRegex(ivipbase_core_1.PathInfo.get(path).parentPath));
        // Cria a expressão regular completa combinando as expressões individuais no array.
        const fullRegex = new RegExp(`^(${pathsRegex.join("$)|(")}$)`);
        return fullRegex;
    }
    /**
     * Verifica se um caminho específico existe no nó.
     * @param path - O caminho a ser verificado.
     * @returns {Promise<boolean>} `true` se o caminho existir no nó, `false` caso contrário.
     */
    async isPathExists(path) {
        const nodeList = await this.getNodesBy(path, false, false).then((nodes) => {
            return Promise.resolve(nodes
                .sort(({ content: { modified: aM } }, { content: { modified: bM } }) => {
                return aM > bM ? -1 : aM < bM ? 1 : 0;
            })
                .filter(({ path, content: { modified } }, i, l) => {
                const indexRecent = l.findIndex(({ path: p, content: { modified: m } }) => p === path && m > modified);
                return indexRecent < 0 || indexRecent === i;
            }));
        });
        let nodeSelected = nodeList.find(({ path: p }) => ivipbase_core_1.PathInfo.get(p).equals(path) || ivipbase_core_1.PathInfo.get(p).isParentOf(path));
        if (!nodeSelected) {
            return false;
        }
        else if (ivipbase_core_1.PathInfo.get(nodeSelected.path).isParentOf(path)) {
            const key = ivipbase_core_1.PathInfo.get(path).key;
            return key !== null && nodeSelected.content.type === exports.nodeValueTypes.OBJECT && Object.keys(nodeSelected.content.value).includes(key);
        }
        return ivipbase_core_1.PathInfo.get(nodeSelected.path).equals(path);
    }
    /**
     * Verifica se um valor pode ser armazenado em um objeto pai ou se deve ser movido
     * para um registro dedicado com base nas configurações de tamanho máximo (`maxInlineValueSize`).
     * @param value - O valor a ser verificado.
     * @returns {boolean} `true` se o valor pode ser armazenado inline, `false` caso contrário.
     * @throws {TypeError} Lança um erro se o tipo do valor não for suportado.
     */
    valueFitsInline(value) {
        if (typeof value === "number" || typeof value === "boolean" || (0, ivip_utils_1.isDate)(value)) {
            return true;
        }
        else if (typeof value === "string") {
            if (value.length > this.settings.maxInlineValueSize) {
                return false;
            }
            // Se a string contém caracteres Unicode, o tamanho em bytes será maior do que `value.length`.
            const encoded = (0, ivip_utils_1.encodeString)(value);
            return encoded.length < this.settings.maxInlineValueSize;
        }
        else if (value instanceof ivipbase_core_1.PathReference) {
            if (value.path.length > this.settings.maxInlineValueSize) {
                return false;
            }
            // Se o caminho contém caracteres Unicode, o tamanho em bytes será maior do que `value.path.length`.
            const encoded = (0, ivip_utils_1.encodeString)(value.path);
            return encoded.length < this.settings.maxInlineValueSize;
        }
        else if (value instanceof ArrayBuffer) {
            return value.byteLength < this.settings.maxInlineValueSize;
        }
        else if (value instanceof Array) {
            return value.length === 0;
        }
        else if (typeof value === "object") {
            return Object.keys(value).length === 0;
        }
        else {
            throw new TypeError("What else is there?");
        }
    }
    /**
     * Obtém um valor tipado apropriado para armazenamento com base no tipo do valor fornecido.
     * @param val - O valor a ser processado.
     * @returns {any} O valor processado.
     * @throws {Error} Lança um erro se o valor não for suportado ou se for nulo.
     */
    getTypedChildValue(val) {
        if (val === null) {
            throw new Error(`Not allowed to store null values. remove the property`);
        }
        else if ((0, ivip_utils_1.isDate)(val)) {
            return { type: exports.VALUE_TYPES.DATETIME, value: new Date(val).getTime() };
        }
        else if (["string", "number", "boolean"].includes(typeof val)) {
            return val;
        }
        else if (val instanceof ivipbase_core_1.PathReference) {
            return { type: exports.VALUE_TYPES.REFERENCE, value: val.path };
        }
        else if (val instanceof ArrayBuffer) {
            return { type: exports.VALUE_TYPES.BINARY, value: ivipbase_core_1.ascii85.encode(val) };
        }
        else if (typeof val === "object") {
            assert(Object.keys(val).length === 0 || ("type" in val && val.type === exports.VALUE_TYPES.DEDICATED_RECORD), "child object stored in parent can only be empty");
            return val;
        }
    }
    /**
     * Processa o valor de um nó de armazenamento durante a leitura, convertendo valores tipados de volta ao formato original.
     * @param node - O nó de armazenamento a ser processado.
     * @returns {StorageNode} O nó de armazenamento processado.
     * @throws {Error} Lança um erro se o tipo de registro autônomo for inválido.
     */
    processReadNodeValue(node) {
        const getTypedChildValue = (val) => {
            // Valor tipado armazenado em um registro pai
            if (val.type === exports.VALUE_TYPES.BINARY) {
                // Binário armazenado em um registro pai como uma string
                return ivipbase_core_1.ascii85.decode(val.value);
            }
            else if (val.type === exports.VALUE_TYPES.DATETIME) {
                // Valor de data armazenado como número
                return new Date(val.value);
            }
            else if (val.type === exports.VALUE_TYPES.REFERENCE) {
                // Referência de caminho armazenada como string
                return new ivipbase_core_1.PathReference(val.value);
            }
            else if (val.type === exports.VALUE_TYPES.DEDICATED_RECORD) {
                return getValueTypeDefault(val.value);
            }
            else {
                throw new Error(`Unhandled child value type ${val.type}`);
            }
        };
        node = JSON.parse(JSON.stringify(node));
        switch (node.type) {
            case exports.VALUE_TYPES.ARRAY:
            case exports.VALUE_TYPES.OBJECT: {
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
            case exports.VALUE_TYPES.BINARY: {
                node.value = ivipbase_core_1.ascii85.decode(node.value);
                break;
            }
            case exports.VALUE_TYPES.REFERENCE: {
                node.value = new ivipbase_core_1.PathReference(node.value);
                break;
            }
            case exports.VALUE_TYPES.STRING: {
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
     * Obtém uma lista de nodes com base em um caminho e opções adicionais.
     *
     * @param {string} path - O caminho a ser usado para filtrar os nodes.
     * @param {boolean} [onlyChildren=false] - Se verdadeiro, exporta apenas os filhos do node especificado.
     * @param {boolean} [allHeirs=false] - Se verdadeiro, exporta todos os descendentes em relação ao path especificado.
     * @returns {Promise<StorageNodeInfo[]>} - Uma Promise que resolve para uma lista de informações sobre os nodes.
     * @throws {Error} - Lança um erro se ocorrer algum problema durante a busca assíncrona.
     */
    async getNodesBy(path, onlyChildren = false, allHeirs = false) {
        const reg = this.pathToRegex(path, onlyChildren, allHeirs);
        let nodeList = this.nodes.filter(({ path }) => reg.test(path));
        let byNodes = [];
        try {
            byNodes = await this.settings.getMultiple(reg);
        }
        catch (_a) { }
        const { result } = this.prepareMergeNodes(byNodes, nodeList);
        let nodes = result.filter(({ path: p }) => ivipbase_core_1.PathInfo.get(path).equals(p));
        if (nodes.length > 0 && onlyChildren) {
            nodes = result.filter(({ path: p }) => ivipbase_core_1.PathInfo.get(path).equals(p) || ivipbase_core_1.PathInfo.get(path).isParentOf(p));
        }
        else if (nodes.length > 0 && allHeirs) {
            nodes = result.filter(({ path: p }) => ivipbase_core_1.PathInfo.get(path).equals(p) || ivipbase_core_1.PathInfo.get(path).isAncestorOf(p));
        }
        else if (nodes.length <= 0) {
            nodes = result.filter(({ path: p }) => ivipbase_core_1.PathInfo.get(path).isChildOf(p));
        }
        return nodes;
    }
    /**
     * Obtém o node pai de um caminho específico.
     * @param path - O caminho para o qual o node pai deve ser obtido.
     * @returns {Promise<StorageNodeInfo | undefined>} O node pai correspondente ao caminho ou `undefined` se não for encontrado.
     */
    async getNodeParentBy(path) {
        const pathInfo = ivipbase_core_1.PathInfo.get(path);
        const nodes = await this.getNodesBy(path, false);
        return nodes
            .filter((node) => {
            const nodePath = ivipbase_core_1.PathInfo.get(node.path);
            return nodePath.path === "" || pathInfo.path === nodePath.path || nodePath.isParentOf(pathInfo);
        })
            .sort((a, b) => {
            const pathA = ivipbase_core_1.PathInfo.get(a.path);
            const pathB = ivipbase_core_1.PathInfo.get(b.path);
            return pathA.isDescendantOf(pathB.path) ? -1 : pathB.isDescendantOf(pathA.path) ? 1 : 0;
        })
            .shift();
    }
    /**
     * Adiciona um ou mais nodes a matriz de nodes atual e aplica evento de alteração.
     * @param nodes - Um ou mais nós a serem adicionados.
     * @returns {MDE} O nó atual após a adição dos nós.
     */
    pushNode(...nodes) {
        var _a;
        const forNodes = (_a = Array.prototype.concat
            .apply([], nodes.map((node) => (Array.isArray(node) ? node : [node])))
            .filter((node = {}) => node && typeof node.path === "string" && "content" in node)) !== null && _a !== void 0 ? _a : [];
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
    async getInfoBy(path, options = {}) {
        var _a, _b, _c, _d;
        const pathInfo = ivipbase_core_1.PathInfo.get(path);
        const nodes = await this.getNodesBy(path, options.include_child_count, false);
        const mainNode = nodes.find(({ path: p }) => ivipbase_core_1.PathInfo.get(p).equals(path) || ivipbase_core_1.PathInfo.get(p).isParentOf(path));
        const defaultNode = new CustomStorageNodeInfo({
            path: pathInfo.path,
            key: typeof pathInfo.key === "string" ? pathInfo.key : undefined,
            index: typeof pathInfo.key === "number" ? pathInfo.key : undefined,
            type: 0,
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
        const content = this.processReadNodeValue(mainNode.content);
        let value = content.value;
        if (pathInfo.isChildOf(mainNode.path)) {
            if ([exports.nodeValueTypes.OBJECT, exports.nodeValueTypes.ARRAY].includes(mainNode.content.type)) {
                if (Object.keys(value).includes(pathInfo.key)) {
                    value = value[pathInfo.key];
                }
                else {
                    value = null;
                }
            }
            else {
                value = null;
            }
        }
        const containsChild = nodes.findIndex(({ path: p }) => pathInfo.isParentOf(p)) >= 0;
        const isArrayChild = !containsChild && mainNode.content.type === exports.nodeValueTypes.ARRAY;
        const info = new CustomStorageNodeInfo({
            path: pathInfo.path,
            key: typeof pathInfo.key === "string" ? pathInfo.key : undefined,
            index: typeof pathInfo.key === "number" ? pathInfo.key : undefined,
            type: value !== null ? getValueType(value) : containsChild ? (isArrayChild ? exports.VALUE_TYPES.ARRAY : exports.VALUE_TYPES.OBJECT) : 0,
            exists: value !== null || containsChild,
            address: new NodeAddress(mainNode.path),
            created: (_a = new Date(content.created)) !== null && _a !== void 0 ? _a : new Date(),
            modified: (_b = new Date(content.modified)) !== null && _b !== void 0 ? _b : new Date(),
            revision: (_c = content.revision) !== null && _c !== void 0 ? _c : "",
            revision_nr: (_d = content.revision_nr) !== null && _d !== void 0 ? _d : 0,
        });
        info.value = value ? value : null;
        if (options.include_child_count && (containsChild || isArrayChild)) {
            info.childCount = nodes.reduce((c, { path: p }) => c + (pathInfo.isParentOf(p) ? 1 : 0), Object.keys(info.value).length);
        }
        return info;
    }
    /**
     * Obtém valor referente ao path específico.
     *
     * @template T - Tipo genérico para o retorno da função.
     * @param {string} path - Caminho de um node raiz.
     * @param {boolean} [onlyChildren=true] - Se verdadeiro, exporta apenas os filhos do node especificado.
     * @return {Promise<T | undefined>} - Retorna valor referente ao path ou undefined se nenhum node for encontrado.
     */
    async get(path, onlyChildren = true) {
        const nodes = await this.getNodesBy(path, onlyChildren);
        const restructurerInstance = new NodeRestructureJson_1.NoderestructureJson("");
        const restructuredJson = restructurerInstance.restructureJson(nodes);
        const dataFromMongoConvertedToJSON = JSON.stringify(restructuredJson, null, 2);
        const saveJsonIntoFile = restructurerInstance.convertToJsonAndSaveToFile(dataFromMongoConvertedToJSON);
        return dataFromMongoConvertedToJSON;
    }
    /**
     * Define um valor no armazenamento com o caminho especificado.
     *
     * @param {string} path - O caminho do node a ser definido.
     * @param {any} value - O valor a ser armazenado em nodes.
     * @param {Object} [options] - Opções adicionais para controlar o comportamento da definição.
     * @param {string} [options.assert_revision] - Uma string que representa a revisão associada ao node, se necessário.
     * @returns {Promise<void>}
     */
    set(path, value, options = {}) {
        const results = [];
        if (path.trim() === "") {
            throw new Error(`Invalid path node`);
        }
        const pathInfo = ivipbase_core_1.PathInfo.get(path);
        if (typeof value === "object" && !Array.isArray(value)) {
            this.processObject(value, { path: pathInfo.path }, results, options);
        }
        let currentPath = "";
        ivipbase_core_1.PathInfo.get(path).keys.forEach((part, i) => {
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
                    results.push(arrayResult);
                }
            }
        });
        const theKey = pathInfo.key;
        if (Array.isArray(value) && value.length > 0) {
            value.forEach((obj, i) => {
                const currentPath = `${path}[${i}]`;
                const processedValue = {
                    [theKey]: obj,
                };
                const arrayResult = {
                    path: currentPath,
                    type: "SET",
                    content: {
                        type: exports.nodeValueTypes.ARRAY,
                        value: processedValue,
                        revision: this.generateShortUUID(),
                        revision_nr: 1,
                        created: Date.now(),
                        modified: Date.now(),
                    },
                };
                results.push(arrayResult);
            });
            const arrayResult = {
                path: pathInfo.path,
                type: "SET",
                content: {
                    type: exports.nodeValueTypes.ARRAY,
                    value: {},
                    revision: this.generateShortUUID(),
                    revision_nr: 1,
                    created: Date.now(),
                    modified: Date.now(),
                },
            };
            results.push(arrayResult);
        }
        else {
            const valueType = this.getType(value);
            const processedValue = {
                [theKey]: value,
            };
            if (typeof value === "string") {
                const processedValue = {
                    [theKey]: value,
                };
                const nonObjectResult = {
                    path: pathInfo.parentPath,
                    type: "SET",
                    content: {
                        type: valueType,
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
    getType(value) {
        if (Array.isArray(value)) {
            return exports.nodeValueTypes.ARRAY;
        }
        else if (value && typeof value === "object") {
            return exports.nodeValueTypes.OBJECT;
        }
        else if (typeof value === "number") {
            return exports.nodeValueTypes.NUMBER;
        }
        else if (typeof value === "boolean") {
            return exports.nodeValueTypes.BOOLEAN;
        }
        else if (typeof value === "string") {
            return exports.nodeValueTypes.STRING;
        }
        else if (typeof value === "bigint") {
            return exports.nodeValueTypes.BIGINT;
        }
        else if (typeof value === "object" && value.type === 6) {
            return exports.nodeValueTypes.DATETIME;
        }
        else {
            return exports.nodeValueTypes.EMPTY;
        }
    }
    generateShortUUID() {
        const fullUUID = (0, crypto_1.randomUUID)();
        const shortUUID = fullUUID.replace(/-/g, "").slice(0, 24);
        return shortUUID;
    }
    processObject(obj, pathInfo, results, options) {
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
                        type: exports.nodeValueTypes.ARRAY,
                        value: {},
                        revision: this.generateShortUUID(),
                        revision_nr: 1,
                        created: Date.now(),
                        modified: Date.now(),
                    },
                };
                results.push(resultContent);
            }
            else if (typeof value === "object") {
                this.processObject(value, { path: childPath }, results, options);
            }
            else {
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
                }
                else {
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
                    type: exports.nodeValueTypes.OBJECT,
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
                    type: exports.nodeValueTypes.OBJECT,
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
exports.default = MDE;
//# sourceMappingURL=index.js.map