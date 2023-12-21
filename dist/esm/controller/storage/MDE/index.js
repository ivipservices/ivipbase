import { PathInfo, SimpleEventEmitter } from "ivipbase-core";
import { CustomStorageNodeInfo, NodeAddress } from "./NodeInfo.js";
import { VALUE_TYPES, getValueType, nodeValueTypes, processReadNodeValue, promiseState } from "./utils.js";
import prepareMergeNodes from "./prepareMergeNodes.js";
import structureNodes from "./structureNodes.js";
import destructureData from "./destructureData.js";
export { VALUE_TYPES };
/**
 * Representa as configurações de um MDE.
 */
export class MDESettings {
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
export default class MDE extends SimpleEventEmitter {
    constructor(options = {}) {
        super();
        /**
         * Uma lista de informações sobre nodes, mantido em cache até que as modificações sejam processadas no BD com êxito.
         *
         * @type {NodesPending[]}
         */
        this.nodes = [];
        this.batch = [];
        this.sendingNodes = Promise.resolve();
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
        pathsRegex.push(replasePathToRegex(PathInfo.get(path).parentPath));
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
        let nodeSelected = nodeList.find(({ path: p }) => PathInfo.get(p).equals(path) || PathInfo.get(p).isParentOf(path));
        if (!nodeSelected) {
            return false;
        }
        else if (PathInfo.get(nodeSelected.path).isParentOf(path)) {
            const key = PathInfo.get(path).key;
            return key !== null && nodeSelected.content.type === nodeValueTypes.OBJECT && Object.keys(nodeSelected.content.value).includes(key);
        }
        return PathInfo.get(nodeSelected.path).equals(path);
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
        let nodeList = this.nodes.concat(this.batch).filter(({ path }) => reg.test(path));
        let byNodes = [];
        try {
            byNodes = await this.settings.getMultiple(reg);
        }
        catch { }
        const { result } = prepareMergeNodes.apply(this, [byNodes, nodeList]);
        let nodes = result.filter(({ path: p }) => PathInfo.get(path).equals(p));
        if (nodes.length <= 0) {
            nodes = result.filter(({ path: p }) => PathInfo.get(path).isChildOf(p));
        }
        else if (onlyChildren) {
            nodes = result.filter(({ path: p }) => PathInfo.get(path).equals(p) || PathInfo.get(path).isParentOf(p));
        }
        else if (allHeirs) {
            nodes = result.filter(({ path: p }) => PathInfo.get(path).equals(p) || PathInfo.get(path).isAncestorOf(p));
        }
        return nodes;
    }
    /**
     * Obtém o node pai de um caminho específico.
     * @param path - O caminho para o qual o node pai deve ser obtido.
     * @returns {Promise<StorageNodeInfo | undefined>} O node pai correspondente ao caminho ou `undefined` se não for encontrado.
     */
    async getNodeParentBy(path) {
        const pathInfo = PathInfo.get(path);
        const nodes = await this.getNodesBy(path, false);
        return nodes
            .filter((node) => {
            const nodePath = PathInfo.get(node.path);
            return nodePath.path === "" || pathInfo.path === nodePath.path || nodePath.isParentOf(pathInfo);
        })
            .sort((a, b) => {
            const pathA = PathInfo.get(a.path);
            const pathB = PathInfo.get(b.path);
            return pathA.isDescendantOf(pathB.path) ? -1 : pathB.isDescendantOf(pathA.path) ? 1 : 0;
        })
            .shift();
    }
    async sendNodes() {
        const status = await promiseState(this.sendingNodes);
        if (status === "pending") {
            return;
        }
        this.sendingNodes = new Promise(async (resolve) => {
            this.batch = this.nodes
                .splice(0)
                .sort(({ content: { modified: aM } }, { content: { modified: bM } }) => {
                return aM > bM ? 1 : aM < bM ? -1 : 0;
            })
                .filter(({ path }, i, list) => {
                return list.findIndex(({ path: p }) => PathInfo.get(p).equals(path)) === i;
            })
                .sort(({ path: a }, { path: b }) => {
                return PathInfo.get(a).isAncestorOf(b) ? 1 : PathInfo.get(a).isDescendantOf(b) ? -1 : 0;
            });
            let listBatchRemoved = [];
            try {
                for (let node of this.batch) {
                    const reg = this.pathToRegex(node.path, false, false);
                    const byNodes = await this.settings.getMultiple(reg);
                    const { added, modified, removed } = prepareMergeNodes.apply(this, [byNodes, [node]]);
                    listBatchRemoved = listBatchRemoved.concat(removed);
                    for (let node of modified) {
                        await this.settings.setNode(node.path, node.content, node);
                        this.batch = this.batch.filter(({ path }) => PathInfo.get(path).equals(node.path) !== true);
                        this.emit("change", {
                            name: "change",
                            path: node.path,
                            value: node.content.value,
                        });
                    }
                    for (let node of added) {
                        await this.settings.setNode(node.path, node.content, node);
                        this.batch = this.batch.filter(({ path }) => PathInfo.get(path).equals(node.path) !== true);
                        this.emit("add", {
                            name: "add",
                            path: node.path,
                            value: node.content.value,
                        });
                    }
                }
                for (let node of listBatchRemoved) {
                    const reg = this.pathToRegex(node.path, false, true);
                    const byNodes = await this.settings.getMultiple(reg);
                    for (let r of byNodes) {
                        await this.settings.removeNode(r.path, r.content, r);
                        this.batch = this.batch.filter(({ path }) => PathInfo.get(path).equals(r.path) !== true);
                        this.emit("remove", {
                            name: "remove",
                            path: r.path,
                            value: r.content.value,
                        });
                    }
                }
            }
            catch { }
            this.nodes = this.nodes.concat(this.batch);
            resolve();
        });
    }
    /**
     * Adiciona um ou mais nodes a matriz de nodes atual e aplica evento de alteração.
     * @param nodes - Um ou mais nós a serem adicionados.
     * @returns {MDE} O nó atual após a adição dos nós.
     */
    pushNode(...nodes) {
        const forNodes = Array.prototype.concat
            .apply([], nodes.map((node) => (Array.isArray(node) ? node : [node])))
            .filter((node = {}) => node && typeof node.path === "string" && "content" in node) ?? [];
        for (let node of forNodes) {
            this.nodes.push(node);
        }
        this.sendNodes();
        return this;
    }
    /**
     * Obtém informações personalizadas sobre um node com base no caminho especificado.
     *
     * @param {string} path - O caminho do node para o qual as informações devem ser obtidas.
     * @returns {CustomStorageNodeInfo} - Informações personalizadas sobre o node especificado.
     */
    async getInfoBy(path, options = {}) {
        const pathInfo = PathInfo.get(path);
        const nodes = await this.getNodesBy(path, options.include_child_count, false);
        const mainNode = nodes.find(({ path: p }) => PathInfo.get(p).equals(path) || PathInfo.get(p).isParentOf(path));
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
        const content = processReadNodeValue(mainNode.content);
        let value = content.value;
        if (pathInfo.isChildOf(mainNode.path)) {
            if ([nodeValueTypes.OBJECT, nodeValueTypes.ARRAY].includes(mainNode.content.type)) {
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
        const isArrayChild = !containsChild && mainNode.content.type === nodeValueTypes.ARRAY;
        const info = new CustomStorageNodeInfo({
            path: pathInfo.path,
            key: typeof pathInfo.key === "string" ? pathInfo.key : undefined,
            index: typeof pathInfo.key === "number" ? pathInfo.key : undefined,
            type: value !== null ? getValueType(value) : containsChild ? (isArrayChild ? VALUE_TYPES.ARRAY : VALUE_TYPES.OBJECT) : 0,
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
    getChildren(path) {
        const pathInfo = PathInfo.get(path);
        const next = async (callback) => {
            const nodes = await this.getNodesBy(path, true, false);
            let isContinue = true;
            for (let node of nodes) {
                if (!isContinue) {
                    break;
                }
                if (pathInfo.equals(node.path) && pathInfo.isDescendantOf(node.path)) {
                    continue;
                }
                const info = await this.getInfoBy(node.path, { include_child_count: false });
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
     * @param {string} path - Caminho de um node raiz.
     * @param {boolean} [onlyChildren=true] - Se verdadeiro, exporta apenas os filhos do node especificado.
     * @return {Promise<T | undefined>} - Retorna valor referente ao path ou undefined se nenhum node for encontrado.
     */
    async get(path, options) {
        path = PathInfo.get([this.settings.prefix, path]).path;
        const nodes = await this.getNodesBy(path, options?.onlyChildren, true);
        return structureNodes(path, nodes, options);
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
    async set(path, value, options = {}) {
        path = PathInfo.get([this.settings.prefix, path]).path;
        const nodes = destructureData.apply(this, ["SET", path, value, options]);
        this.pushNode(nodes);
    }
    async update(path, value, options = {}) {
        path = PathInfo.get([this.settings.prefix, path]).path;
        const nodes = destructureData.apply(this, ["UPDATE", path, value, options]);
        this.pushNode(nodes);
    }
}
//# sourceMappingURL=index.js.map