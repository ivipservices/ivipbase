"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MDESettings = exports.VALUE_TYPES = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const NodeInfo_1 = require("./NodeInfo");
const utils_1 = require("./utils");
Object.defineProperty(exports, "VALUE_TYPES", { enumerable: true, get: function () { return utils_1.VALUE_TYPES; } });
const prepareMergeNodes_1 = __importDefault(require("./prepareMergeNodes"));
const structureNodes_1 = __importDefault(require("./structureNodes"));
const destructureData_1 = __importDefault(require("./destructureData"));
const utils_2 = require("../../../utils");
const DEBUG_MODE = false;
const NOOP = () => { };
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
        this.getMultiple = async (database, reg) => {
            if (typeof options.getMultiple === "function") {
                return await Promise.race([options.getMultiple(database, reg)]).then((response) => {
                    return Promise.resolve(response !== null && response !== void 0 ? response : []);
                });
            }
            return [];
        };
        this.setNode = async (database, path, content, node) => {
            if (typeof options.setNode === "function") {
                await Promise.race([options.setNode(database, path, (0, utils_2.removeNulls)(content), (0, utils_2.removeNulls)(node))]);
            }
        };
        this.removeNode = async (database, path, content, node) => {
            if (typeof options.removeNode === "function") {
                await Promise.race([options.removeNode(database, path, (0, utils_2.removeNulls)(content), (0, utils_2.removeNulls)(node))]);
            }
        };
        if (typeof options.init === "function") {
            this.init = options.init;
        }
    }
}
exports.MDESettings = MDESettings;
class MDE extends ivipbase_core_1.SimpleEventEmitter {
    createTid() {
        return DEBUG_MODE ? ++this._lastTid : ivipbase_core_1.ID.generate();
    }
    constructor(options = {}) {
        super();
        this._ready = false;
        this.schemas = {};
        this.settings = new MDESettings(options);
        this._lastTid = 0;
        this.on("ready", () => {
            this._ready = true;
        });
        this.init();
    }
    get debug() {
        return new ivipbase_core_1.DebugLogger(undefined, "MDE");
    }
    init() {
        if (typeof this.settings.init === "function") {
            this.settings.init.apply(this, []);
        }
    }
    /**
     * Aguarda o serviço estar pronto antes de executar o seu callback.
     * @param callback (opcional) função de retorno chamada quando o serviço estiver pronto para ser usado. Você também pode usar a promise retornada.
     * @returns retorna uma promise que resolve quando estiver pronto
     */
    async ready(callback) {
        if (!this._ready) {
            // Aguarda o evento ready
            await new Promise((resolve) => this.once("ready", resolve));
        }
        callback === null || callback === void 0 ? void 0 : callback();
    }
    /**
     * Converte um caminho em uma expressão regular.
     *
     * @param {string} path - O caminho a ser convertido em expressão regular.
     * @param {boolean} [onlyChildren=false] - Se verdadeiro, exporta apenas os filhos do node especificado.
     * @param {boolean} [allHeirs=false] - Se verdadeiro, exporta todos os descendentes em relação ao path especificado.
     * @returns {RegExp} - A expressão regular resultante.
     */
    pathToRegex(path, onlyChildren = false, allHeirs = false, includeAncestor = false) {
        const pathsRegex = [];
        /**
         * Substitui o caminho por uma expressão regular.
         * @param path - O caminho a ser convertido em expressão regular.
         * @returns {string} O caminho convertido em expressão regular.
         */
        const replasePathToRegex = (path) => {
            path = path.replace(/\/((\*)|(\$[^/\$]*))/g, "/([^/]*)");
            path = path.replace(/\[\*\]/g, "\\[(\\d+)\\]");
            path = path.replace(/\[(\d+)\]/g, "\\[$1\\]");
            return path;
        };
        // Adiciona a expressão regular do caminho principal ao array.
        pathsRegex.push(replasePathToRegex(path));
        if (onlyChildren) {
            pathsRegex.forEach((exp) => pathsRegex.push(`${exp}(((\/([^/]*))|(\\[([^/]*)\\])){1})`));
        }
        else if (allHeirs) {
            pathsRegex.forEach((exp) => pathsRegex.push(`${exp}(((\/([^/]*))|(\\[([^/]*)\\])){1,})`));
        }
        let parent = ivipbase_core_1.PathInfo.get(path).parent;
        // Obtém o caminho pai e adiciona a expressão regular correspondente ao array.
        if (includeAncestor) {
            while (parent) {
                pathsRegex.push(replasePathToRegex(parent.path));
                parent = parent.parent;
            }
        }
        else if (parent) {
            pathsRegex.push(replasePathToRegex(parent.path));
        }
        // Cria a expressão regular completa combinando as expressões individuais no array.
        const fullRegex = new RegExp(`^(${pathsRegex.map((e) => e.replace(/\/$/gi, "/?")).join("$)|(")}$)`);
        return fullRegex;
    }
    /**
     * Verifica se um caminho específico existe no nó.
     * @param {string} database - Nome do banco de dados.
     * @param path - O caminho a ser verificado.
     * @returns {Promise<boolean>} `true` se o caminho existir no nó, `false` caso contrário.
     */
    async isPathExists(database, path) {
        path = ivipbase_core_1.PathInfo.get([this.settings.prefix, path]).path;
        const nodeList = await this.getNodesBy(database, path, false, false).then((nodes) => {
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
            return key !== null && nodeSelected.content.type === utils_1.nodeValueTypes.OBJECT && Object.keys(nodeSelected.content.value).includes(key);
        }
        return ivipbase_core_1.PathInfo.get(nodeSelected.path).equals(path);
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
    async getNodesBy(database, path, onlyChildren = false, allHeirs = false, includeAncestor = false) {
        const reg = this.pathToRegex(path, onlyChildren, allHeirs, includeAncestor);
        // console.log("getNodesBy::1::", reg.source);
        let result = [];
        try {
            result = await this.settings.getMultiple(database, reg);
        }
        catch (_a) { }
        // console.log("getNodesBy::2::", JSON.stringify(result, null, 4));
        let nodes = result.filter(({ path: p, content }) => ivipbase_core_1.PathInfo.get(path).equals(p) && (content.type !== utils_1.nodeValueTypes.EMPTY || content.value !== null || content.value !== undefined));
        if (nodes.length <= 0) {
            nodes = result.filter(({ path: p }) => ivipbase_core_1.PathInfo.get(path).isChildOf(p));
        }
        else if (onlyChildren) {
            nodes = result.filter(({ path: p }) => ivipbase_core_1.PathInfo.get(path).equals(p) || ivipbase_core_1.PathInfo.get(path).isParentOf(p));
        }
        else if (allHeirs) {
            nodes = result.filter(({ path: p }) => ivipbase_core_1.PathInfo.get(path).equals(p) || ivipbase_core_1.PathInfo.get(path).isAncestorOf(p));
        }
        if (includeAncestor) {
            nodes = result.filter(({ path: p }) => ivipbase_core_1.PathInfo.get(p).isParentOf(path) || ivipbase_core_1.PathInfo.get(p).isAncestorOf(path)).concat(nodes);
        }
        return nodes;
    }
    /**
     * Obtém o node pai de um caminho específico.
     * @param {string} database - Nome do banco de dados.
     * @param path - O caminho para o qual o node pai deve ser obtido.
     * @returns {Promise<StorageNodeInfo | undefined>} O node pai correspondente ao caminho ou `undefined` se não for encontrado.
     */
    async getNodeParentBy(database, path) {
        const pathInfo = ivipbase_core_1.PathInfo.get(path);
        const nodes = await this.getNodesBy(database, path, false);
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
     * Obtém informações personalizadas sobre um node com base no caminho especificado.
     *
     * @param {string} database - Nome do banco de dados.
     * @param {string} path - O caminho do node para o qual as informações devem ser obtidas.
     * @returns {CustomStorageNodeInfo} - Informações personalizadas sobre o node especificado.
     */
    async getInfoBy(database, path, options = {}) {
        var _a, _b, _c, _d;
        const { include_child_count = true, include_prefix = true, cache_nodes } = options;
        const pathInfo = include_prefix ? ivipbase_core_1.PathInfo.get([this.settings.prefix, path]) : ivipbase_core_1.PathInfo.get(path);
        const mainPath = include_prefix ? pathInfo.path.replace(this.settings.prefix + "/", "") : pathInfo.path;
        const nodes = await this.getNodesBy(database, pathInfo.path, true, false);
        const mainNode = nodes.find(({ path: p }) => ivipbase_core_1.PathInfo.get(p).equals(pathInfo.path) || ivipbase_core_1.PathInfo.get(p).isParentOf(pathInfo.path));
        const defaultNode = new NodeInfo_1.CustomStorageNodeInfo({
            path: mainPath,
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
        if (!mainNode) {
            return defaultNode;
        }
        const content = (0, utils_1.processReadNodeValue)(mainNode.content);
        let value = content.value;
        if (pathInfo.isChildOf(mainNode.path) && pathInfo.key) {
            if ([utils_1.nodeValueTypes.OBJECT, utils_1.nodeValueTypes.ARRAY].includes(mainNode.content.type)) {
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
        const isArrayChild = !containsChild && mainNode.content.type === utils_1.nodeValueTypes.ARRAY;
        const info = new NodeInfo_1.CustomStorageNodeInfo({
            path: mainPath,
            key: typeof pathInfo.key === "string" ? pathInfo.key : typeof pathInfo.key !== "number" ? "" : undefined,
            index: typeof pathInfo.key === "number" ? pathInfo.key : undefined,
            type: value !== null ? (0, utils_1.getValueType)(value) : containsChild ? (isArrayChild ? utils_1.VALUE_TYPES.ARRAY : utils_1.VALUE_TYPES.OBJECT) : 0,
            exists: value !== null || containsChild,
            address: new NodeInfo_1.NodeAddress(mainPath),
            created: (_a = new Date(content.created)) !== null && _a !== void 0 ? _a : new Date(),
            modified: (_b = new Date(content.modified)) !== null && _b !== void 0 ? _b : new Date(),
            revision: (_c = content.revision) !== null && _c !== void 0 ? _c : "",
            revision_nr: (_d = content.revision_nr) !== null && _d !== void 0 ? _d : 0,
        });
        info.value = value ? value : null;
        // if (!PathInfo.get(mainNode.path).equals(pathInfo.path)) {
        // 	info.value = (typeof info.key === "string" ? info.value[info.key] : typeof info.index === "number" ? info.value[info.index] : null) ?? null;
        // }
        if (include_child_count && (containsChild || isArrayChild)) {
            info.childCount = nodes.reduce((c, { path: p }) => c + (pathInfo.isParentOf(p) ? 1 : 0), Object.keys(info.value).length);
        }
        if (info.value !== null && typeof info.value === "object") {
            info.value = Object.fromEntries(Object.entries(info.value).sort((a, b) => {
                const key1 = a[0].toString();
                const key2 = b[0].toString();
                return key1.startsWith("__") && !key2.startsWith("__") ? 1 : !key1.startsWith("__") && key2.startsWith("__") ? -1 : key1 > key2 ? 1 : key1 < key2 ? -1 : 0;
            }));
        }
        return info;
    }
    getChildren(database, path, options = {}) {
        const pathInfo = ivipbase_core_1.PathInfo.get([this.settings.prefix, path]);
        const next = async (callback) => {
            var _a, _b, _c;
            const nodes = await this.getNodesBy(database, pathInfo.path, true, false);
            const mainNode = nodes.find(({ path: p }) => ivipbase_core_1.PathInfo.get(p).equals(pathInfo.path));
            let isContinue = true;
            if (!mainNode || ![utils_1.VALUE_TYPES.OBJECT, utils_1.VALUE_TYPES.ARRAY].includes((_a = mainNode.content.type) !== null && _a !== void 0 ? _a : -1)) {
                return;
            }
            const isArray = mainNode.content.type === utils_1.VALUE_TYPES.ARRAY;
            const value = mainNode.content.value;
            let keys = Object.keys(value).map((key) => (isArray ? parseInt(key) : key));
            if (options.keyFilter) {
                keys = keys.filter((key) => options.keyFilter.includes(key));
            }
            keys.length > 0 &&
                keys.every((key) => {
                    var _a;
                    const child = (0, utils_1.getTypeFromStoredValue)(value[key]);
                    const info = new NodeInfo_1.CustomStorageNodeInfo({
                        path: pathInfo.childPath(key).replace(this.settings.prefix + "/", ""),
                        key: isArray ? undefined : key,
                        index: isArray ? key : undefined,
                        type: child.type,
                        address: null,
                        exists: true,
                        value: child.value,
                        revision: mainNode.content.revision,
                        revision_nr: mainNode.content.revision_nr,
                        created: new Date(mainNode.content.created),
                        modified: new Date(mainNode.content.modified),
                    });
                    isContinue = (_a = callback(info)) !== null && _a !== void 0 ? _a : true;
                    return isContinue; // stop .every loop if canceled
                });
            if (!isContinue) {
                return;
            }
            const childNodes = nodes
                .filter((node) => !(pathInfo.equals(node.path) || !pathInfo.isParentOf(node.path)))
                .sort((a, b) => {
                var _a, _b;
                const key1 = ((_a = ivipbase_core_1.PathInfo.get(a.path).key) !== null && _a !== void 0 ? _a : a.path).toString();
                const key2 = ((_b = ivipbase_core_1.PathInfo.get(b.path).key) !== null && _b !== void 0 ? _b : b.path).toString();
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
                    const key = ivipbase_core_1.PathInfo.get(node.path).key;
                    if (options.keyFilter.includes(key !== null && key !== void 0 ? key : "")) {
                        continue;
                    }
                }
                const key = ivipbase_core_1.PathInfo.get(node.path).key;
                const info = new NodeInfo_1.CustomStorageNodeInfo({
                    path: node.path.replace(this.settings.prefix + "/", ""),
                    type: node.content.type,
                    key: isArray ? undefined : (_b = key) !== null && _b !== void 0 ? _b : "",
                    index: isArray ? key : undefined,
                    address: new NodeInfo_1.NodeAddress(node.path),
                    exists: true,
                    value: null,
                    revision: node.content.revision,
                    revision_nr: node.content.revision_nr,
                    created: new Date(node.content.created),
                    modified: new Date(node.content.modified),
                });
                isContinue = (_c = callback(info)) !== null && _c !== void 0 ? _c : true;
            }
        };
        return {
            next,
        };
    }
    async get(database, path, options) {
        var _a;
        const _b = options !== null && options !== void 0 ? options : {}, { include_info_node, onlyChildren } = _b, _options = __rest(_b, ["include_info_node", "onlyChildren"]);
        path = ivipbase_core_1.PathInfo.get([this.settings.prefix, path]).path;
        const nodes = await this.getNodesBy(database, path, onlyChildren, true);
        const main_node = nodes.find(({ path: p }) => ivipbase_core_1.PathInfo.get(p).equals(path) || ivipbase_core_1.PathInfo.get(p).isParentOf(path));
        if (!main_node) {
            return undefined;
        }
        // console.log(JSON.stringify(nodes, null, 4));
        const value = (_a = (0, utils_2.removeNulls)((0, structureNodes_1.default)(path, nodes, _options))) !== null && _a !== void 0 ? _a : null;
        return !include_info_node ? value : Object.assign(Object.assign({}, main_node.content), { value });
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
    async set(database, path, value, options = {}, type = "SET") {
        var _a;
        type = typeof value !== "object" || value instanceof Array || value instanceof ArrayBuffer || value instanceof Date ? "UPDATE" : type;
        path = ivipbase_core_1.PathInfo.get([this.settings.prefix, path]).path;
        const nodes = destructureData_1.default.apply(this, [type, path, value, options]);
        //console.log("now", JSON.stringify(nodes.find((node) => node.path === "root/test") ?? {}, null, 4));
        const byNodes = await this.getNodesBy(database, path, false, true, true);
        //console.log("olt", JSON.stringify(byNodes.find((node) => node.path === "root/test") ?? {}, null, 4));
        const { added, modified, removed } = prepareMergeNodes_1.default.apply(this, [path, byNodes, nodes]);
        // console.log(JSON.stringify(modified, null, 4));
        // console.log("set", JSON.stringify(nodes, null, 4));
        // console.log("set-added", JSON.stringify(added, null, 4));
        // console.log("set-modified", JSON.stringify(modified, null, 4));
        // console.log("set-removed", JSON.stringify(removed, null, 4));
        const batchError = [];
        const promises = [];
        for (let node of removed) {
            this.emit("remove", {
                name: "remove",
                path: ivipbase_core_1.PathInfo.get(ivipbase_core_1.PathInfo.get(node.path).keys.slice(1)).path,
                value: (0, utils_2.removeNulls)(node.content.value),
            });
            promises.push(async () => {
                try {
                    await Promise.race([this.settings.removeNode(database, node.path, node.content, node)]).catch((e) => {
                        batchError.push({
                            path: node.path,
                            content: Object.assign(Object.assign({}, node.content), { type: 0, value: null }),
                        });
                    });
                }
                catch (_a) { }
            });
        }
        for (let node of modified) {
            this.emit("change", {
                name: "change",
                path: ivipbase_core_1.PathInfo.get(ivipbase_core_1.PathInfo.get(node.path).keys.slice(1)).path,
                value: (0, utils_2.removeNulls)(node.content.value),
                previous: (0, utils_2.removeNulls)((_a = node.previous_content) === null || _a === void 0 ? void 0 : _a.value),
            });
            promises.push(async () => {
                try {
                    await Promise.race([this.settings.setNode(database, node.path, (0, utils_2.removeNulls)(node.content), (0, utils_2.removeNulls)(node))]).catch((e) => {
                        batchError.push(node);
                    });
                }
                catch (_a) { }
            });
        }
        for (let node of added) {
            this.emit("add", {
                name: "add",
                path: ivipbase_core_1.PathInfo.get(ivipbase_core_1.PathInfo.get(node.path).keys.slice(1)).path,
                value: (0, utils_2.removeNulls)(node.content.value),
            });
            promises.push(async () => {
                try {
                    await Promise.race([this.settings.setNode(database, node.path, (0, utils_2.removeNulls)(node.content), (0, utils_2.removeNulls)(node))]).catch((e) => {
                        batchError.push(node);
                    });
                }
                catch (_a) { }
            });
        }
        for (let p of promises) {
            try {
                await p();
            }
            catch (_b) { }
        }
    }
    async update(database, path, value, options = {}) {
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
    async transact(database, path, callback, options = { no_lock: false, suppress_events: false, context: undefined }) {
        var _a, _b;
        const useFakeLock = options && options.no_lock === true;
        const tid = this.createTid();
        // const lock = useFakeLock
        //     ? { tid, release: NOOP } // Trava falsa, vamos usar verificação de revisão e tentativas novamente em vez disso
        //     : await this.nodeLocker.lock(path, tid, true, 'transactNode');
        const lock = { tid, release: NOOP };
        try {
            const node = await this.get(database, path, { include_info_node: true });
            const checkRevision = (_a = node === null || node === void 0 ? void 0 : node.revision) !== null && _a !== void 0 ? _a : ivipbase_core_1.ID.generate();
            let newValue;
            try {
                newValue = await Promise.race([callback((_b = node === null || node === void 0 ? void 0 : node.value) !== null && _b !== void 0 ? _b : null)]).catch((err) => {
                    this.debug.error(`Error in transaction callback: ${err.message}`);
                });
            }
            catch (err) {
                this.debug.error(`Error in transaction callback: ${err.message}`);
            }
            if (typeof newValue === "undefined") {
                // Callback did not return value. Cancel transaction
                return;
            }
            const cursor = await this.update(database, path, newValue, { assert_revision: checkRevision, tid: lock.tid, suppress_events: options.suppress_events, context: options.context });
            return cursor;
        }
        catch (err) {
            throw err;
        }
        finally {
            lock.release();
        }
    }
    byPrefix(prefix) {
        return Object.assign(Object.assign({}, this), { prefix: prefix });
    }
    /**
     * Adiciona, atualiza ou remove uma definição de esquema para validar os valores do nó antes que sejam armazenados no caminho especificado
     * @param database nome do banco de dados
     * @param path caminho de destino para impor o esquema, pode incluir curingas. Ex: 'users/*\/posts/*' ou 'users/$uid/posts/$postid'
     * @param schema definições de tipo de esquema. Quando um valor nulo é passado, um esquema previamente definido é removido.
     */
    setSchema(database, path, schema, warnOnly = false) {
        var _a;
        const schemas = (_a = this.schemas[database]) !== null && _a !== void 0 ? _a : (this.schemas[database] = []);
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
        const definition = new ivipbase_core_1.SchemaDefinition(schema, {
            warnOnly,
            warnCallback: (message) => this.debug.warn(message),
        });
        const item = schemas.find((s) => s.path === path);
        if (item) {
            item.schema = definition;
        }
        else {
            schemas.push({ path, schema: definition });
            schemas.sort((a, b) => {
                const ka = ivipbase_core_1.PathInfo.getPathKeys(a.path), kb = ivipbase_core_1.PathInfo.getPathKeys(b.path);
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
    getSchema(database, path) {
        var _a;
        const schemas = (_a = this.schemas[database]) !== null && _a !== void 0 ? _a : (this.schemas[database] = []);
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
    getSchemas(database) {
        var _a;
        const schemas = (_a = this.schemas[database]) !== null && _a !== void 0 ? _a : (this.schemas[database] = []);
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
    validateSchema(database, path, value, options = { updates: false }) {
        var _a;
        const schemas = (_a = this.schemas[database]) !== null && _a !== void 0 ? _a : (this.schemas[database] = []);
        let result = { ok: true };
        const pathInfo = ivipbase_core_1.PathInfo.get(path);
        schemas
            .filter((s) => pathInfo.isOnTrailOf(s.path))
            .every((s) => {
            if (pathInfo.isDescendantOf(s.path)) {
                // Dado que o caminho de verificação é um descendente do caminho de definição de esquema
                const ancestorPath = ivipbase_core_1.PathInfo.fillVariables(s.path, path);
                const trailKeys = pathInfo.keys.slice(ivipbase_core_1.PathInfo.getPathKeys(s.path).length);
                result = s.schema.check(ancestorPath, value, options.updates, trailKeys);
                return result.ok;
            }
            // Dado que o caminho de verificação está no caminho de definição de esquema ou em um caminho superior
            const trailKeys = ivipbase_core_1.PathInfo.getPathKeys(s.path).slice(pathInfo.keys.length);
            if (options.updates === true && trailKeys.length > 0 && !(trailKeys[0] in value)) {
                // Corrige #217: esta atualização em um caminho superior não afeta nenhum dado no caminho alvo do esquema
                return result.ok;
            }
            const partial = options.updates === true && trailKeys.length === 0;
            const check = (path, value, trailKeys) => {
                if (trailKeys.length === 0) {
                    // Check this node
                    return s.schema.check(path, value, partial);
                }
                else if (value === null) {
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
                    let result;
                    Object.keys(value).every((childKey) => {
                        const childPath = ivipbase_core_1.PathInfo.getChildPath(path, childKey);
                        const childValue = value[childKey];
                        result = check(childPath, childValue, trailKeys.slice(1));
                        return result.ok;
                    });
                    return result;
                }
                else {
                    const childPath = ivipbase_core_1.PathInfo.getChildPath(path, key);
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
exports.default = MDE;
//# sourceMappingURL=index.js.map