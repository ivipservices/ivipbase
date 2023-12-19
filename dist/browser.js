(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ivipbase = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteApp = exports.getFirstApp = exports.getApps = exports.getApp = exports.appExists = exports.initializeApp = exports.IvipBaseApp = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const internal_1 = require("./internal");
const erros_1 = require("../controller/erros");
const server_1 = require("../server");
const verifyStorage_1 = require("./verifyStorage");
const DEFAULT_ENTRY_NAME = "[DEFAULT]";
class IvipBaseSettings {
    constructor(options = {}) {
        var _a;
        this.name = DEFAULT_ENTRY_NAME;
        this.dbname = "root";
        this.logLevel = "log";
        this.storage = new verifyStorage_1.DataStorageSettings();
        if (typeof options.name === "string") {
            this.name = options.name;
        }
        if (typeof options.dbname === "string") {
            this.dbname = options.dbname;
        }
        if (typeof options.logLevel === "string" && ["log", "warn", "error"].includes(options.logLevel)) {
            this.logLevel = options.logLevel;
        }
        if ((0, verifyStorage_1.validSettings)(options.storage)) {
            this.storage = options.storage;
        }
        if (typeof options.server === "object") {
            if (server_1.isPossiblyServer) {
                this.server = options.server;
            }
            else {
                this.client = options.server;
            }
        }
        if (typeof options.client === "object") {
            this.client = Object.assign((_a = this.client) !== null && _a !== void 0 ? _a : {}, options.client);
        }
    }
}
class IvipBaseApp extends ivipbase_core_1.SimpleEventEmitter {
    constructor(options) {
        super();
        this._ready = false;
        this.name = DEFAULT_ENTRY_NAME;
        this.settings = new IvipBaseSettings();
        this.storage = new verifyStorage_1.DataStorage();
        this.isDeleted = false;
        if (typeof options.name === "string") {
            this.name = options.name;
        }
        if (options.settings instanceof IvipBaseSettings) {
            this.settings = options.settings;
        }
        if (typeof options.isDeleted === "boolean") {
            this.isDeleted = options.isDeleted;
        }
        this.storage = (0, verifyStorage_1.applySettings)(this.settings.dbname, this.settings.storage);
        this.isServer = typeof this.settings.server === "object";
        this.once("ready", () => {
            this._ready = true;
        });
        if (this.isServer) {
            this.server = new server_1.LocalServer(this.name, this.settings.server);
            this.server.ready(() => {
                this.emitOnce("ready");
            });
        }
        else {
            this.emitOnce("ready");
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
            await new Promise((resolve) => this.on("ready", resolve));
        }
        callback === null || callback === void 0 ? void 0 : callback();
    }
    get isReady() {
        return this._ready;
    }
}
exports.IvipBaseApp = IvipBaseApp;
function initializeApp(options) {
    const settings = new IvipBaseSettings(options);
    const newApp = new IvipBaseApp({
        name: settings.name,
        settings,
    });
    const existingApp = internal_1._apps.get(newApp.name);
    if (existingApp) {
        if (ivipbase_core_1.Utils.deepEqual(newApp.settings, existingApp.settings)) {
            return existingApp;
        }
        else {
            throw erros_1.ERROR_FACTORY.create("duplicate-app" /* AppError.DUPLICATE_APP */, { appName: newApp.name });
        }
    }
    internal_1._apps.set(newApp.name, newApp);
    return newApp;
}
exports.initializeApp = initializeApp;
function appExists(name) {
    return typeof name === "string" && internal_1._apps.has(name);
}
exports.appExists = appExists;
function getApp(name = DEFAULT_ENTRY_NAME) {
    const app = internal_1._apps.get(name);
    if (!app) {
        throw erros_1.ERROR_FACTORY.create("no-app" /* AppError.NO_APP */, { appName: name });
    }
    return app;
}
exports.getApp = getApp;
function getApps() {
    return Array.from(internal_1._apps.values());
}
exports.getApps = getApps;
function getFirstApp() {
    let app;
    if (internal_1._apps.has(DEFAULT_ENTRY_NAME)) {
        app = internal_1._apps.get(DEFAULT_ENTRY_NAME);
    }
    app = !app ? getApps()[0] : app;
    if (!app) {
        throw erros_1.ERROR_FACTORY.create("no-app" /* AppError.NO_APP */, { appName: DEFAULT_ENTRY_NAME });
    }
    return app;
}
exports.getFirstApp = getFirstApp;
function deleteApp(app) {
    const name = app.name;
    if (internal_1._apps.has(name)) {
        internal_1._apps.delete(name);
        app.isDeleted = true;
    }
}
exports.deleteApp = deleteApp;

},{"../controller/erros":5,"../server":12,"./internal":2,"./verifyStorage":3,"ivipbase-core":52}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._apps = void 0;
/**
 * @internal
 */
exports._apps = new Map();

},{}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStorageSettings = exports.DataStorage = exports.CustomStorage = exports.applySettings = exports.validSettings = void 0;
const storage_1 = require("../../controller/storage");
Object.defineProperty(exports, "CustomStorage", { enumerable: true, get: function () { return storage_1.CustomStorage; } });
Object.defineProperty(exports, "DataStorage", { enumerable: true, get: function () { return storage_1.DataStorage; } });
Object.defineProperty(exports, "DataStorageSettings", { enumerable: true, get: function () { return storage_1.DataStorageSettings; } });
function validSettings(options) {
    return options instanceof storage_1.DataStorageSettings || options instanceof storage_1.CustomStorage;
}
exports.validSettings = validSettings;
function applySettings(dbname, options) {
    if (options instanceof storage_1.DataStorageSettings) {
        return new storage_1.DataStorage(options);
    }
    else if (options instanceof storage_1.CustomStorage) {
        return options;
    }
    return new storage_1.DataStorage();
}
exports.applySettings = applySettings;

},{"../../controller/storage":10}],4:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStorageSettings = exports.CustomStorage = void 0;
var storage_1 = require("./controller/storage");
Object.defineProperty(exports, "CustomStorage", { enumerable: true, get: function () { return storage_1.CustomStorage; } });
Object.defineProperty(exports, "DataStorageSettings", { enumerable: true, get: function () { return storage_1.DataStorageSettings; } });
__exportStar(require("./app"), exports);
__exportStar(require("./database"), exports);

},{"./app":1,"./controller/storage":10,"./database":11}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_FACTORY = void 0;
const util_1 = require("./util");
const ERRORS = {
    ["no-app" /* AppError.NO_APP */]: "Nenhum aplicativo iVipBase '{$appName}' foi criado - " + "chame inicializeApp() primeiro",
    ["bad-app-name" /* AppError.BAD_APP_NAME */]: "Nome de aplicativo ilegal: '{$appName}",
    ["duplicate-app" /* AppError.DUPLICATE_APP */]: "O aplicativo Firebase chamado '{$appName}' já existe com diferentes opções ou configurações",
    ["app-deleted" /* AppError.APP_DELETED */]: "Aplicativo iVipBase chamado '{$appName}' já excluído",
    ["db-disconnected" /* AppError.DB_DISCONNECTED */]: "Banco de dados '{$dbName}' desconectado",
    ["db-connection-error" /* AppError.DB_CONNECTION_ERROR */]: "Database connection error: {$error}",
};
exports.ERROR_FACTORY = new util_1.ErrorFactory("app", "Firebase", ERRORS);

},{"./util":6}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorFactory = exports.MainError = void 0;
const ERROR_NAME = "iVipBaseError";
class MainError extends Error {
    constructor(
    /** O código de erro para este erro. */
    code, message, 
    /** Dados personalizados para este erro. */
    customData) {
        super(message);
        this.code = code;
        this.customData = customData;
        /** O nome personalizado para todos os iVipBaseError. */
        this.name = ERROR_NAME;
        // Fix For ES5
        // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(this, MainError.prototype);
        // Mantém o rastreamento de pilha adequado para onde nosso erro foi gerado.
        // Disponível apenas no V8.
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ErrorFactory.prototype.create);
        }
    }
}
exports.MainError = MainError;
const PATTERN = /\{\$([^}]+)}/g;
function replaceTemplate(template, data) {
    return template.replace(PATTERN, (_, key) => {
        const value = data[key];
        return value != null ? String(value) : `<${key}?>`;
    });
}
class ErrorFactory {
    constructor(service, serviceName, errors) {
        this.service = service;
        this.serviceName = serviceName;
        this.errors = errors;
    }
    create(code, ...data) {
        const customData = data[0] || {};
        const fullCode = `${this.service}/${code}`;
        const template = this.errors[code];
        const message = template ? replaceTemplate(template, customData) : "Error";
        // Nome do serviço: Mensagem de erro (serviço/código).
        const fullMessage = `${this.serviceName}: ${message} (${fullCode}).`;
        const error = new MainError(fullCode, fullMessage, customData);
        return error;
    }
}
exports.ErrorFactory = ErrorFactory;

},{}],7:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomStorage = exports.CustomStorageSettings = void 0;
const erros_1 = require("../erros");
const MDE_1 = __importStar(require("./MDE"));
class CustomStorageSettings extends MDE_1.MDESettings {
    constructor(options = {}) {
        super(options);
    }
}
exports.CustomStorageSettings = CustomStorageSettings;
class CustomStorage extends MDE_1.default {
    constructor(options = {}) {
        super(Object.assign(Object.assign({}, options), { getMultiple: (e) => {
                if (!this.ready) {
                    throw erros_1.ERROR_FACTORY.create("db-disconnected" /* AppError.DB_DISCONNECTED */, { dbName: this.dbName });
                }
                return this.getMultiple(e);
            }, setNode: (path, content, node) => {
                if (!this.ready) {
                    throw erros_1.ERROR_FACTORY.create("db-disconnected" /* AppError.DB_DISCONNECTED */, { dbName: this.dbName });
                }
                return this.setNode(path, content, node);
            }, removeNode: (path, content, node) => {
                if (!this.ready) {
                    throw erros_1.ERROR_FACTORY.create("db-disconnected" /* AppError.DB_DISCONNECTED */, { dbName: this.dbName });
                }
                return this.removeNode(path, content, node);
            } }));
        this.dbName = "CustomStorage";
        this.ready = false;
    }
}
exports.CustomStorage = CustomStorage;

},{"../erros":5,"./MDE":9}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStorage = exports.DataStorageSettings = void 0;
const CustomStorage_1 = require("./CustomStorage");
class DataStorageSettings extends CustomStorage_1.CustomStorageSettings {
    constructor(options = {}) {
        super(options);
    }
}
exports.DataStorageSettings = DataStorageSettings;
class DataStorage extends CustomStorage_1.CustomStorage {
    constructor(options = {}) {
        super(options);
        this.data = new Map();
        this.dbName = "TempStorage";
        this.ready = true;
    }
    async getMultiple(expression) {
        const list = [];
        for (let path in this.data) {
            if (expression.test(path)) {
                const content = this.data.get(path);
                if (content) {
                    list.push({ path, content });
                }
            }
        }
        return list;
    }
    async setNode(path, content) {
        this.data.set(path, content);
    }
    async removeNode(path) {
        this.data.delete(path);
    }
}
exports.DataStorage = DataStorage;

},{"./CustomStorage":7}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MDESettings = exports.getValueType = exports.getNodeValueType = exports.getValueTypeName = exports.VALUE_TYPES = exports.nodeValueTypes = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const ivip_utils_1 = require("ivip-utils");
const { assert } = ivipbase_core_1.Lib;
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
const promiseState = (p) => {
    const t = { __timestamp__: Date.now() };
    return Promise.race([p, t]).then((v) => (v === t ? "pending" : "fulfilled"), () => "rejected");
};
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
        this.sendingNodes = Promise.resolve();
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
            const verifyNodes = comparison.filter(({ type }) => {
                return type === "VERIFY";
            });
            for (let verify of verifyNodes) {
                if (result.findIndex(({ path }) => ivipbase_core_1.PathInfo.get(verify.path).equals(path)) < 0) {
                    result.push(verify);
                    added.push(verify);
                }
            }
            comparison = comparison.filter(({ type }) => {
                return type !== "VERIFY";
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
    async sendNodes() {
        const status = await promiseState(this.sendingNodes);
        if (status === "pending") {
            return;
        }
        this.sendingNodes = new Promise(async (resolve) => {
            let batch = this.nodes.splice(0);
            const { added, modified, removed } = this.prepareMergeNodes(batch);
            try {
                for (let node of removed) {
                    const reg = this.pathToRegex(node.path, false, true);
                    const byNodes = await this.settings.getMultiple(reg);
                    for (let r of byNodes) {
                        await this.settings.removeNode(r.path, r.content, r);
                        batch = batch.filter(({ path }) => ivipbase_core_1.PathInfo.get(path).equals(r.path) !== true);
                        this.emit("remove", {
                            name: "remove",
                            path: r.path,
                            value: r.content.value,
                        });
                    }
                }
                for (let node of modified) {
                    await this.settings.setNode(node.path, node.content, node);
                    batch = batch.filter(({ path }) => ivipbase_core_1.PathInfo.get(path).equals(node.path) !== true);
                    this.emit("change", {
                        name: "change",
                        path: node.path,
                        value: node.content.value,
                    });
                }
                for (let node of added) {
                    await this.settings.setNode(node.path, node.content, node);
                    batch = batch.filter(({ path }) => ivipbase_core_1.PathInfo.get(path).equals(node.path) !== true);
                    this.emit("add", {
                        name: "add",
                        path: node.path,
                        value: node.content.value,
                    });
                }
            }
            catch (_a) { }
            this.nodes = this.nodes.concat(batch);
            resolve();
        });
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
    getChildren(path) {
        const pathInfo = ivipbase_core_1.PathInfo.get(path);
        const next = async (callback) => {
            var _a;
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
                isContinue = (_a = callback(info)) !== null && _a !== void 0 ? _a : true;
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
    async get(path, onlyChildren = true) {
        return undefined;
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
    async set(path, value, options = {}) { }
}
exports.default = MDE;

},{"ivip-utils":26,"ivipbase-core":52}],10:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./DataStorage"), exports);
__exportStar(require("./CustomStorage"), exports);

},{"./CustomStorage":7,"./DataStorage":8}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabase = exports.DataBase = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const app_1 = require("../app");
const MDE_1 = require("../controller/storage/MDE");
class StorageDBServer extends ivipbase_core_1.Api {
    constructor(db) {
        super();
        this.db = db;
        this.cache = {};
        this.db.emit("ready");
    }
    async stats() {
        return {
            writes: 0,
            reads: 0,
            bytesRead: 0,
            bytesWritten: 0,
        };
    }
    subscribe(path, event, callback) {
        this.db.subscriptions.add(path, event, callback);
    }
    unsubscribe(path, event, callback) {
        this.db.subscriptions.remove(path, event, callback);
    }
    async set(path, value, options) {
        await this.db.app.storage.set(path, value);
        return {};
    }
    async get(path, options) {
        if (!options) {
            options = {};
        }
        if (typeof options.include !== "undefined" && !(options.include instanceof Array)) {
            throw new TypeError(`options.include must be an array of key names`);
        }
        if (typeof options.exclude !== "undefined" && !(options.exclude instanceof Array)) {
            throw new TypeError(`options.exclude must be an array of key names`);
        }
        const value = await this.db.app.storage.get(path);
        return { value, context: { more: false } };
    }
    async update(path, updates, options) {
        await this.db.app.storage.set(path, updates);
        return {};
    }
    async exists(path) {
        return await this.db.app.storage.isPathExists(path);
    }
    async reflect(path, type, args) {
        var _a, _b, _c, _d, _e;
        args = args || {};
        const getChildren = async (path, limit = 50, skip = 0, from = null) => {
            if (typeof limit === "string") {
                limit = parseInt(limit);
            }
            if (typeof skip === "string") {
                skip = parseInt(skip);
            }
            if (["null", "undefined", null, undefined].includes(from)) {
                from = null;
            }
            const children = []; // Array<{ key: string | number; type: string; value: any; address?: any }>;
            let n = 0, stop = false, more = false; //stop = skip + limit,
            await this.db.app.storage
                .getChildren(path)
                .next((childInfo) => {
                var _a, _b;
                if (stop) {
                    // Stop 1 child too late on purpose to make sure there's more
                    more = true;
                    return false; // Stop iterating
                }
                n++;
                const include = from !== null && childInfo.key ? childInfo.key > from : skip === 0 || n > skip;
                if (include) {
                    children.push(Object.assign({ key: (_a = (typeof childInfo.key === "string" ? childInfo.key : childInfo.index)) !== null && _a !== void 0 ? _a : "", type: (_b = childInfo.valueTypeName) !== null && _b !== void 0 ? _b : "unknown", value: childInfo.value }, (typeof childInfo.address === "object" && {
                        address: childInfo.address,
                    })));
                }
                stop = limit > 0 && children.length === limit;
            })
                .catch((err) => {
                throw err;
            });
            return {
                more,
                list: children,
            };
        };
        switch (type) {
            case "children": {
                const result = await getChildren(path, args.limit, args.skip, args.from);
                return result;
            }
            case "info": {
                const info = {
                    key: "",
                    exists: false,
                    type: "unknown",
                    value: undefined,
                    address: undefined,
                    children: {
                        count: 0,
                        more: false,
                        list: [],
                    },
                };
                const nodeInfo = await this.db.app.storage.getInfoBy(path, { include_child_count: args.child_count === true });
                info.key = (_a = (typeof nodeInfo.key !== "undefined" ? nodeInfo.key : nodeInfo.index)) !== null && _a !== void 0 ? _a : "";
                info.exists = (_b = nodeInfo.exists) !== null && _b !== void 0 ? _b : false;
                info.type = (_c = (nodeInfo.exists ? nodeInfo.valueTypeName : undefined)) !== null && _c !== void 0 ? _c : "unknown";
                info.value = nodeInfo.value;
                info.address = typeof nodeInfo.address === "object" ? nodeInfo.address : undefined;
                const isObjectOrArray = nodeInfo.exists && nodeInfo.address && [MDE_1.VALUE_TYPES.OBJECT, MDE_1.VALUE_TYPES.ARRAY].includes((_d = nodeInfo.type) !== null && _d !== void 0 ? _d : 0);
                if (args.child_count === true) {
                    info.children = { count: isObjectOrArray ? (_e = nodeInfo.childCount) !== null && _e !== void 0 ? _e : 0 : 0 };
                }
                else if (typeof args.child_limit === "number" && args.child_limit > 0) {
                    if (isObjectOrArray) {
                        info.children = await getChildren(path, args.child_limit, args.child_skip, args.child_from);
                    }
                }
                return info;
            }
        }
    }
}
class StorageDBClient extends ivipbase_core_1.Api {
    constructor(db) {
        super();
        this.db = db;
        this.cache = {};
        this.db.emit("ready");
    }
}
const SUPPORTED_EVENTS = ["value", "child_added", "child_changed", "child_removed", "mutated", "mutations"];
SUPPORTED_EVENTS.push(...SUPPORTED_EVENTS.map((event) => `notify_${event}`));
class DataBase extends ivipbase_core_1.DataBase {
    constructor(app = undefined, options) {
        const appNow = typeof app === "string" ? (0, app_1.getApp)(app) : app instanceof app_1.IvipBaseApp ? app : (0, app_1.getFirstApp)();
        super(appNow.settings.dbname, options);
        this._eventSubscriptions = {};
        this.subscriptions = {
            /**
             * Adiciona uma assinatura a um nó
             * @param path Caminho para o nó ao qual adicionar a assinatura
             * @param type Tipo da assinatura
             * @param callback Função de retorno de chamada da assinatura
             */
            add: (path, type, callback) => {
                if (SUPPORTED_EVENTS.indexOf(type) < 0) {
                    throw new TypeError(`Invalid event type "${type}"`);
                }
                let pathSubs = this._eventSubscriptions[path];
                if (!pathSubs) {
                    pathSubs = this._eventSubscriptions[path] = [];
                }
                // if (pathSubs.findIndex(ps => ps.type === type && ps.callback === callback)) {
                //     storage.debug.warn(`Identical subscription of type ${type} on path "${path}" being added`);
                // }
                pathSubs.push({ created: Date.now(), type, callback });
                //this.emit('subscribe', { path, event: type, callback });
            },
            /**
             * Remove 1 ou mais assinaturas de um nó
             * @param path Caminho para o nó do qual remover a assinatura
             * @param type Tipo de assinatura(s) a ser removido (opcional: se omitido, todos os tipos serão removidos)
             * @param callback Callback a ser removido (opcional: se omitido, todos do mesmo tipo serão removidos)
             */
            remove: (path, type, callback) => {
                const pathSubs = this._eventSubscriptions[path];
                if (!pathSubs) {
                    return;
                }
                const next = () => pathSubs.findIndex((ps) => (type ? ps.type === type : true) && (callback ? ps.callback === callback : true));
                let i;
                while ((i = next()) >= 0) {
                    pathSubs.splice(i, 1);
                }
                //this.emit('unsubscribe', { path, event: type, callback });
            },
            /**
             * Verifica se existem assinantes no caminho fornecido que precisam do valor anterior do nó quando uma alteração é acionada
             * @param path
             */
            hasValueSubscribersForPath(path) {
                const valueNeeded = this.getValueSubscribersForPath(path);
                return !!valueNeeded;
            },
            /**
             * Obtém todos os assinantes no caminho fornecido que precisam do valor anterior do nó quando uma alteração é acionada
             * @param path
             */
            getValueSubscribersForPath: (path) => {
                // Assinantes que DEVEM ter o valor anterior completo de um nó antes da atualização:
                //  - Eventos "value" no próprio caminho e em qualquer caminho ancestral
                //  - Eventos "child_added", "child_removed" no caminho pai
                //  - Eventos "child_changed" no caminho pai e em seus ancestrais
                //  - TODOS os eventos em caminhos filhos/descendentes
                const pathInfo = new ivipbase_core_1.PathInfo(path);
                const valueSubscribers = [];
                Object.keys(this._eventSubscriptions).forEach((subscriptionPath) => {
                    if (pathInfo.equals(subscriptionPath) || pathInfo.isDescendantOf(subscriptionPath)) {
                        // Caminho sendo atualizado === subscriptionPath, ou um caminho filho/descendente dele
                        // por exemplo, caminho === "posts/123/title"
                        // e subscriptionPath é "posts/123/title", "posts/$postId/title", "posts/123", "posts/*", "posts", etc.
                        const pathSubs = this._eventSubscriptions[subscriptionPath];
                        const eventPath = ivipbase_core_1.PathInfo.fillVariables(subscriptionPath, path);
                        pathSubs
                            .filter((sub) => !sub.type.startsWith("notify_")) // Eventos de notificação não precisam de carregamento de valor adicional
                            .forEach((sub) => {
                            let dataPath = null;
                            if (sub.type === "value") {
                                // ["value", "notify_value"].includes(sub.type)
                                dataPath = eventPath;
                            }
                            else if (["mutated", "mutations"].includes(sub.type) && pathInfo.isDescendantOf(eventPath)) {
                                //["mutated", "notify_mutated"].includes(sub.type)
                                dataPath = path; // A única informação necessária são as propriedades sendo atualizadas no caminho alvo
                            }
                            else if (sub.type === "child_changed" && path !== eventPath) {
                                // ["child_changed", "notify_child_changed"].includes(sub.type)
                                const childKey = ivipbase_core_1.PathInfo.getPathKeys(path.slice(eventPath.length).replace(/^\//, ""))[0];
                                dataPath = ivipbase_core_1.PathInfo.getChildPath(eventPath, childKey);
                            }
                            else if (["child_added", "child_removed"].includes(sub.type) && pathInfo.isChildOf(eventPath)) {
                                //["child_added", "child_removed", "notify_child_added", "notify_child_removed"]
                                const childKey = ivipbase_core_1.PathInfo.getPathKeys(path.slice(eventPath.length).replace(/^\//, ""))[0];
                                dataPath = ivipbase_core_1.PathInfo.getChildPath(eventPath, childKey);
                            }
                            if (dataPath !== null && !valueSubscribers.some((s) => s.type === sub.type && s.eventPath === eventPath)) {
                                valueSubscribers.push({ type: sub.type, eventPath, dataPath, subscriptionPath });
                            }
                        });
                    }
                });
                return valueSubscribers;
            },
            /**
             * Obtém todos os assinantes no caminho fornecido que possivelmente podem ser acionados após a atualização de um nó
             */
            getAllSubscribersForPath: (path) => {
                const pathInfo = ivipbase_core_1.PathInfo.get(path);
                const subscribers = [];
                Object.keys(this._eventSubscriptions).forEach((subscriptionPath) => {
                    // if (pathInfo.equals(subscriptionPath) //path === subscriptionPath
                    //     || pathInfo.isDescendantOf(subscriptionPath)
                    //     || pathInfo.isAncestorOf(subscriptionPath)
                    // ) {
                    if (pathInfo.isOnTrailOf(subscriptionPath)) {
                        const pathSubs = this._eventSubscriptions[subscriptionPath];
                        const eventPath = ivipbase_core_1.PathInfo.fillVariables(subscriptionPath, path);
                        pathSubs.forEach((sub) => {
                            let dataPath = null;
                            if (sub.type === "value" || sub.type === "notify_value") {
                                dataPath = eventPath;
                            }
                            else if (["child_changed", "notify_child_changed"].includes(sub.type)) {
                                const childKey = path === eventPath || pathInfo.isAncestorOf(eventPath) ? "*" : ivipbase_core_1.PathInfo.getPathKeys(path.slice(eventPath.length).replace(/^\//, ""))[0];
                                dataPath = ivipbase_core_1.PathInfo.getChildPath(eventPath, childKey);
                            }
                            else if (["mutated", "mutations", "notify_mutated", "notify_mutations"].includes(sub.type)) {
                                dataPath = path;
                            }
                            else if (["child_added", "child_removed", "notify_child_added", "notify_child_removed"].includes(sub.type) &&
                                (pathInfo.isChildOf(eventPath) || path === eventPath || pathInfo.isAncestorOf(eventPath))) {
                                const childKey = path === eventPath || pathInfo.isAncestorOf(eventPath) ? "*" : ivipbase_core_1.PathInfo.getPathKeys(path.slice(eventPath.length).replace(/^\//, ""))[0];
                                dataPath = ivipbase_core_1.PathInfo.getChildPath(eventPath, childKey); //NodePath(subscriptionPath).childPath(childKey);
                            }
                            if (dataPath !== null && !subscribers.some((s) => s.type === sub.type && s.eventPath === eventPath && s.subscriptionPath === subscriptionPath)) {
                                // && subscribers.findIndex(s => s.type === sub.type && s.dataPath === dataPath) < 0
                                subscribers.push({ type: sub.type, eventPath, dataPath, subscriptionPath });
                            }
                        });
                    }
                });
                return subscribers;
            },
            /**
             * Aciona eventos de assinatura para serem executados em nós relevantes
             * @param event Tipo de evento: "value", "child_added", "child_changed", "child_removed"
             * @param path Caminho para o nó no qual a assinatura está presente
             * @param dataPath Caminho para o nó onde o valor está armazenado
             * @param oldValue Valor antigo
             * @param newValue Novo valor
             * @param context Contexto usado pelo cliente que atualizou esses dados
             */
            trigger: (event, path, dataPath, oldValue, newValue, context) => {
                //console.warn(`Event "${event}" triggered on node "/${path}" with data of "/${dataPath}": `, newValue);
                const pathSubscriptions = this._eventSubscriptions[path] || [];
                pathSubscriptions
                    .filter((sub) => sub.type === event)
                    .forEach((sub) => {
                    sub.callback(null, dataPath, newValue, oldValue, context);
                    // if (event.startsWith('notify_')) {
                    //     // Notify only event, run callback without data
                    //     sub.callback(null, dataPath);
                    // }
                    // else {
                    //     // Run callback with data
                    //     sub.callback(null, dataPath, newValue, oldValue);
                    // }
                });
            },
        };
        this.app = appNow;
        const hostnameRegex = /^(?:(?:https?|ftp):\/\/)?(?:localhost|(?:[a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,}|(?:\d{1,3}\.){3}\d{1,3})$/;
        const valid_client = !!appNow.settings.client && typeof appNow.settings.client.host === "string" && hostnameRegex.test(appNow.settings.client.host.trim());
        this.storage = appNow.isServer || !valid_client ? new StorageDBServer(this) : new StorageDBClient(this);
        this.emitOnce("ready");
    }
}
exports.DataBase = DataBase;
function getDatabase(app = undefined, options) {
    return new DataBase(app, options);
}
exports.getDatabase = getDatabase;

},{"../app":1,"../controller/storage/MDE":9,"ivipbase-core":52}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalServer = exports.AbstractLocalServer = exports.isPossiblyServer = exports.ServerSettings = exports.ServerAuthenticationSettings = exports.AUTH_ACCESS_DEFAULT = exports.ExternalServerError = exports.ServerNotReadyError = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const database_1 = require("../database");
class ServerNotReadyError extends Error {
    constructor() {
        super("O servidor ainda não está pronto");
    }
}
exports.ServerNotReadyError = ServerNotReadyError;
class ExternalServerError extends Error {
    constructor() {
        super("Este método não está disponível com um servidor externo");
    }
}
exports.ExternalServerError = ExternalServerError;
exports.AUTH_ACCESS_DEFAULT = {
    DENY_ALL: "deny",
    ALLOW_ALL: "allow",
    ALLOW_AUTHENTICATED: "auth",
};
class ServerAuthenticationSettings {
    constructor(settings = {}) {
        /**
         * Se autorização deve ser habilitada. Sem autorização, o banco de dados inteiro pode ser lido e gravado por qualquer pessoa (não recomendado 🤷🏼‍♂️)
         */
        this.enabled = true;
        /**
         * Se a criação de novos usuários é permitida para qualquer pessoa ou apenas para o administrador
         */
        this.allowUserSignup = false;
        /**
         * Quantos novos usuários podem se inscrever por hora por endereço IP. Não implementado ainda
         */
        this.newUserRateLimit = 0;
        /**
         * Quantos minutos antes dos tokens de acesso expirarem. 0 para sem expiração. (não implementado ainda)
         */
        this.tokensExpire = 0;
        /**
         * Quando o servidor é executado pela primeira vez, quais padrões usar para gerar o arquivo rules.json. Opções são: 'auth' (acesso apenas autenticado ao banco de dados, padrão), 'deny' (negar acesso a qualquer pessoa, exceto o usuário administrador), 'allow' (permitir acesso a qualquer pessoa)
         */
        this.defaultAccessRule = exports.AUTH_ACCESS_DEFAULT.ALLOW_AUTHENTICATED;
        /**
         * Se deve usar um banco de dados separado para autenticação e logs. 'v2' armazenará dados em auth.db, o que AINDA NÃO FOI TESTADO!
         */
        this.separateDb = false;
        if (typeof settings !== "object") {
            settings = {};
        }
        if (typeof settings.enabled === "boolean") {
            this.enabled = settings.enabled;
        }
        if (typeof settings.allowUserSignup === "boolean") {
            this.allowUserSignup = settings.allowUserSignup;
        }
        if (typeof settings.newUserRateLimit === "number") {
            this.newUserRateLimit = settings.newUserRateLimit;
        }
        if (typeof settings.tokensExpire === "number") {
            this.tokensExpire = settings.tokensExpire;
        }
        if (typeof settings.defaultAccessRule === "string") {
            this.defaultAccessRule = settings.defaultAccessRule;
        }
        if (typeof settings.defaultAdminPassword === "string") {
            this.defaultAdminPassword = settings.defaultAdminPassword;
        }
        if (typeof settings.seperateDb === "boolean") {
            this.separateDb = settings.seperateDb;
        } // Lidar com a grafia anterior _errada_
        if (typeof settings.separateDb === "boolean") {
            this.separateDb = settings.separateDb;
        }
    }
}
exports.ServerAuthenticationSettings = ServerAuthenticationSettings;
class ServerSettings {
    constructor(options = {}) {
        this.serverName = "IVIPBASE";
        this.logLevel = "log";
        this.host = "localhost";
        this.port = 3000;
        this.rootPath = "";
        this.maxPayloadSize = "10mb";
        this.allowOrigin = "*";
        this.trustProxy = true;
        if (typeof options.serverName === "string") {
            this.serverName = options.serverName;
        }
        if (typeof options.logLevel === "string" && ["verbose", "log", "warn", "error"].includes(options.logLevel)) {
            this.logLevel = options.logLevel;
        }
        if (typeof options.host === "string") {
            this.host = options.host;
        }
        if (typeof options.port === "number") {
            this.port = options.port;
        }
        if (typeof options.maxPayloadSize === "string") {
            this.maxPayloadSize = options.maxPayloadSize;
        }
        if (typeof options.allowOrigin === "string") {
            this.allowOrigin = options.allowOrigin;
        }
        if (typeof options.trustProxy === "boolean") {
            this.trustProxy = options.trustProxy;
        }
        if (typeof options.email === "object") {
            this.email = options.email;
        }
        this.auth = new ServerAuthenticationSettings(options.authentication);
        if (typeof options.init === "function") {
            this.init = options.init;
        }
    }
}
exports.ServerSettings = ServerSettings;
exports.isPossiblyServer = false;
class AbstractLocalServer extends ivipbase_core_1.SimpleEventEmitter {
    constructor(appName, settings = {}) {
        super();
        this.appName = appName;
        this._ready = false;
        this.settings = new ServerSettings(settings);
        this.debug = new ivipbase_core_1.DebugLogger(this.settings.logLevel, `[${this.settings.serverName}]`);
        this.db = (0, database_1.getDatabase)(appName);
        this.once("ready", () => {
            this._ready = true;
        });
    }
    /**
     * Aguarda o servidor estar pronto antes de executar o seu callback.
     * @param callback (opcional) função de retorno chamada quando o servidor estiver pronto para ser usado. Você também pode usar a promise retornada.
     * @returns retorna uma promise que resolve quando estiver pronto
     */
    async ready(callback) {
        if (!this._ready) {
            // Aguarda o evento ready
            await new Promise((resolve) => this.on("ready", resolve));
        }
        callback === null || callback === void 0 ? void 0 : callback();
    }
    get isReady() {
        return this._ready;
    }
    /**
     * Gets the url the server is running at
     */
    get url() {
        //return `http${this.settings.https.enabled ? 's' : ''}://${this.settings.host}:${this.settings.port}/${this.settings.rootPath}`;
        return `http://${this.settings.host}:${this.settings.port}/${this.settings.rootPath}`;
    }
}
exports.AbstractLocalServer = AbstractLocalServer;
class LocalServer extends AbstractLocalServer {
    constructor(appName, settings = {}) {
        super(appName, settings);
        this.appName = appName;
        this.isServer = false;
        this.init();
    }
    init() {
        this.emitOnce("ready");
    }
}
exports.LocalServer = LocalServer;

},{"../database":11,"ivipbase-core":52}],13:[function(require,module,exports){

},{}],14:[function(require,module,exports){
/**
 * cuid.js
 * Collision-resistant UID generator for browsers and node.
 * Sequential for fast db lookups and recency sorting.
 * Safe for element IDs and server-side lookups.
 *
 * Extracted from CLCTR
 *
 * Copyright (c) Eric Elliott 2012
 * MIT License
 */

var fingerprint = require('./lib/fingerprint.js');
var pad = require('./lib/pad.js');
var getRandomValue = require('./lib/getRandomValue.js');

var c = 0,
  blockSize = 4,
  base = 36,
  discreteValues = Math.pow(base, blockSize);

function randomBlock () {
  return pad((getRandomValue() *
    discreteValues << 0)
    .toString(base), blockSize);
}

function safeCounter () {
  c = c < discreteValues ? c : 0;
  c++; // this is not subliminal
  return c - 1;
}

function cuid () {
  // Starting with a lowercase letter makes
  // it HTML element ID friendly.
  var letter = 'c', // hard-coded allows for sequential access

    // timestamp
    // warning: this exposes the exact date and time
    // that the uid was created.
    timestamp = (new Date().getTime()).toString(base),

    // Prevent same-machine collisions.
    counter = pad(safeCounter().toString(base), blockSize),

    // A few chars to generate distinct ids for different
    // clients (so different computers are far less
    // likely to generate the same id)
    print = fingerprint(),

    // Grab some more chars from Math.random()
    random = randomBlock() + randomBlock();

  return letter + timestamp + counter + print + random;
}

cuid.slug = function slug () {
  var date = new Date().getTime().toString(36),
    counter = safeCounter().toString(36).slice(-4),
    print = fingerprint().slice(0, 1) +
      fingerprint().slice(-1),
    random = randomBlock().slice(-2);

  return date.slice(-2) +
    counter + print + random;
};

cuid.isCuid = function isCuid (stringToCheck) {
  if (typeof stringToCheck !== 'string') return false;
  if (stringToCheck.startsWith('c')) return true;
  return false;
};

cuid.isSlug = function isSlug (stringToCheck) {
  if (typeof stringToCheck !== 'string') return false;
  var stringLength = stringToCheck.length;
  if (stringLength >= 7 && stringLength <= 10) return true;
  return false;
};

cuid.fingerprint = fingerprint;

module.exports = cuid;

},{"./lib/fingerprint.js":15,"./lib/getRandomValue.js":16,"./lib/pad.js":17}],15:[function(require,module,exports){
var pad = require('./pad.js');

var env = typeof window === 'object' ? window : self;
var globalCount = Object.keys(env).length;
var mimeTypesLength = navigator.mimeTypes ? navigator.mimeTypes.length : 0;
var clientId = pad((mimeTypesLength +
  navigator.userAgent.length).toString(36) +
  globalCount.toString(36), 4);

module.exports = function fingerprint () {
  return clientId;
};

},{"./pad.js":17}],16:[function(require,module,exports){

var getRandomValue;

var crypto = typeof window !== 'undefined' &&
  (window.crypto || window.msCrypto) ||
  typeof self !== 'undefined' &&
  self.crypto;

if (crypto) {
    var lim = Math.pow(2, 32) - 1;
    getRandomValue = function () {
        return Math.abs(crypto.getRandomValues(new Uint32Array(1))[0] / lim);
    };
} else {
    getRandomValue = Math.random;
}

module.exports = getRandomValue;

},{}],17:[function(require,module,exports){
module.exports = function pad (num, size) {
  var s = '000000000' + num;
  return s.substr(s.length - size);
};

},{}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function c(input, length, result) {
    const b = [0, 0, 0, 0, 0];
    for (let i = 0; i < length; i += 4) {
        let n = ((input[i] * 256 + input[i + 1]) * 256 + input[i + 2]) * 256 + input[i + 3];
        if (!n) {
            result.push("z");
        }
        else {
            for (let j = 0; j < 5; b[j++] = (n % 85) + 33, n = Math.floor(n / 85)) { }
            result.push(String.fromCharCode(b[4], b[3], b[2], b[1], b[0]));
        }
    }
}
function encode(arr) {
    // summary: encodes input data in ascii85 string
    // input: ArrayLike
    var _a;
    const input = arr, result = [], remainder = input.length % 4, length = input.length - remainder;
    c(input, length, result);
    if (remainder) {
        const t = new Uint8Array(4);
        t.set(input.slice(length), 0);
        c(t, 4, result);
        let x = (_a = result.pop()) !== null && _a !== void 0 ? _a : "";
        if (x == "z") {
            x = "!!!!!";
        }
        result.push(x.substr(0, remainder + 1));
    }
    let ret = result.join(""); // String
    ret = "<~" + ret + "~>";
    return ret;
}
const ascii85 = {
    encode: function (arr) {
        if (arr instanceof ArrayBuffer) {
            arr = new Uint8Array(arr, 0, arr.byteLength);
        }
        return encode(arr);
    },
    decode: function (input) {
        // summary: decodes the input string back to an ArrayBuffer
        // input: String: the input string to decode
        if (!input.startsWith("<~") || !input.endsWith("~>")) {
            throw new Error("Invalid input string");
        }
        input = input.substr(2, input.length - 4);
        const n = input.length, r = [], b = [0, 0, 0, 0, 0];
        let t, x, y, d;
        for (let i = 0; i < n; ++i) {
            if (input.charAt(i) == "z") {
                r.push(0, 0, 0, 0);
                continue;
            }
            for (let j = 0; j < 5; ++j) {
                b[j] = input.charCodeAt(i + j) - 33;
            }
            d = n - i;
            if (d < 5) {
                for (let j = d; j < 4; b[++j] = 0) { }
                b[d] = 85;
            }
            t = (((b[0] * 85 + b[1]) * 85 + b[2]) * 85 + b[3]) * 85 + b[4];
            x = t & 255;
            t >>>= 8;
            y = t & 255;
            t >>>= 8;
            r.push(t >>> 8, t & 255, y, x);
            for (let j = d; j < 5; ++j, r.pop()) { }
            i += 4;
        }
        const data = new Uint8Array(r);
        return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    },
};
exports.default = ascii85;

},{}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Base64 {
    constructor(value) {
        this.value = value;
        this.keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    }
    static utf8_encode(value) {
        let e = value.replace(/rn/g, "n");
        let t = "";
        for (let n = 0; n < e.length; n++) {
            let r = e.charCodeAt(n);
            if (r < 128) {
                t += String.fromCharCode(r);
            }
            else if (r > 127 && r < 2048) {
                t += String.fromCharCode((r >> 6) | 192);
                t += String.fromCharCode((r & 63) | 128);
            }
            else {
                t += String.fromCharCode((r >> 12) | 224);
                t += String.fromCharCode(((r >> 6) & 63) | 128);
                t += String.fromCharCode((r & 63) | 128);
            }
        }
        return t;
    }
    static utf8_decode(value) {
        let t = "";
        let n = 0;
        let r = 0, c1 = 0, c2 = 0, c3 = 0;
        while (n < value.length) {
            r = value.charCodeAt(n);
            if (r < 128) {
                t += String.fromCharCode(r);
                n++;
            }
            else if (r > 191 && r < 224) {
                c2 = value.charCodeAt(n + 1);
                t += String.fromCharCode(((r & 31) << 6) | (c2 & 63));
                n += 2;
            }
            else {
                c2 = value.charCodeAt(n + 1);
                c3 = value.charCodeAt(n + 2);
                t += String.fromCharCode(((r & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                n += 3;
            }
        }
        return t;
    }
    encode() {
        let t = "";
        let n, r, i, s, o, u, a;
        let f = 0;
        let e = Base64.utf8_encode(this.value);
        while (f < e.length) {
            n = e.charCodeAt(f++);
            r = e.charCodeAt(f++);
            i = e.charCodeAt(f++);
            s = n >> 2;
            o = ((n & 3) << 4) | (r >> 4);
            u = ((r & 15) << 2) | (i >> 6);
            a = i & 63;
            if (isNaN(r)) {
                u = a = 64;
            }
            else if (isNaN(i)) {
                a = 64;
            }
            t = t + this.keyStr.charAt(s) + this.keyStr.charAt(o) + this.keyStr.charAt(u) + this.keyStr.charAt(a);
        }
        return t;
    }
    static encode(value) {
        return new Base64(value).encode();
    }
    decode() {
        let t = "";
        let n, r, i;
        let s, o, u, a;
        let f = 0;
        let e = this.value.replace(/[^A-Za-z0-9+/=]/g, "");
        while (f < e.length) {
            s = this.keyStr.indexOf(e.charAt(f++));
            o = this.keyStr.indexOf(e.charAt(f++));
            u = this.keyStr.indexOf(e.charAt(f++));
            a = this.keyStr.indexOf(e.charAt(f++));
            n = (s << 2) | (o >> 4);
            r = ((o & 15) << 4) | (u >> 2);
            i = ((u & 3) << 6) | a;
            t = t + String.fromCharCode(n);
            if (u != 64) {
                t = t + String.fromCharCode(r);
            }
            if (a != 64) {
                t = t + String.fromCharCode(i);
            }
        }
        t = Base64.utf8_decode(t);
        return t;
    }
    static decode(value) {
        return new Base64(value).decode();
    }
}
exports.default = Base64;

},{}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const A = (a, b) => {
    return 1.0 - 3.0 * b + 3.0 * a;
};
const B = (a, b) => {
    return 3.0 * b - 6.0 * a;
};
const C = (a) => {
    return 3.0 * a;
};
const calcBezier = (a, b, c) => {
    return ((A(b, c) * a + B(b, c)) * a + C(b)) * a;
};
const getSlope = (a, b, c) => {
    return 3.0 * A(b, c) * a * a + 2.0 * B(b, c) * a + C(b);
};
const binarySubdivide = (a, b, c, d, e) => {
    let f, g, i = 0;
    do {
        g = b + (c - b) / 2.0;
        f = calcBezier(g, d, e) - a;
        if (f > 0.0) {
            c = g;
        }
        else {
            b = g;
        }
    } while (Math.abs(f) > 0.0000001 && ++i < 10);
    return g;
};
const newtonRaphsonIterate = (a, b, c, d) => {
    for (let i = 0; i < 4; ++i) {
        let currentSlope = getSlope(b, c, d);
        if (currentSlope === 0.0) {
            return b;
        }
        let currentX = calcBezier(b, c, d) - a;
        b -= currentX / currentSlope;
    }
    return b;
};
const getTForX = (a, props) => {
    let b = 0.0, c = 1, d = props.kSplineTableSize - 1;
    for (; c !== d && props.sampleValues[c] <= a; ++c) {
        b += props.kSampleStepSize;
    }
    --c;
    let e = (a - props.sampleValues[c]) / (props.sampleValues[c + 1] - props.sampleValues[c]), f = b + e * props.kSampleStepSize, g = getSlope(f, props.x1, props.x2);
    if (g >= 0.001) {
        return newtonRaphsonIterate(a, f, props.x1, props.x2);
    }
    else if (g === 0.0) {
        return f;
    }
    else {
        return binarySubdivide(a, b, b + props.kSampleStepSize, props.x1, props.x2);
    }
};
const elastic = (x) => {
    return x * (33 * x * x * x * x - 106 * x * x * x + 126 * x * x - 67 * x + 15);
};
const easeInElastic = (x) => {
    const c4 = (2 * Math.PI) / 3;
    return x === 0 ? 0 : x === 1 ? 1 : -Math.pow(2, 10 * x - 10) * Math.sin((x * 10 - 10.75) * c4);
};
const easeInOutElastic = (x) => {
    const c5 = (2 * Math.PI) / 4.5;
    return x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? -(Math.pow(2, 20 * x - 10) * Math.sin((20 * x - 11.125) * c5)) / 2 : (Math.pow(2, -20 * x + 10) * Math.sin((20 * x - 11.125) * c5)) / 2 + 1;
};
const easeOutElastic = (x) => {
    const c4 = (2 * Math.PI) / 3;
    return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
};
const easeOutBounce = (x) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    return x < 1 / d1 ? n1 * x * x : x < 2 / d1 ? n1 * (x -= 1.5 / d1) * x + 0.75 : x < 2.5 / d1 ? n1 * (x -= 2.25 / d1) * x + 0.9375 : n1 * (x -= 2.625 / d1) * x + 0.984375;
};
const easeInBounce = (x) => {
    return 1 - easeOutBounce(1 - x);
};
const easeInOutBounce = (x) => {
    return x < 0.5 ? (1 - easeOutBounce(1 - 2 * x)) / 2 : (1 + easeOutBounce(2 * x - 1)) / 2;
};
// Define um objeto que mapeia os nomes das animações para suas formas em camelCase
const easingList = {
    "linear": "linear",
    "elastic": "elastic",
    "ease": "ease",
    "ease-in": "easeIn",
    "ease-in-elastic": "easeInElastic",
    "ease-in-bounce": "easeInBounce",
    "ease-in-expo": "easeInExpo",
    "ease-in-sine": "easeInSine",
    "ease-in-quad": "easeInQuad",
    "ease-in-cubic": "easeInCubic",
    "ease-in-back": "easeInBack",
    "ease-in-quart": "easeInQuart",
    "ease-in-quint": "easeInQuint",
    "ease-in-circ": "easeInCirc",
    "ease-in-out": "easeInOut",
    "ease-in-out-elastic": "easeInOutElastic",
    "ease-in-out-bounce": "easeInOutBounce",
    "ease-in-out-sine": "easeInOutSine",
    "ease-in-out-quad": "easeInOutQuad",
    "ease-in-out-cubic": "easeInOutCubic",
    "ease-in-out-back": "easeInOutBack",
    "ease-in-out-quart": "easeInOutQuart",
    "ease-in-out-quint": "easeInOutQuint",
    "ease-in-out-expo": "easeInOutExpo",
    "ease-in-out-circ": "easeInOutCirc",
    "ease-out": "easeOut",
    "ease-out-elastic": "easeOutElastic",
    "ease-out-bounce": "easeOutBounce",
    "ease-out-sine": "easeOutSine",
    "ease-out-quad": "easeOutQuad",
    "ease-out-cubic": "easeOutCubic",
    "ease-out-back": "easeOutBack",
    "ease-out-quart": "easeOutQuart",
    "ease-out-quint": "easeOutQuint",
    "ease-out-expo": "easeOutExpo",
    "ease-out-circ": "easeOutCirc",
    "fast-out-slow-in": "fastOutSlowIn",
    "fast-out-linear-in": "fastOutLinearIn",
    "linear-out-slow-in": "linearOutSlowIn",
};
/**
 * Classe que implementa as funções de easing de Bezier
 */
class BezierEasing {
    /**
     * Cria uma nova instância de BezierEasing com os parâmetros de controle da curva de Bezier.
     *
     * @param {number} x1 - O valor x do primeiro ponto de controle (deve estar no intervalo [0, 1])
     * @param {number} y1 - O valor y do primeiro ponto de controle
     * @param {number} x2 - O valor x do segundo ponto de controle (deve estar no intervalo [0, 1])
     * @param {number} y2 - O valor y do segundo ponto de controle
     * @throws {Error} Se os valores x1 e x2 estiverem fora do intervalo [0, 1]
     * @constructor
     */
    constructor(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.kSplineTableSize = 11;
        this.kSampleStepSize = 1.0 / (this.kSplineTableSize - 1.0);
        this.sampleValues = typeof Float32Array === "function" ? new Float32Array(this.kSplineTableSize) : new Array(this.kSplineTableSize);
        if (!(0 <= x1 && x1 <= 1 && 0 <= x2 && x2 <= 1)) {
            throw new Error("bezier x values must be in [0, 1] range");
        }
        for (let i = 0; i < this.kSplineTableSize; ++i) {
            this.sampleValues[i] = calcBezier(i * this.kSampleStepSize, x1, x2);
        }
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    to(t) {
        if (this.x1 === this.y1 && this.x2 === this.y2) {
            return t;
        }
        const props = {
            x1: this.x1,
            y1: this.y1,
            x2: this.x2,
            y2: this.y2,
            kSplineTableSize: this.kSplineTableSize,
            kSampleStepSize: this.kSampleStepSize,
            sampleValues: this.sampleValues,
        };
        return t === 0 ? 0 : t === 1 ? 1 : calcBezier(getTForX(t, props), this.y1, this.y2);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static linear(t) {
        return t;
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static elastic(t) {
        return elastic(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static ease(t) {
        return new BezierEasing(0.25, 0.1, 0.25, 1.0).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeIn(t) {
        return new BezierEasing(0.42, 0.0, 1.0, 1.0).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInElastic(t) {
        return easeInElastic(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInBounce(t) {
        return easeInBounce(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInExpo(t) {
        return new BezierEasing(0.95, 0.05, 0.795, 0.035).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInSine(t) {
        return new BezierEasing(0.47, 0, 0.75, 0.72).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInQuad(t) {
        return new BezierEasing(0.55, 0.09, 0.68, 0.53).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInCubic(t) {
        return new BezierEasing(0.55, 0.06, 0.68, 0.19).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInBack(t) {
        return new BezierEasing(0.6, -0.28, 0.74, 0.05).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInQuart(t) {
        return new BezierEasing(0.895, 0.03, 0.685, 0.22).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInQuint(t) {
        return new BezierEasing(0.755, 0.05, 0.855, 0.06).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInCirc(t) {
        return new BezierEasing(0.6, 0.04, 0.98, 0.335).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInOut(t) {
        return new BezierEasing(0.42, 0.0, 0.58, 1.0).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInOutElastic(t) {
        return easeInOutElastic(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInOutBounce(t) {
        return easeInOutBounce(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInOutSine(t) {
        return new BezierEasing(0.45, 0.05, 0.55, 0.95).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInOutQuad(t) {
        return new BezierEasing(0.46, 0.03, 0.52, 0.96).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInOutCubic(t) {
        return new BezierEasing(0.65, 0.05, 0.36, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInOutBack(t) {
        return new BezierEasing(0.68, -0.55, 0.27, 1.55).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInOutQuart(t) {
        return new BezierEasing(0.77, 0, 0.175, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInOutQuint(t) {
        return new BezierEasing(0.86, 0, 0.07, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInOutExpo(t) {
        return new BezierEasing(1, 0, 0, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeInOutCirc(t) {
        return new BezierEasing(0.785, 0.135, 0.15, 0.86).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeOut(t) {
        return new BezierEasing(0.0, 0.0, 0.58, 1.0).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeOutElastic(t) {
        return easeOutElastic(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeOutBounce(t) {
        return easeOutBounce(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeOutSine(t) {
        return new BezierEasing(0.39, 0.58, 0.57, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeOutQuad(t) {
        return new BezierEasing(0.25, 0.46, 0.45, 0.94).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeOutCubic(t) {
        return new BezierEasing(0.22, 0.61, 0.36, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeOutBack(t) {
        return new BezierEasing(0.18, 0.89, 0.32, 1.28).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeOutQuart(t) {
        return new BezierEasing(0.165, 0.84, 0.44, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeOutQuint(t) {
        return new BezierEasing(0.23, 1, 0.32, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeOutExpo(t) {
        return new BezierEasing(0.19, 1, 0.22, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static easeOutCirc(t) {
        return new BezierEasing(0.075, 0.82, 0.165, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static fastOutSlowIn(t) {
        return new BezierEasing(0.4, 0, 0.2, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static fastOutLinearIn(t) {
        return new BezierEasing(0.4, 0, 1, 1).to(t);
    }
    /**
     * Calcula e retorna o valor interpolado correspondente à curva de Bezier para o valor t fornecido.
     *
     * @param {number} t - O valor t para o qual a interpolação deve ser calculada (deve estar no intervalo [0, 1])
     * @returns {number} - O valor interpolado correspondente à curva de Bezier
     */
    static linearOutSlowIn(t) {
        return new BezierEasing(0, 0, 0.2, 1).to(t);
    }
    /**
     * Função personalizada para agendar uma animação
     * @param {Function} func - A função a ser executada a cada quadro de animação
     * @param {number} delay - Atraso inicial antes da animação começar
     * @param {number} duration - Duração total da animação
     * @param {BezierEasing | keyof typeof easingList} easing - Objeto BezierEasing ou nome de animação de easing
     * @returns {number} - ID do temporizador para cancelar a animação
     */
    static setInterval(func, delay = 1, duration = 1000, easing = "linear") {
        let elapsed = 0;
        let timerDelay, start = Date.now();
        const loop = async () => {
            var _a;
            if (elapsed > duration) {
                clearTimeout(timerDelay);
                return;
            }
            const t = Math.min(1, elapsed / duration);
            if (easing instanceof BezierEasing) {
                await func(easing.to(t));
            }
            else if (typeof easing === "function") {
                await func((_a = easing(t)) !== null && _a !== void 0 ? _a : 1);
            }
            else if (easing in easingList) {
                await func(BezierEasing[easingList[easing]](t));
            }
            else {
                await func(t);
            }
            elapsed = Date.now() - start;
            timerDelay = setTimeout(loop, delay - (elapsed % delay));
        };
        loop();
        return timerDelay;
    }
}
exports.default = BezierEasing;

},{}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.infoColor = exports.hslDistance = exports.negative = exports.growing = exports.watershed = exports.colorScale = exports.grayScale = exports.lighten = exports.darken = exports.blend = exports.hwbToRgb = exports.cmykToRgb = exports.hsvToRgb = exports.hslToRgb = exports.rgbToHwb = exports.rgbToCmyk = exports.rgbToHsv = exports.rgbToHsl = exports.rgbToHex = exports.hexToRgb = exports.colorNames = void 0;
exports.colorNames = {
    aliceblue: "#f0f8ff",
    antiquewhite: "#faebd7",
    aqua: "#00ffff",
    aquamarine: "#7fffd4",
    azure: "#f0ffff",
    beige: "#f5f5dc",
    bisque: "#ffe4c4",
    black: "#000000",
    blanchedalmond: "#ffebcd",
    blue: "#0000ff",
    blueviolet: "#8a2be2",
    brown: "#a52a2a",
    burlywood: "#deb887",
    cadetblue: "#5f9ea0",
    chartreuse: "#7fff00",
    chocolate: "#d2691e",
    coral: "#ff7f50",
    cornflowerblue: "#6495ed",
    cornsilk: "#fff8dc",
    crimson: "#dc143c",
    cyan: "#00ffff",
    darkblue: "#00008b",
    darkcyan: "#008b8b",
    darkgoldenrod: "#b8860b",
    darkgray: "#a9a9a9",
    darkgreen: "#006400",
    darkgrey: "#a9a9a9",
    darkkhaki: "#bdb76b",
    darkmagenta: "#8b008b",
    darkolivegreen: "#556b2f",
    darkorange: "#ff8c00",
    darkorchid: "#9932cc",
    darkred: "#8b0000",
    darksalmon: "#e9967a",
    darkseagreen: "#8fbc8f",
    darkslateblue: "#483d8b",
    darkslategray: "#2f4f4f",
    darkslategrey: "#2f4f4f",
    darkturquoise: "#00ced1",
    darkviolet: "#9400d3",
    deeppink: "#ff1493",
    deepskyblue: "#00bfff",
    dimgray: "#696969",
    dimgrey: "#696969",
    dodgerblue: "#1e90ff",
    firebrick: "#b22222",
    floralwhite: "#fffaf0",
    forestgreen: "#228b22",
    fuchsia: "#ff00ff",
    gainsboro: "#dcdcdc",
    ghostwhite: "#f8f8ff",
    gold: "#ffd700",
    goldenrod: "#daa520",
    gray: "#808080",
    green: "#008000",
    greenyellow: "#adff2f",
    grey: "#808080",
    honeydew: "#f0fff0",
    hotpink: "#ff69b4",
    indianred: "#cd5c5c",
    indigo: "#4b0082",
    ivory: "#fffff0",
    khaki: "#f0e68c",
    lavender: "#e6e6fa",
    lavenderblush: "#fff0f5",
    lawngreen: "#7cfc00",
    lemonchiffon: "#fffacd",
    lightblue: "#add8e6",
    lightcoral: "#f08080",
    lightcyan: "#e0ffff",
    lightgoldenrodyellow: "#fafad2",
    lightgray: "#d3d3d3",
    lightgreen: "#90ee90",
    lightgrey: "#d3d3d3",
    lightpink: "#ffb6c1",
    lightsalmon: "#ffa07a",
    lightseagreen: "#20b2aa",
    lightskyblue: "#87cefa",
    lightslategray: "#778899",
    lightslategrey: "#778899",
    lightsteelblue: "#b0c4de",
    lightyellow: "#ffffe0",
    lime: "#00ff00",
    limegreen: "#32cd32",
    linen: "#faf0e6",
    magenta: "#ff00ff",
    maroon: "#800000",
    mediumaquamarine: "#66cdaa",
    mediumblue: "#0000cd",
    mediumorchid: "#ba55d3",
    mediumpurple: "#9370db",
    mediumseagreen: "#3cb371",
    mediumslateblue: "#7b68ee",
    mediumspringgreen: "#00fa9a",
    mediumturquoise: "#48d1cc",
    mediumvioletred: "#c71585",
    midnightblue: "#191970",
    mintcream: "#f5fffa",
    mistyrose: "#ffe4e1",
    moccasin: "#ffe4b5",
    navajowhite: "#ffdead",
    navy: "#000080",
    oldlace: "#fdf5e6",
    olive: "#808000",
    olivedrab: "#6b8e23",
    orange: "#ffa500",
    orangered: "#ff4500",
    orchid: "#da70d6",
    palegoldenrod: "#eee8aa",
    palegreen: "#98fb98",
    paleturquoise: "#afeeee",
    palevioletred: "#db7093",
    papayawhip: "#ffefd5",
    peachpuff: "#ffdab9",
    peru: "#cd853f",
    pink: "#ffc0cb",
    plum: "#dda0dd",
    powderblue: "#b0e0e6",
    purple: "#800080",
    red: "#ff0000",
    rosybrown: "#bc8f8f",
    royalblue: "#4169e1",
    saddlebrown: "#8b4513",
    salmon: "#fa8072",
    sandybrown: "#f4a460",
    seagreen: "#2e8b57",
    seashell: "#fff5ee",
    sienna: "#a0522d",
    silver: "#c0c0c0",
    skyblue: "#87ceeb",
    slateblue: "#6a5acd",
    slategray: "#708090",
    slategrey: "#708090",
    snow: "#fffafa",
    springgreen: "#00ff7f",
    steelblue: "#4682b4",
    tan: "#d2b48c",
    teal: "#008080",
    thistle: "#d8bfd8",
    tomato: "#ff6347",
    turquoise: "#40e0d0",
    violet: "#ee82ee",
    wheat: "#f5deb3",
    white: "#ffffff",
    whitesmoke: "#f5f5f5",
    yellow: "#ffff00",
    yellowgreen: "#9acd32",
};
const prependZeroIfNecessaryHelper = (a) => {
    return 1 == a.length ? "0" + a : a;
};
const hexToRgb = (a) => {
    let b = parseInt(a.substring(1, 3), 16), c = parseInt(a.substring(3, 5), 16), d = parseInt(a.substring(5, 7), 16);
    return [b, c, d];
};
exports.hexToRgb = hexToRgb;
const rgbToHex = (a, b, c) => {
    if (isNaN(a) || 0 > a || 255 < a || isNaN(b) || 0 > b || 255 < b || isNaN(c) || 0 > c || 255 < c) {
        return "#000000";
    }
    return "#" + [prependZeroIfNecessaryHelper(a.toString(16)), prependZeroIfNecessaryHelper(b.toString(16)), prependZeroIfNecessaryHelper(c.toString(16))].join("");
};
exports.rgbToHex = rgbToHex;
const rgbToHsl = (a, b, c) => {
    a /= 255;
    b /= 255;
    c /= 255;
    let d = Math.max(a, b, c), e = Math.min(a, b, c), f = 0, g = 0, h = 0.5 * (d + e);
    if (d != e) {
        if (d == a) {
            f = (60 * (b - c)) / (d - e);
        }
        else if (d == b) {
            f = (60 * (c - a)) / (d - e) + 120;
        }
        else if (d == c) {
            f = (60 * (a - b)) / (d - e) + 240;
        }
    }
    g = 0 < h && 0.5 >= h ? (d - e) / (2 * h) : (d - e) / (2 - 2 * h);
    return [Math.round(f + 360) % 360, Math.round(g * 100), Math.round(h * 100)];
};
exports.rgbToHsl = rgbToHsl;
const rgbToHsv = (a, b, c) => {
    let d = Math.max(Math.max(a, b), c), e = Math.min(Math.min(a, b), c), f;
    if (e == d) {
        e = a = 0;
    }
    else {
        f = d - e;
        e = f / d;
        a = 60 * (a == d ? (b - c) / f : b == d ? 2 + (c - a) / f : 4 + (a - b) / f);
        if (0 > a) {
            a += 360;
        }
        else if (360 < a) {
            a -= 360;
        }
    }
    return [Math.round(a), Math.round(e * 100), Math.round((d * 100) / 255)];
};
exports.rgbToHsv = rgbToHsv;
const rgbToCmyk = (a, b, c) => {
    let d, e, f, g, h, i, j;
    if (a == 0 && b == 0 && c == 0) {
        d = e = f = 0;
        g = 1;
    }
    else {
        h = 1 - a / 255;
        i = 1 - b / 255;
        j = 1 - c / 255;
        g = Math.min(h, Math.min(i, j));
        d = (h - g) / (1 - g);
        e = (i - g) / (1 - g);
        f = (j - g) / (1 - g);
    }
    return [Math.round(d * 100), Math.round(e * 100), Math.round(f * 100), Math.round(g * 100)];
};
exports.rgbToCmyk = rgbToCmyk;
const rgbToHwb = (a, b, c) => {
    let d, e, f, g, h, i, j;
    h = (0, exports.rgbToHsv)(a, b, c)[0];
    a /= 255;
    b /= 255;
    c /= 255;
    f = Math.min(a, b, c);
    g = Math.max(a, b, c);
    c = 1 - g;
    if (g === f) {
        /*h = 0;*/ i = Math.round(f * 100);
        j = Math.round(c * 100);
    }
    else {
        d = a === f ? b - c : b === f ? c - a : a - b;
        e = a === f ? 3 : b === f ? 5 : 1;
        h = Math.round((((e - d / (g - f)) / 6) * 100 * 360) / 100);
        if (0 > h) {
            h += 360;
        }
        else if (360 < h) {
            h -= 360;
        }
        i = Math.round(f * 100);
        j = Math.round(c * 100);
    }
    return [Math.round(h), Math.round(i), Math.round(j)];
};
exports.rgbToHwb = rgbToHwb;
const hueToRgb_ = (a, b, c) => {
    0 > c ? (c += 1) : 1 < c && (c -= 1);
    return 1 > 6 * c ? a + 6 * (b - a) * c : 1 > 2 * c ? b : 2 > 3 * c ? a + (b - a) * (2 / 3 - c) * 6 : a;
};
const hslToRgb = (a, b, c) => {
    let d = 0, e = 0, f = 0, g;
    a /= 360;
    if (0 == b) {
        d = e = f = 255 * c;
    }
    else {
        g = f = 0;
        g = 0.5 > c ? c * (1 + b) : c + b - b * c;
        f = 2 * c - g;
        d = 255 * hueToRgb_(f, g, a + 1 / 3);
        e = 255 * hueToRgb_(f, g, a);
        f = 255 * hueToRgb_(f, g, a - 1 / 3);
    }
    return [Math.round(d), Math.round(e), Math.round(f)];
};
exports.hslToRgb = hslToRgb;
const hsvToRgb = (a, b_, c) => {
    let r, g, b, d, e, f, h, i, k, l, m;
    if (b_ == 0) {
        r = g = b = Math.round(c * 255);
    }
    else {
        h = a * 6 == 6 ? 0 : a * 6;
        i = Math.floor(h);
        k = c * (1 - b_);
        l = c * (1 - b_ * (h - i));
        m = c * (1 - b_ * (1 - (h - i)));
        if (i == 0) {
            d = c;
            e = m;
            f = k;
        }
        else if (i == 1) {
            d = l;
            e = c;
            f = k;
        }
        else if (i == 2) {
            d = k;
            e = c;
            f = m;
        }
        else if (i == 3) {
            d = k;
            e = l;
            f = c;
        }
        else if (i == 4) {
            d = m;
            e = k;
            f = c;
        }
        else {
            d = c;
            e = k;
            f = l;
        }
        r = Math.round(d * 255);
        g = Math.round(e * 255);
        b = Math.round(f * 255);
    }
    return [r, g, b];
};
exports.hsvToRgb = hsvToRgb;
const cmykToRgb = (a, b, c, d) => {
    let e = 255 * (1 - a) * (1 - d), f = 255 * (1 - b) * (1 - d), g = 255 * (1 - c) * (1 - d);
    return [Math.round(e), Math.round(f), Math.round(g)];
};
exports.cmykToRgb = cmykToRgb;
const hwbToRgb = (a, b, c) => {
    let d, e, f, g, h, i, j;
    a = a * 6;
    g = 1 - c;
    j = a | 0;
    i = a - j;
    if (j & 1) {
        i = 1 - i;
    }
    h = b + i * (g - b);
    g = (g * 255) | 0;
    h = (h * 255) | 0;
    b = (b * 255) | 0;
    if (j == 0) {
        d = g;
        e = h;
        f = b;
    }
    else if (j == 1) {
        d = h;
        e = g;
        f = b;
    }
    else if (j == 2) {
        d = b;
        e = g;
        f = h;
    }
    else if (j == 3) {
        d = b;
        e = h;
        f = g;
    }
    else if (j == 4) {
        d = h;
        e = b;
        f = g;
    }
    else if (j == 5) {
        d = g;
        e = b;
        f = h;
    }
    else {
        d = e = f = g;
    }
    return [Math.round(d), Math.round(e), Math.round(f)];
};
exports.hwbToRgb = hwbToRgb;
const blend = (a, b, c) => {
    c = Math.min(Math.max(c, 0), 1);
    return [Math.round(c * a[0] + (1 - c) * b[0]), Math.round(c * a[1] + (1 - c) * b[1]), Math.round(c * a[2] + (1 - c) * b[2])];
};
exports.blend = blend;
const darken = (a, b) => {
    return (0, exports.blend)([0, 0, 0], a, b);
};
exports.darken = darken;
const lighten = (a, b) => {
    return (0, exports.blend)([255, 255, 255], a, b);
};
exports.lighten = lighten;
const grayScale = (a) => {
    let b = Math.round((a[0] + a[1] + a[2]) / 3);
    return [b, b, b];
};
exports.grayScale = grayScale;
const colorScale = (a, b, c) => {
    let s = (0, exports.grayScale)(a)[0];
    b = b == undefined ? [255, 255, 255] : b;
    c = c == undefined ? [0, 0, 0] : c;
    let d = (s * 100) / 255;
    return (0, exports.blend)(b, c, d);
};
exports.colorScale = colorScale;
const watershed = (a) => {
    let b = (0, exports.grayScale)(a), c = b[0], e = 255 / 2;
    if (c >= e) {
        return [255, 255, 255];
    }
    else {
        return [0, 0, 0];
    }
};
exports.watershed = watershed;
const growing = (a) => {
    let b = (0, exports.grayScale)(a), c = b[0];
    return (0, exports.hslToRgb)(Math.round((c * 360) / 255), 100 / 100, 50 / 100);
};
exports.growing = growing;
const negative = (a) => {
    return [Math.round(255 - a[0]), Math.round(255 - a[1]), Math.round(255 - a[2])];
};
exports.negative = negative;
const hslDistance = (a, b) => {
    a = [a[0], a[1] / 100, a[2] / 100];
    b = [b[0], b[1] / 100, b[2] / 100];
    let c, d;
    c = 0.5 >= a[2] ? a[1] * a[2] : a[1] * (1 - a[2]);
    d = 0.5 >= b[2] ? b[1] * b[2] : b[1] * (1 - b[2]);
    return Math.round(((a[2] - b[2]) * (a[2] - b[2]) + c * c + d * d - 2 * c * d * Math.cos(2 * (a[0] / 360 - b[0] / 360) * Math.PI)) * 100);
};
exports.hslDistance = hslDistance;
const infoColor = (color) => {
    let result = { type: undefined, string: undefined, array: undefined }, b, c, d, e;
    if ((b = /^((?:rgb|hs[lv]|cmyk|hwb)a?)\s*\(([^\)]*)\)/.exec(String(color)))) {
        c = b[1];
        d = c.replace(/a$/, "");
        e = d === "cmyk" ? 4 : 3;
        b[2] = b[2]
            .replace(/^\s+|\s+$/g, "")
            .split(/\s*,\s*/)
            .map((x, i) => {
            if (/%$/.test(x) && i === e) {
                return parseFloat(x) / 100;
            }
            else if (/%$/.test(x)) {
                return parseFloat(x);
            }
            return parseFloat(x);
        });
        result.type = d;
        result.string = color;
        result.array = b[2];
    }
    else if (/^#[A-Fa-f0-9]+$/.test(color)) {
        result.type = "hex";
        result.string = color;
        result.array = (0, exports.hexToRgb)(color);
    }
    else if (Object.keys(exports.colorNames).includes(String(color).toLowerCase())) {
        result.type = "name";
        result.string = color;
        result.array = (0, exports.hexToRgb)(exports.colorNames[color]);
    }
    return result;
};
exports.infoColor = infoColor;
class Color {
    constructor(color = "#000000") {
        this.value = "#000000";
        this.value = Array.isArray(color) ? exports.rgbToHex.apply(null, color) : color;
        this.info = (0, exports.infoColor)(this.value);
        this.type = this.info.type;
        const defaultProps = {
            rgb: [0, 0, 0],
            string: "#000000",
            hex: "#000000",
            hsl: [0, 0, 0],
            hsv: [0, 0, 0],
            cmyk: [0, 0, 0, 0],
            hwb: [0, 0, 0],
        };
        if (Array.isArray(this.info.array)) {
            switch (this.type) {
                case "name":
                    this.props = Color.colorName(this.value);
                    break;
                case "hex":
                    this.props = Color.hex(this.value);
                    break;
                case "rgb":
                    this.props = Color.rgb.apply(null, this.info.array);
                    break;
                case "hsl":
                    this.props = Color.hsl.apply(null, this.info.array);
                    break;
                case "cmyk":
                    this.props = Color.cmyk.apply(null, this.info.array);
                    break;
                case "hwb":
                    this.props = Color.hwb.apply(null, this.info.array);
                    break;
                case "hsv":
                    this.props = Color.hsv.apply(null, this.info.array);
                    break;
                default:
                    this.props = defaultProps;
            }
        }
        else {
            this.props = defaultProps;
        }
    }
    get isValidColor() {
        return Color.isColor(this.value);
    }
    get hex() {
        return this.props.hex;
    }
    get rgb() {
        return "rgb(" + this.props.rgb.join(", ") + ")";
    }
    get hsl() {
        return "hsl(" + this.props.hsl.map((v, i) => v + (i > 0 ? "%" : "")).join(", ") + ")";
    }
    get hsv() {
        return "hsv(" + this.props.hsv.map((v, i) => v + (i > 0 ? "%" : "")).join(", ") + ")";
    }
    get cmyk() {
        return "cmyk(" + this.props.cmyk.join("%, ") + ")";
    }
    get hwb() {
        return "hwb(" + this.props.hsv.map((v, i) => v + (i > 0 ? "%" : "")).join(", ") + ")";
    }
    get string() {
        return this.props.string;
    }
    get vector() {
        return (0, exports.infoColor)(this.rgb).array;
    }
    distance(a) {
        return (0, exports.hslDistance)(this.props.hsl, new Color(a).props.hsl);
    }
    blend(a, b) {
        const c = (0, exports.blend)(this.props.rgb, new Color(a).props.rgb, b);
        return new Color("rgb(" + c.join(", ") + ")");
    }
    static blend(a, b, c) {
        return new Color(a).blend(b, c);
    }
    darken(a) {
        let b = (0, exports.darken)(this.props.rgb, a);
        return new Color("rgb(" + b.join(", ") + ")");
    }
    lighten(a) {
        let b = (0, exports.lighten)(this.props.rgb, a);
        return new Color("rgb(" + b.join(", ") + ")");
    }
    grayScale() {
        let b = (0, exports.grayScale)(this.props.rgb);
        return new Color("rgb(" + b.join(", ") + ")");
    }
    colorScale(a, b) {
        const c = (0, exports.colorScale)(this.props.rgb, new Color(a == undefined ? "#ffffff" : a).props.rgb, new Color(b == undefined ? "#000000" : b).props.rgb);
        return new Color("rgb(" + c.join(", ") + ")");
    }
    watershed() {
        let b = (0, exports.watershed)(this.props.rgb);
        return new Color("rgb(" + b.join(", ") + ")");
    }
    growing() {
        let b = (0, exports.growing)(this.props.rgb);
        return new Color("rgb(" + b.join(", ") + ")");
    }
    negative() {
        let b = (0, exports.negative)(this.props.rgb);
        return new Color("rgb(" + b.join(", ") + ")");
    }
    static isColor(color) {
        var _a;
        try {
            let b = (0, exports.infoColor)(color);
            if (["hex", "name", "rgb", "hsl", "hsv", "cmyk", "hwb", "rgba", "hsla", "hsva", "cmyka", "hwba"].includes((_a = b.type) !== null && _a !== void 0 ? _a : "")) {
                return true;
            }
        }
        catch (e) {
            return false;
        }
        return false;
    }
    static colorName(color) {
        const hex = exports.colorNames[color];
        let result = Color.hex(hex);
        result.string = String(color).toLowerCase();
        return result;
    }
    static hex(hex) {
        hex = String(hex);
        hex = "#" == hex.charAt(0) ? hex : "#" + hex;
        let hexTripletRe_ = /#(.)(.)(.)/, validHexColorRe_ = /^#(?:[0-9a-f]{3}){1,2}$/i, isValid = function (a) {
            return validHexColorRe_.test(a);
        }, normalizeHex = (a) => {
            if (!isValid(a))
                a = "#000000";
            4 == a.length && (a = a.replace(hexTripletRe_, "#$1$1$2$2$3$3"));
            return a.toLowerCase();
        };
        hex = normalizeHex(hex);
        let result = Color.rgb.apply(null, (0, exports.hexToRgb)(hex));
        result.string = hex;
        result.hex = hex;
        return result;
    }
    static rgb(a, b, c) {
        a = Math.round(Number(a));
        b = Math.round(Number(b));
        c = Math.round(Number(c));
        const rgb = [a, b, c];
        return {
            rgb,
            string: "rgb(" + rgb.join(", ") + ")",
            hex: (0, exports.rgbToHex)(a, b, c),
            hsl: (0, exports.rgbToHsl)(a, b, c),
            hsv: (0, exports.rgbToHsv)(a, b, c),
            cmyk: (0, exports.rgbToCmyk)(a, b, c),
            hwb: (0, exports.rgbToHwb)(a, b, c),
        };
    }
    static hsl(a, b, c) {
        a = Math.round(Number(a));
        b = Number(b) / 100;
        c = Number(c) / 100;
        const rgb = (0, exports.hslToRgb)(a, b, c);
        let result = Color.rgb.apply(null, rgb);
        result.hsl = [Math.round(a), Math.round(b * 100), Math.round(c * 100)];
        result.string = "hsl(" + result.hsl.map((v, i) => v + (i > 0 ? "%" : "")).join(", ") + ")";
        return result;
    }
    static hsv(a, b, c) {
        a = Math.round(Number(a));
        b = Number(b) / 100;
        c = Number(c) / 100;
        const rgb = (0, exports.hsvToRgb)(a, b, c);
        let result = Color.rgb.apply(null, rgb);
        result.hsv = [Math.round(a), Math.round(b * 100), Math.round(c * 100)];
        result.string = "hsv(" + result.hsv.map((v, i) => v + (i > 0 ? "%" : "")).join(", ") + ")";
        return result;
    }
    static cmyk(a, b, c, d) {
        a = Number(a) / 100;
        b = Number(b) / 100;
        c = Number(c) / 100;
        d = Number(d) / 100;
        const rgb = (0, exports.cmykToRgb)(a, b, c, d);
        let result = Color.rgb.apply(null, rgb);
        result.cmyk = [Math.round(a * 100), Math.round(b * 100), Math.round(c * 100), Math.round(d * 100)];
        result.string = "cmyk(" + result.cmyk.join("%, ") + "%)";
        return result;
    }
    static hwb(a, b, c) {
        a = Number(a) / 360;
        b = Number(b) / 100;
        c = Number(c) / 100;
        const rgb = (0, exports.hwbToRgb)(a, b, c);
        let result = Color.rgb.apply(null, rgb);
        result.hwb = [Math.round(a * 360), Math.round(b * 100), Math.round(c * 100)];
        result.string = "hwb(" + result.hwb.map((v, i) => v + (i > 0 ? "%" : "")).join(", ") + ")";
        return result;
    }
}
exports.default = Color;

},{}],22:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validation_1 = require("./validation");
const JSONStringify = (obj) => {
    const restOfDataTypes = (value) => {
        return (0, validation_1.isNumber)(value) || (0, validation_1.isString)(value) || (0, validation_1.isBoolean)(value);
    };
    const ignoreDataTypes = (value) => {
        return (0, validation_1.isUndefined)(value) || (0, validation_1.isFunction)(value) || (0, validation_1.isSymbol)(value);
    };
    const nullDataTypes = (value) => {
        return (0, validation_1.isNotNumber)(value) || (0, validation_1.isInfinity)(value) || (0, validation_1.isNull)(value);
    };
    const arrayValuesNullTypes = (value) => {
        return (0, validation_1.isNotNumber)(value) || (0, validation_1.isInfinity)(value) || (0, validation_1.isNull)(value) || ignoreDataTypes(value);
    };
    const removeComma = (str) => {
        const tempArr = str.split("");
        tempArr.pop();
        return tempArr.join("");
    };
    if (ignoreDataTypes(obj)) {
        return "{}";
    }
    if ((0, validation_1.isDate)(obj)) {
        return `"${new Date(obj).toISOString()}"`;
    }
    if (nullDataTypes(obj)) {
        return `${null}`;
    }
    if ((0, validation_1.isSymbol)(obj)) {
        return "{}";
    }
    if (restOfDataTypes(obj)) {
        return JSON.stringify(obj);
    }
    if ((0, validation_1.isArray)(obj)) {
        let arrStr = "";
        obj.forEach((eachValue) => {
            arrStr += arrayValuesNullTypes(eachValue) ? JSONStringify(null) : JSONStringify(eachValue);
            arrStr += ",";
        });
        return `[` + removeComma(arrStr) + `]`;
    }
    if ((0, validation_1.isObject)(obj)) {
        let objStr = "";
        const objKeys = Object.keys(obj);
        objKeys.forEach((eachKey) => {
            const eachValue = obj[eachKey];
            objStr += !ignoreDataTypes(eachValue) ? `"${eachKey}":${JSONStringify(eachValue)},` : "";
        });
        return `{` + removeComma(objStr) + `}`;
    }
    return "{}";
};
exports.default = JSONStringify;

},{"./validation":30}],23:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function runCallback(callback, data) {
    try {
        callback(data);
    }
    catch (err) {
        console.error("Error in subscription callback", err);
    }
}
const _subscriptions = Symbol("subscriptions");
const _oneTimeEvents = Symbol("oneTimeEvents");
class SimpleEventEmitter {
    constructor() {
        this[_subscriptions] = [];
        this[_oneTimeEvents] = new Map();
    }
    on(event, callback) {
        if (this[_oneTimeEvents].has(event)) {
            runCallback(callback, this[_oneTimeEvents].get(event));
        }
        else {
            this[_subscriptions].push({ event, callback, once: false });
        }
        const self = this;
        return {
            stop() {
                self.off(event, callback);
            },
        };
    }
    off(event, callback) {
        this[_subscriptions] = this[_subscriptions].filter((s) => s.event !== event || (callback && s.callback !== callback));
        return this;
    }
    once(event, callback) {
        return new Promise((resolve) => {
            const ourCallback = (data) => {
                resolve(data);
                callback === null || callback === void 0 ? void 0 : callback(data);
            };
            if (this[_oneTimeEvents].has(event)) {
                runCallback(ourCallback, this[_oneTimeEvents].get(event));
            }
            else {
                this[_subscriptions].push({
                    event,
                    callback: ourCallback,
                    once: true,
                });
            }
        });
    }
    emit(event, data) {
        if (this[_oneTimeEvents].has(event)) {
            throw new Error(`Event "${event}" was supposed to be emitted only once`);
        }
        for (let i = 0; i < this[_subscriptions].length; i++) {
            const s = this[_subscriptions][i];
            if (s.event !== event) {
                continue;
            }
            runCallback(s.callback, data);
            if (s.once) {
                this[_subscriptions].splice(i, 1);
                i--;
            }
        }
        return this;
    }
    emitOnce(event, data) {
        if (this[_oneTimeEvents].has(event)) {
            throw new Error(`Event "${event}" was supposed to be emitted only once`);
        }
        this.emit(event, data);
        this[_oneTimeEvents].set(event, data); // Mark event as being emitted once for future subscribers
        this.off(event); // Remove all listeners for this event, they won't fire again
        return this;
    }
    pipe(event, eventEmitter) {
        return this.on(event, (data) => {
            eventEmitter.emit(event, data);
        });
    }
    pipeOnce(event, eventEmitter) {
        return this.once(event, (data) => {
            eventEmitter.emitOnce(event, data);
        });
    }
}
exports.default = SimpleEventEmitter;

},{}],24:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mat4 = void 0;
exports.mat4 = __importStar(require("./mat4"));

},{"./mat4":25}],25:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transpose = exports.translate = exports.str = exports.scale = exports.rotateZ = exports.rotateY = exports.rotateX = exports.rotate = exports.perspectiveFromFieldOfView = exports.perspective = exports.ortho = exports.multiply = exports.lookAt = exports.invert = exports.identity = exports.frustum = exports.fromZRotation = exports.fromYRotation = exports.fromXRotation = exports.fromTranslation = exports.fromScaling = exports.fromRotationTranslation = exports.fromRotation = exports.fromQuat = exports.determinant = exports.create = exports.copy = exports.clone = exports.adjoint = void 0;
/**
 * Calculates the adjugate of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
const adjoint = (out, a) => {
    let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    out[0] = a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22);
    out[1] = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
    out[2] = a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12);
    out[3] = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
    out[4] = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
    out[5] = a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22);
    out[6] = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
    out[7] = a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12);
    out[8] = a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21);
    out[9] = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
    out[10] = a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11);
    out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
    out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
    out[13] = a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21);
    out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
    out[15] = a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11);
    return out;
};
exports.adjoint = adjoint;
/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {mat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */
const clone = (a) => {
    let out = new Float32Array(16);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};
exports.clone = clone;
/**
 * Copy the values from one mat4 to another
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
const copy = (out, a) => {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};
exports.copy = copy;
/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */
const create = () => {
    let out = new Float32Array(16);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
exports.create = create;
/**
 * Calculates the determinant of a mat4
 *
 * @param {mat4} a the source matrix
 * @returns {Number} determinant of a
 */
const determinant = (a) => {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15], b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    // Calculate the determinant
    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
};
exports.determinant = determinant;
/**
 * Creates a matrix from a quaternion rotation.
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @returns {mat4} out
 */
const fromQuat = (out, q) => {
    const x = q[0], y = q[1], z = q[2], w = q[3], x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, yx = y * x2, yy = y * y2, zx = z * x2, zy = z * y2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
    out[0] = 1 - yy - zz;
    out[1] = yx + wz;
    out[2] = zx - wy;
    out[3] = 0;
    out[4] = yx - wz;
    out[5] = 1 - xx - zz;
    out[6] = zy + wx;
    out[7] = 0;
    out[8] = zx + wy;
    out[9] = zy - wx;
    out[10] = 1 - xx - yy;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
exports.fromQuat = fromQuat;
/**
 * Creates a matrix from a given angle around a given axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.rotate(dest, dest, rad, axis)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @param {vec3} axis the axis to rotate around
 * @returns {mat4} out
 */
const fromRotation = (out, rad, axis) => {
    let s, c, t;
    let x = axis[0];
    let y = axis[1];
    let z = axis[2];
    let len = Math.sqrt(x * x + y * y + z * z);
    if (Math.abs(len) < 0.000001) {
        return null;
    }
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;
    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;
    // Perform rotation-specific matrix multiplication
    out[0] = x * x * t + c;
    out[1] = y * x * t + z * s;
    out[2] = z * x * t - y * s;
    out[3] = 0;
    out[4] = x * y * t - z * s;
    out[5] = y * y * t + c;
    out[6] = z * y * t + x * s;
    out[7] = 0;
    out[8] = x * z * t + y * s;
    out[9] = y * z * t - x * s;
    out[10] = z * z * t + c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
exports.fromRotation = fromRotation;
/**
 * Creates a matrix from a quaternion rotation and vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     let quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {vec3} v Translation vector
 * @returns {mat4} out
 */
const fromRotationTranslation = (out, q, v) => {
    // Quaternion math
    let x = q[0], y = q[1], z = q[2], w = q[3], x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
};
exports.fromRotationTranslation = fromRotationTranslation;
/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.scale(dest, dest, vec)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {vec3} v Scaling vector
 * @returns {mat4} out
 */
const fromScaling = (out, v) => {
    out[0] = v[0];
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = v[1];
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = v[2];
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
exports.fromScaling = fromScaling;
/**
 * Creates a matrix from a vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.translate(dest, dest, vec)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {vec3} v Translation vector
 * @returns {mat4} out
 */
const fromTranslation = (out, v) => {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
};
exports.fromTranslation = fromTranslation;
/**
 * Creates a matrix from the given angle around the X axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.rotateX(dest, dest, rad)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
const fromXRotation = (out, rad) => {
    const s = Math.sin(rad), c = Math.cos(rad);
    // Perform axis-specific matrix multiplication
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = c;
    out[6] = s;
    out[7] = 0;
    out[8] = 0;
    out[9] = -s;
    out[10] = c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
exports.fromXRotation = fromXRotation;
/**
 * Creates a matrix from the given angle around the Y axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.rotateY(dest, dest, rad)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
const fromYRotation = (out, rad) => {
    const s = Math.sin(rad), c = Math.cos(rad);
    // Perform axis-specific matrix multiplication
    out[0] = c;
    out[1] = 0;
    out[2] = -s;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = s;
    out[9] = 0;
    out[10] = c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
exports.fromYRotation = fromYRotation;
/**
 * Creates a matrix from the given angle around the Z axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest)
 *     mat4.rotateZ(dest, dest, rad)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
const fromZRotation = (out, rad) => {
    let s = Math.sin(rad), c = Math.cos(rad);
    // Perform axis-specific matrix multiplication
    out[0] = c;
    out[1] = s;
    out[2] = 0;
    out[3] = 0;
    out[4] = -s;
    out[5] = c;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
exports.fromZRotation = fromZRotation;
/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Number} left Left bound of the frustum
 * @param {Number} right Right bound of the frustum
 * @param {Number} bottom Bottom bound of the frustum
 * @param {Number} top Top bound of the frustum
 * @param {Number} near Near bound of the frustum
 * @param {Number} far Far bound of the frustum
 * @returns {mat4} out
 */
const frustum = (out, left, right, bottom, top, near, far) => {
    let rl = 1 / (right - left), tb = 1 / (top - bottom), nf = 1 / (near - far);
    out[0] = near * 2 * rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = near * 2 * tb;
    out[6] = 0;
    out[7] = 0;
    out[8] = (right + left) * rl;
    out[9] = (top + bottom) * tb;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = far * near * 2 * nf;
    out[15] = 0;
    return out;
};
exports.frustum = frustum;
/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */
const identity = (out) => {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
exports.identity = identity;
/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
const invert = (out, a) => {
    let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15], b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32, 
    // Calculate the determinant
    det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) {
        return null;
    }
    det = 1.0 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
};
exports.invert = invert;
/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {vec3} eye Position of the viewer
 * @param {vec3} center Point the viewer is looking at
 * @param {vec3} up vec3 pointing up
 * @returns {mat4} out
 */
const lookAt = (out, eye, center, up) => {
    let x0, x1, x2, y0, y1, y2, z0, z1, z2, len, eyex = eye[0], eyey = eye[1], eyez = eye[2], upx = up[0], upy = up[1], upz = up[2], centerx = center[0], centery = center[1], centerz = center[2];
    if (Math.abs(eyex - centerx) < 0.000001 && Math.abs(eyey - centery) < 0.000001 && Math.abs(eyez - centerz) < 0.000001) {
        return (0, exports.identity)(out);
    }
    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;
    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;
    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
        x0 = 0;
        x1 = 0;
        x2 = 0;
    }
    else {
        len = 1 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
    }
    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;
    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
        y0 = 0;
        y1 = 0;
        y2 = 0;
    }
    else {
        len = 1 / len;
        y0 *= len;
        y1 *= len;
        y2 *= len;
    }
    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;
    return out;
};
exports.lookAt = lookAt;
/**
 * Multiplies two mat4's
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @returns {mat4} out
 */
const multiply = (out, a, b) => {
    let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    // Cache only the current line of the second matrix
    let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[4];
    b1 = b[5];
    b2 = b[6];
    b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[8];
    b1 = b[9];
    b2 = b[10];
    b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[12];
    b1 = b[13];
    b2 = b[14];
    b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return out;
};
exports.multiply = multiply;
/**
 * Generates a orthogonal projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
const ortho = (out, left, right, bottom, top, near, far) => {
    let lr = 1 / (left - right), bt = 1 / (bottom - top), nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
};
exports.ortho = ortho;
/**
 * Generates a perspective projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
const perspective = (out, fovy, aspect, near, far) => {
    let f = 1.0 / Math.tan(fovy / 2), nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = 2 * far * near * nf;
    out[15] = 0;
    return out;
};
exports.perspective = perspective;
/**
 * Generates a perspective projection matrix with the given field of view.
 * This is primarily useful for generating projection matrices to be used
 * with the still experiemental WebVR API.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {object} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
const perspectiveFromFieldOfView = (out, fov, near, far) => {
    let upTan = Math.tan((fov.upDegrees * Math.PI) / 180.0), downTan = Math.tan((fov.downDegrees * Math.PI) / 180.0), leftTan = Math.tan((fov.leftDegrees * Math.PI) / 180.0), rightTan = Math.tan((fov.rightDegrees * Math.PI) / 180.0), xScale = 2.0 / (leftTan + rightTan), yScale = 2.0 / (upTan + downTan);
    out[0] = xScale;
    out[1] = 0.0;
    out[2] = 0.0;
    out[3] = 0.0;
    out[4] = 0.0;
    out[5] = yScale;
    out[6] = 0.0;
    out[7] = 0.0;
    out[8] = -((leftTan - rightTan) * xScale * 0.5);
    out[9] = (upTan - downTan) * yScale * 0.5;
    out[10] = far / (near - far);
    out[11] = -1.0;
    out[12] = 0.0;
    out[13] = 0.0;
    out[14] = (far * near) / (near - far);
    out[15] = 0.0;
    return out;
};
exports.perspectiveFromFieldOfView = perspectiveFromFieldOfView;
/**
 * Rotates a mat4 by the given angle
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {vec3} axis the axis to rotate around
 * @returns {mat4} out
 */
const rotate = (out, a, rad, axis) => {
    let x = axis[0], y = axis[1], z = axis[2], len = Math.sqrt(x * x + y * y + z * z), s, c, t, a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, b00, b01, b02, b10, b11, b12, b20, b21, b22;
    if (Math.abs(len) < 0.000001) {
        return null;
    }
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;
    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    // Construct the elements of the rotation matrix
    b00 = x * x * t + c;
    b01 = y * x * t + z * s;
    b02 = z * x * t - y * s;
    b10 = x * y * t - z * s;
    b11 = y * y * t + c;
    b12 = z * y * t + x * s;
    b20 = x * z * t + y * s;
    b21 = y * z * t - x * s;
    b22 = z * z * t + c;
    // Perform rotation-specific matrix multiplication
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;
    if (a !== out) {
        // If the source and destination differ, copy the unchanged last row
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }
    return out;
};
exports.rotate = rotate;
/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
const rotateX = (out, a, rad) => {
    let s = Math.sin(rad), c = Math.cos(rad), a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    if (a !== out) {
        // If the source and destination differ, copy the unchanged rows
        out[0] = a[0];
        out[1] = a[1];
        out[2] = a[2];
        out[3] = a[3];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }
    // Perform axis-specific matrix multiplication
    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    return out;
};
exports.rotateX = rotateX;
/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
const rotateY = (out, a, rad) => {
    let s = Math.sin(rad), c = Math.cos(rad), a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    if (a !== out) {
        // If the source and destination differ, copy the unchanged rows
        out[4] = a[4];
        out[5] = a[5];
        out[6] = a[6];
        out[7] = a[7];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }
    // Perform axis-specific matrix multiplication
    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    return out;
};
exports.rotateY = rotateY;
/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
const rotateZ = (out, a, rad) => {
    let s = Math.sin(rad), c = Math.cos(rad), a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    if (a !== out) {
        // If the source and destination differ, copy the unchanged last row
        out[8] = a[8];
        out[9] = a[9];
        out[10] = a[10];
        out[11] = a[11];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }
    // Perform axis-specific matrix multiplication
    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    return out;
};
exports.rotateZ = rotateZ;
/**
 * Scales the mat4 by the dimensions in the given vec3
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to scale
 * @param {vec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/
const scale = (out, a, v) => {
    let x = v[0], y = v[1], z = v[2];
    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};
exports.scale = scale;
/**
 * Returns a string representation of a mat4
 *
 * @param {mat4} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
const str = (a) => {
    return ("mat4(" +
        a[0] +
        ", " +
        a[1] +
        ", " +
        a[2] +
        ", " +
        a[3] +
        ", " +
        a[4] +
        ", " +
        a[5] +
        ", " +
        a[6] +
        ", " +
        a[7] +
        ", " +
        a[8] +
        ", " +
        a[9] +
        ", " +
        a[10] +
        ", " +
        a[11] +
        ", " +
        a[12] +
        ", " +
        a[13] +
        ", " +
        a[14] +
        ", " +
        a[15] +
        ")");
};
exports.str = str;
/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to translate
 * @param {vec3} v vector to translate by
 * @returns {mat4} out
 */
const translate = (out, a, v) => {
    let x = v[0], y = v[1], z = v[2], a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23;
    if (a === out) {
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    }
    else {
        a00 = a[0];
        a01 = a[1];
        a02 = a[2];
        a03 = a[3];
        a10 = a[4];
        a11 = a[5];
        a12 = a[6];
        a13 = a[7];
        a20 = a[8];
        a21 = a[9];
        a22 = a[10];
        a23 = a[11];
        out[0] = a00;
        out[1] = a01;
        out[2] = a02;
        out[3] = a03;
        out[4] = a10;
        out[5] = a11;
        out[6] = a12;
        out[7] = a13;
        out[8] = a20;
        out[9] = a21;
        out[10] = a22;
        out[11] = a23;
        out[12] = a00 * x + a10 * y + a20 * z + a[12];
        out[13] = a01 * x + a11 * y + a21 * z + a[13];
        out[14] = a02 * x + a12 * y + a22 * z + a[14];
        out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }
    return out;
};
exports.translate = translate;
/**
 * Transpose the values of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
const transpose = (out, a) => {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        let a01 = a[1], a02 = a[2], a03 = a[3], a12 = a[6], a13 = a[7], a23 = a[11];
        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a01;
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a02;
        out[9] = a12;
        out[11] = a[14];
        out[12] = a03;
        out[13] = a13;
        out[14] = a23;
    }
    else {
        out[0] = a[0];
        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a[1];
        out[5] = a[5];
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a[2];
        out[9] = a[6];
        out[10] = a[10];
        out[11] = a[14];
        out[12] = a[3];
        out[13] = a[7];
        out[14] = a[11];
        out[15] = a[15];
    }
    return out;
};
exports.transpose = transpose;

},{}],26:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleEventEmitter = exports.Ascii85 = exports.ColorUtils = exports.Color = exports.BezierEasing = exports.Base64 = exports.gl = exports.mergeClasses = exports.JSONStringify = void 0;
var JSONStringify_1 = require("./JSONStringify");
Object.defineProperty(exports, "JSONStringify", { enumerable: true, get: function () { return __importDefault(JSONStringify_1).default; } });
var mergeClasses_1 = require("./mergeClasses");
Object.defineProperty(exports, "mergeClasses", { enumerable: true, get: function () { return __importDefault(mergeClasses_1).default; } });
__exportStar(require("./mimeTypeFromBuffer"), exports);
__exportStar(require("./utils"), exports);
__exportStar(require("./validation"), exports);
exports.gl = __importStar(require("./gl"));
var Base64_1 = require("./Base64");
Object.defineProperty(exports, "Base64", { enumerable: true, get: function () { return __importDefault(Base64_1).default; } });
var BezierEasing_1 = require("./BezierEasing");
Object.defineProperty(exports, "BezierEasing", { enumerable: true, get: function () { return __importDefault(BezierEasing_1).default; } });
var Color_1 = require("./Color");
Object.defineProperty(exports, "Color", { enumerable: true, get: function () { return __importDefault(Color_1).default; } });
exports.ColorUtils = __importStar(require("./Color"));
var Ascii85_1 = require("./Ascii85");
Object.defineProperty(exports, "Ascii85", { enumerable: true, get: function () { return __importDefault(Ascii85_1).default; } });
var SimpleEventEmitter_1 = require("./SimpleEventEmitter");
Object.defineProperty(exports, "SimpleEventEmitter", { enumerable: true, get: function () { return __importDefault(SimpleEventEmitter_1).default; } });

},{"./Ascii85":18,"./Base64":19,"./BezierEasing":20,"./Color":21,"./JSONStringify":22,"./SimpleEventEmitter":23,"./gl":24,"./mergeClasses":27,"./mimeTypeFromBuffer":28,"./utils":29,"./validation":30}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const findProtoNames = (i) => {
    let names = [];
    let c = i.constructor;
    do {
        const n = Object.getOwnPropertyNames(c.prototype);
        names = names.concat(n.filter((s) => s !== "constructor"));
        c = Object.getPrototypeOf(c);
    } while (c.prototype);
    return names;
};
const wrapProto = (i) => {
    const names = findProtoNames(i);
    const o = {};
    for (const name of names) {
        if (typeof i[name] !== "function") {
            continue;
        }
        o[name] = function (...args) {
            return i[name].apply(i, args);
        };
    }
    return o;
};
const assignProperties = (a, b) => {
    for (const propName of Object.keys(b)) {
        if (a.hasOwnProperty(propName)) {
            continue;
        }
        Object.defineProperty(a, propName, {
            get: function () {
                return b[propName];
            },
            set: function (value) {
                b[propName] = value;
            },
        });
    }
    return a;
};
const mergeClasses = (a, b) => {
    if (b.constructor.name === "Object") {
        return Object.assign(a, b);
    }
    else {
        const wrapper = wrapProto(b);
        a = assignProperties(a, b);
        return assignProperties(a, wrapper);
    }
};
exports.default = mergeClasses;

},{}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mimeTypeFromBuffer = void 0;
const mimeTypes = {
    "ffd8ffe000104a464946": "image/jpeg",
    "89504e470d0a1a0a0000": "image/png",
    "47494638396126026f01": "image/gif",
    "52494646574f455053": "image/webp",
    "464c4946": "image/flif",
    "424d": "image/bmp",
    "49492a00": "image/tiff",
    "4d4d002a": "image/tiff",
    "49492a00100000004352": "image/tiff",
    "4d4d002a000000005200": "image/tiff",
    "654c696673": "image/x-xcf",
    "4954534608000000600000": "image/x-canon-cr2",
    "495453461a00000003000000": "image/x-canon-cr3",
    "414f4c4949": "image/vnd.ms-photo",
    "38425053": "image/vnd.adobe.photoshop",
    "3c3f78646f636d656e74": "application/x-indesign",
    "504b0304": "application/epub+zip",
    //   '504b0304': 'application/x-xpinstall',  // XPI (Firefox Add-on)
    //   '504b0304': 'application/zip',       // ZIP
    "526172211a0700cf9073": "application/x-rar-compressed",
    "504b0708": "application/x-rar-compressed",
    "504b0304140006000800": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "d0cf11e0a1b11ae10000": "application/msword",
    "25504446": "application/pdf",
    "1f8b08": "application/gzip",
    "1f9d90": "application/x-tar",
    "425a68": "application/x-bzip2",
    "377abcaf271c": "application/x-7z-compressed",
    "425a68393141524320202020202000": "application/x-7z-compressed",
    "4d534346": "application/x-apple-diskimage",
    "61726301": "application/x-apache-arrow",
    "66747970": "video/mp4",
    "4d546864": "audio/midi",
    "1a45dfa3": "video/x-matroska",
    "1a45dfa3010000000000": "video/x-matroska",
    //   '1a45dfa3010000000000': 'video/webm', // WebM
    "00000014667479706d703432": "video/webm",
    "77415645": "video/quicktime",
    //   '52494646': 'video/vnd.avi',         // AVI
    //   '52494646': 'video/x-msvideo',       // AVI
    //   '52494646': 'video/x-msvideo',       // AVI
    //   '52494646': 'video/msvideo',         // AVI
    //   '52494646': 'video/x-avi',           // AVI
    "52494646": "video/mp4",
    "524946464f4500013000": "video/mpeg",
    //   '52494646': 'video/3gpp',            // 3GP
    "fffb": "audio/mpeg",
    "fff3": "audio/mp3",
    "666675": "audio/opus",
    "4f676753": "video/ogg",
    //   '4f676753': 'audio/ogg',             // OGG (Ogg Audio)
    //   '4f676753': 'application/ogg',       // OGG (Ogg Container)
    "664c6143": "audio/x-flac",
    "41564520": "audio/ape",
    "7776706b": "audio/wavpack",
    "464f524d00": "audio/amr",
    "7f454c46": "application/x-elf",
    //   '4d5a': 'application/x-msdownload',  // EXE (Windows Executable)
    "436f6e74656e742d74797065": "application/x-shockwave-flash",
    "7b5c727466": "application/rtf",
    "0061736d": "application/wasm",
    "774f4646": "audio/x-wav",
    "d46d9d6c": "audio/x-musepack",
    "0d0a0d0a": "text/calendar",
    "42494638": "video/x-flv",
    //   '252150532d41646f6265': 'application/postscript', // PostScript
    "252150532d41646f6265": "application/eps",
    "fd377a585a00": "application/x-xz",
    "53514c69746520666f726d6174203300": "application/x-sqlite3",
    "4e45531a": "application/x-nintendo-nes-rom",
    //   '504b0304140006000800': 'application/x-google-chrome-extension', // CRX (Chrome Extension)
    //   '4d534346': 'application/vnd.ms-cab-compressed', // CAB (Microsoft Cabinet File)
    "21": "text/plain",
    "314159265359": "text/plain",
    "7801730d626260": "text/plain",
    "7865726d": "text/plain",
    "63757368000000020000": "text/plain",
    "49545346": "application/x-deb",
    //   '1f8b08': 'application/x-compress',  // COMPRESS (Compress)
    "504b030414": "application/x-compress",
    //   '504b0708': 'application/x-lzip',    // LZ (Lzip)
    //   '504b0304': 'application/x-cfb',     // CFB (Compound File Binary)
    //   '504b0304': 'application/x-mie',     // MIE (MIE)
    //   '1a45dfa3': 'application/mxf',       // MXF (Material Exchange Format)
    "0000001a667479703367706832": "video/mp2t",
    "424c5030": "application/x-blender",
    "4250473031": "image/bpg",
    "4a2d2d20": "image/j2c",
    "0000000cjp2": "image/jp2",
    "0d0a870a": "image/jpx",
    "6a5020200d0a870a": "image/jpx",
    "000000186a703268": "image/jpx",
    "6d6a703268": "image/jpm",
    "4d4a32": "image/mj2",
    //   '464f524d00': 'audio/aiff',          // AIFF (Audio Interchange File Format)
    "464f524d20": "audio/aiff",
    "3c3f786d6c": "application/xml",
    //   '3c3f786d6c': 'text/xml',            // XML (alternative)
    "7573746172": "application/tar+gzip",
    "465753": "application/x-mobipocket-ebook",
    "667479706d6f6f6d": "application/vnd.tcpdump.pcap",
    "444d5321": "audio/x-dsf",
    "4c495445": "application/x.ms.shortcut",
    "53746f7261676554696d6573": "application/x.apple.alias",
    "46575320": "application/x-mobipocket-ebook",
    "6f6c796d7075733f6772652d": "audio/opus",
    //   '47494638': 'image/apng',            // APNG
    "4f52494643": "image/x-olympus-orf",
    "49534328": "image/x-sony-arw",
    "49534344": "image/x-adobe-dng",
    "49545046": "image/x-panasonic-rw2",
    "465547464946": "image/x-fujifilm-raf",
    //   '1a45dfa3010000000000': 'video/x-m4v', // M4V
    "667479702": "video/3gpp2",
    //   '504b030414': 'application/x-esri-shape', // SHP (Esri Shapefile)
    "fff30000": "audio/aac",
    "466f726d6174203300": "audio/x-it",
    //   '4d546864': 'audio/x-m4a',           // M4A
    //   '504b0304140006000800': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX (PowerPoint)
    "44534420": "application/x-esri-shape",
    "494433": "audio/aac",
    //   '504b0304140006000800': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX (Excel)
    //   '504b0304140006000800': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX (Word)
    "5a4f4f20": "application/x-xz",
    "fdfd580000": "application/x-sqlite3",
    "50616e20636f6f6b696e": "image/x-icon",
    "47494638": "image/gif",
    "4649463837610111": "image/vnd.adobe.photoshop",
    "0000010000": "application/x-elf",
    "4d5a": "application/x-msdownload",
    //   '464f524d00': 'audio/x-dsf',         // DSD (Direct Stream Digital)
    //   '4c495445': 'application/x.ms.shortcut', // LNK (Windows Shortcut)
    "437265617469766520436f6d6d656e74": "application/vnd.ms-htmlhelp",
    //   '4d534346': 'application/vnd.ms-cab-compressed', // CAB (Microsoft Cabinet File)
    "415647": "model/stl",
    "6d737132": "model/3mf",
    "000001c0": "image/jxl",
    "b501": "application/zstd",
    "4a4c53": "image/jls",
    //   'd0cf11e0a1b11ae10000': 'application/x-ole-storage', // OLE (Object Linking and Embedding)
    "e3828596": "audio/x-rmf",
    "2345584548494c5": "application/vnd.ms-outlook",
    "0c6d6b6e6f74656e73": "audio/x-mid",
    //   '4d534346': 'application/java-vm',   // JAR (Java Archive)
    "1a0b617272616e673135": "application/x-arj",
    //   '1f9d90': 'application/x-iso9660-image', // ISO (International Organization for Standardization)
    "6173642020202020202020202020202020202020202020202020202020202020202020202020202020202020202020202020": "application/x-squashfs",
    "3026b2758e66cf11a6d900aa0062ce6c": "application/x-msdownload",
    "536c595845": "application/vnd.iccprofile", // ICC (International Color Consortium)
};
const mimeTypeFromBuffer = (buffer) => {
    const header = buffer.toString("hex", 0, 16);
    for (const magicNumber in mimeTypes) {
        if (header.startsWith(magicNumber)) {
            return mimeTypes[magicNumber];
        }
    }
    return "application/octet-stream";
};
exports.mimeTypeFromBuffer = mimeTypeFromBuffer;

},{}],29:[function(require,module,exports){
(function (process,global,Buffer){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.objectToUrlParams = exports.getAllUrlParams = exports.bytesToNumber = exports.numberToBytes = exports.decodeString = exports.encodeString = exports.defer = exports.getGlobalObject = exports.deepEqual = exports.safeGet = exports.contains = exports.uuidv4 = exports.asyncForEach = void 0;
const validation_1 = require("./validation");
const asyncForEach = (array, callback) => {
    return new Promise(async (resolve, reject) => {
        try {
            for (let i = 0; i < array.length; i++) {
                await callback(array[i], i, array);
            }
            resolve();
        }
        catch (e) {
            reject(e);
        }
    });
};
exports.asyncForEach = asyncForEach;
function uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
exports.uuidv4 = uuidv4;
function contains(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}
exports.contains = contains;
function safeGet(obj, key) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
        return obj[key];
    }
    else {
        return undefined;
    }
}
exports.safeGet = safeGet;
/**
 * Deep equal two objects. Support Arrays and Objects.
 */
function deepEqual(a, b) {
    if (a === b) {
        return true;
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    for (const k of aKeys) {
        if (!bKeys.includes(k)) {
            return false;
        }
        const aProp = a[k];
        const bProp = b[k];
        if ((0, validation_1.isObject)(aProp) && (0, validation_1.isObject)(bProp)) {
            if (!deepEqual(aProp, bProp)) {
                return false;
            }
        }
        else if (aProp !== bProp) {
            return false;
        }
    }
    for (const k of bKeys) {
        if (!aKeys.includes(k)) {
            return false;
        }
    }
    return true;
}
exports.deepEqual = deepEqual;
function getGlobalObject() {
    if (typeof globalThis !== "undefined") {
        return globalThis;
    }
    if (typeof self !== "undefined") {
        return self;
    }
    if (typeof window !== "undefined") {
        return window;
    }
    if (typeof global !== "undefined") {
        return global;
    }
    throw new Error("Unable to locate global object.");
}
exports.getGlobalObject = getGlobalObject;
function defer(fn) {
    process.nextTick(fn);
}
exports.defer = defer;
/**
 * Converts a string to a utf-8 encoded Uint8Array
 */
function encodeString(str) {
    if (typeof TextEncoder !== "undefined") {
        // Modern browsers, Node.js v11.0.0+ (or v8.3.0+ with util.TextEncoder)
        const encoder = new TextEncoder();
        return encoder.encode(str);
    }
    else if (typeof Buffer === "function") {
        // Node.js
        const buf = Buffer.from(str, "utf-8");
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    else {
        // Older browsers. Manually encode
        const arr = [];
        for (let i = 0; i < str.length; i++) {
            let code = str.charCodeAt(i);
            if (code > 128) {
                // Attempt simple UTF-8 conversion. See https://en.wikipedia.org/wiki/UTF-8
                if ((code & 0xd800) === 0xd800) {
                    // code starts with 1101 10...: this is a 2-part utf-16 char code
                    const nextCode = str.charCodeAt(i + 1);
                    if ((nextCode & 0xdc00) !== 0xdc00) {
                        // next code must start with 1101 11...
                        throw new Error("follow-up utf-16 character does not start with 0xDC00");
                    }
                    i++;
                    const p1 = code & 0x3ff; // Only use last 10 bits
                    const p2 = nextCode & 0x3ff;
                    // Create code point from these 2: (see https://en.wikipedia.org/wiki/UTF-16)
                    code = 0x10000 | (p1 << 10) | p2;
                }
                if (code < 2048) {
                    // Use 2 bytes for 11 bit value, first byte starts with 110xxxxx (0xc0), 2nd byte with 10xxxxxx (0x80)
                    const b1 = 0xc0 | ((code >> 6) & 0x1f); // 0xc0 = 11000000, 0x1f = 11111
                    const b2 = 0x80 | (code & 0x3f); // 0x80 = 10000000, 0x3f = 111111
                    arr.push(b1, b2);
                }
                else if (code < 65536) {
                    // Use 3 bytes for 16-bit value, bits per byte: 4, 6, 6
                    const b1 = 0xe0 | ((code >> 12) & 0xf); // 0xe0 = 11100000, 0xf = 1111
                    const b2 = 0x80 | ((code >> 6) & 0x3f); // 0x80 = 10000000, 0x3f = 111111
                    const b3 = 0x80 | (code & 0x3f);
                    arr.push(b1, b2, b3);
                }
                else if (code < 2097152) {
                    // Use 4 bytes for 21-bit value, bits per byte: 3, 6, 6, 6
                    const b1 = 0xf0 | ((code >> 18) & 0x7); // 0xf0 = 11110000, 0x7 = 111
                    const b2 = 0x80 | ((code >> 12) & 0x3f); // 0x80 = 10000000, 0x3f = 111111
                    const b3 = 0x80 | ((code >> 6) & 0x3f); // 0x80 = 10000000, 0x3f = 111111
                    const b4 = 0x80 | (code & 0x3f);
                    arr.push(b1, b2, b3, b4);
                }
                else {
                    throw new Error(`Cannot convert character ${str.charAt(i)} (code ${code}) to utf-8`);
                }
            }
            else {
                arr.push(code < 128 ? code : 63); // 63 = ?
            }
        }
        return new Uint8Array(arr);
    }
}
exports.encodeString = encodeString;
/**
 * Converts a utf-8 encoded buffer to string
 */
function decodeString(buffer) {
    // ArrayBuffer|
    if (typeof TextDecoder !== "undefined") {
        // Modern browsers, Node.js v11.0.0+ (or v8.3.0+ with util.TextDecoder)
        const decoder = new TextDecoder();
        if (buffer instanceof Uint8Array) {
            return decoder.decode(buffer);
        }
        const buf = Uint8Array.from(buffer);
        return decoder.decode(buf);
    }
    else if (typeof Buffer === "function") {
        // Node.js (v10 and below)
        if (buffer instanceof Array) {
            buffer = Uint8Array.from(buffer); // convert to typed array
        }
        if (!(buffer instanceof Buffer) && "buffer" in buffer && buffer.buffer instanceof ArrayBuffer) {
            const typedArray = buffer;
            buffer = Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength); // Convert typed array to node.js Buffer
        }
        if (!(buffer instanceof Buffer)) {
            throw new Error("Unsupported buffer argument");
        }
        return buffer.toString("utf-8");
    }
    else {
        // Older browsers. Manually decode!
        if (!(buffer instanceof Uint8Array) && "buffer" in buffer && buffer["buffer"] instanceof ArrayBuffer) {
            // Convert TypedArray to Uint8Array
            const typedArray = buffer;
            buffer = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
        }
        if (buffer instanceof Buffer || buffer instanceof Array || buffer instanceof Uint8Array) {
            let str = "";
            for (let i = 0; i < buffer.length; i++) {
                let code = buffer[i];
                if (code > 128) {
                    // Decode Unicode character
                    if ((code & 0xf0) === 0xf0) {
                        // 4 byte char
                        const b1 = code, b2 = buffer[i + 1], b3 = buffer[i + 2], b4 = buffer[i + 3];
                        code = ((b1 & 0x7) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f);
                        i += 3;
                    }
                    else if ((code & 0xe0) === 0xe0) {
                        // 3 byte char
                        const b1 = code, b2 = buffer[i + 1], b3 = buffer[i + 2];
                        code = ((b1 & 0xf) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
                        i += 2;
                    }
                    else if ((code & 0xc0) === 0xc0) {
                        // 2 byte char
                        const b1 = code, b2 = buffer[i + 1];
                        code = ((b1 & 0x1f) << 6) | (b2 & 0x3f);
                        i++;
                    }
                    else {
                        throw new Error("invalid utf-8 data");
                    }
                }
                if (code >= 65536) {
                    // Split into 2-part utf-16 char codes
                    code ^= 0x10000;
                    const p1 = 0xd800 | (code >> 10);
                    const p2 = 0xdc00 | (code & 0x3ff);
                    str += String.fromCharCode(p1);
                    str += String.fromCharCode(p2);
                }
                else {
                    str += String.fromCharCode(code);
                }
            }
            return str;
        }
        else {
            throw new Error("Unsupported buffer argument");
        }
    }
}
exports.decodeString = decodeString;
function numberToBytes(number) {
    const bytes = new Uint8Array(8);
    const view = new DataView(bytes.buffer);
    view.setFloat64(0, number);
    return new Array(...bytes);
}
exports.numberToBytes = numberToBytes;
function bytesToNumber(bytes) {
    const length = Array.isArray(bytes) ? bytes.length : bytes.byteLength;
    if (length !== 8) {
        throw new TypeError("must be 8 bytes");
    }
    const bin = new Uint8Array(bytes);
    const view = new DataView(bin.buffer);
    const nr = view.getFloat64(0);
    return nr;
}
exports.bytesToNumber = bytesToNumber;
function getAllUrlParams(url) {
    let queryString = url ? url.split("?")[1] : typeof window !== "undefined" && window.location && window.location.search ? window.location.search.slice(1) : "";
    let obj = {};
    if (queryString) {
        queryString = queryString.split("#")[0];
        let arr = queryString.split("&");
        for (let i = 0; i < arr.length; i++) {
            let a = arr[i].split("=");
            let paramName = a[0];
            let paramValue = typeof a[1] === "undefined" ? true : a[1];
            paramName = paramName.toLowerCase();
            if (typeof paramValue === "string") {
                paramValue = decodeURIComponent(paramValue).toLowerCase();
            }
            if (/\[(\d+)?\]$/.test(paramName)) {
                let key = paramName.replace(/\[(\d+)?\]/, "");
                if (!obj[key])
                    obj[key] = [];
                if (/\[\d+\]$/.test(paramName)) {
                    let index = parseInt(/\[(\d+)\]/.exec(paramName)[1]);
                    obj[key][index] = paramValue;
                }
                else {
                    obj[key].push(paramValue);
                }
            }
            else {
                if (!obj[paramName]) {
                    obj[paramName] = paramValue;
                }
                else if (obj[paramName] && typeof obj[paramName] === "string") {
                    obj[paramName] = [obj[paramName]];
                    obj[paramName].push(paramValue);
                }
                else {
                    obj[paramName].push(paramValue);
                }
            }
        }
    }
    return obj;
}
exports.getAllUrlParams = getAllUrlParams;
function objectToUrlParams(obj) {
    return Object.keys(obj)
        .map((key) => {
        const value = obj[key];
        if (Array.isArray(value)) {
            return value.map((val) => `${encodeURIComponent(key)}[]=${encodeURIComponent(val)}`).join("&");
        }
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
        .join("&");
}
exports.objectToUrlParams = objectToUrlParams;

}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"./validation":30,"_process":13,"buffer":13}],30:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEmpty = exports.isUrlValid = exports.isPhoneValid = exports.isPasswordValid = exports.isEmailValid = exports.isBuffer = exports.isSymbol = exports.isFunction = exports.isUndefined = exports.isDate = exports.isInfinity = exports.isNotNumber = exports.isNull = exports.isFloat = exports.isInt = exports.isNumberValid = exports.isNumber = exports.isBoolean = exports.isString = exports.isJson = exports.isObject = exports.isTypedArray = exports.isArray = void 0;
const isArray = (value) => {
    return Array.isArray(value) && typeof value === "object";
};
exports.isArray = isArray;
const isTypedArray = (val) => typeof val === "object" && ["ArrayBuffer", "Buffer", "Uint8Array", "Uint16Array", "Uint32Array", "Int8Array", "Int16Array", "Int32Array"].includes(val.constructor.name);
exports.isTypedArray = isTypedArray;
const isObject = (value) => {
    return typeof value === "object" && value !== null && !Array.isArray(value);
};
exports.isObject = isObject;
const isJson = (value) => {
    try {
        const result = JSON.parse(typeof value === "string" ? value : JSON.stringify(value));
        return (0, exports.isObject)(result);
    }
    catch (_a) {
        return false;
    }
};
exports.isJson = isJson;
const isString = (value) => {
    return typeof value === "string";
};
exports.isString = isString;
const isBoolean = (value) => {
    return typeof value === "boolean";
};
exports.isBoolean = isBoolean;
const isNumber = (value) => {
    return typeof value === "number" && Number(value) === value;
};
exports.isNumber = isNumber;
const isNumberValid = (value) => {
    if (typeof value === "number")
        return true;
    if (typeof value !== "string")
        return false;
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num) && /^(\-)?\d+(\.\d+)?$/.test(value);
};
exports.isNumberValid = isNumberValid;
const isInt = (value) => {
    return (0, exports.isNumber)(value) && value % 1 === 0;
};
exports.isInt = isInt;
const isFloat = (value) => {
    return (0, exports.isNumber)(value) && value % 1 !== 0;
};
exports.isFloat = isFloat;
const isNull = (value) => {
    return value === null && typeof value === "object";
};
exports.isNull = isNull;
const isNotNumber = (value) => {
    return typeof value === "number" && isNaN(value);
};
exports.isNotNumber = isNotNumber;
const isInfinity = (value) => {
    return typeof value === "number" && !isFinite(value);
};
exports.isInfinity = isInfinity;
const isDate = (value) => {
    return (value instanceof Date ||
        (typeof value === "object" && value !== null && typeof value.getMonth === "function") ||
        (typeof value === "string" && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z?$/.test(value) && !isNaN(Date.parse(value))));
};
exports.isDate = isDate;
const isUndefined = (value) => {
    return value === undefined && typeof value === "undefined";
};
exports.isUndefined = isUndefined;
const isFunction = (value) => {
    return typeof value === "function";
};
exports.isFunction = isFunction;
const isSymbol = (value) => {
    return typeof value === "symbol";
};
exports.isSymbol = isSymbol;
const isBuffer = (obj) => {
    return obj != null && obj.constructor != null && typeof obj.constructor.isBuffer === "function" && obj.constructor.isBuffer(obj);
};
exports.isBuffer = isBuffer;
const isEmailValid = (email) => {
    if (typeof email !== "string") {
        return false;
    }
    const regex = /^\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b$/gi;
    return regex.test(email);
};
exports.isEmailValid = isEmailValid;
const isPasswordValid = (password) => {
    if (typeof password !== "string") {
        return false;
    }
    var regex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/gm;
    return regex.test(password);
};
exports.isPasswordValid = isPasswordValid;
const isPhoneValid = (phone) => {
    if (typeof phone !== "string") {
        return false;
    }
    var regex = new RegExp("^((1[1-9])|([2-9][0-9]))((3[0-9]{3}[0-9]{4})|(9?[0-9]{3}[0-9]{5}))$");
    return regex.test(String(phone).replace(/\D/gi, ""));
};
exports.isPhoneValid = isPhoneValid;
const isUrlValid = (url) => {
    if (typeof url !== "string") {
        return false;
    }
    var regex = /^[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/gi;
    regex =
        /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i;
    return regex.test(url);
};
exports.isUrlValid = isUrlValid;
function isEmpty(obj) {
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            return false;
        }
    }
    return true;
}
exports.isEmpty = isEmpty;

},{}],31:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SimpleEventEmitter_1 = __importDefault(require("../Lib/SimpleEventEmitter"));
class NotImplementedError extends Error {
    constructor(name) {
        super(`${name} is not implemented`);
    }
}
class Api extends SimpleEventEmitter_1.default {
    constructor() {
        super();
    }
    /**
     * Provides statistics
     * @param options
     */
    stats(options) {
        throw new NotImplementedError("stats");
    }
    /**
     * @param path
     * @param event event to subscribe to ("value", "child_added" etc)
     * @param callback callback function
     */
    subscribe(path, event, callback, settings) {
        throw new NotImplementedError("subscribe");
    }
    unsubscribe(path, event, callback) {
        throw new NotImplementedError("unsubscribe");
    }
    update(path, updates, options) {
        throw new NotImplementedError("update");
    }
    set(path, value, options) {
        throw new NotImplementedError("set");
    }
    get(path, options) {
        throw new NotImplementedError("get");
    }
    transaction(path, callback, options) {
        throw new NotImplementedError("transaction");
    }
    exists(path) {
        throw new NotImplementedError("exists");
    }
    query(path, query, options) {
        throw new NotImplementedError("query");
    }
    reflect(path, type, args) {
        throw new NotImplementedError("reflect");
    }
    export(path, write, options) {
        throw new NotImplementedError("export");
    }
    import(path, read, options) {
        throw new NotImplementedError("import");
    }
    setSchema(path, schema, warnOnly) {
        throw new NotImplementedError("setSchema");
    }
    getSchema(path) {
        throw new NotImplementedError("getSchema");
    }
    getSchemas() {
        throw new NotImplementedError("getSchemas");
    }
    validateSchema(path, value, isUpdate) {
        throw new NotImplementedError("validateSchema");
    }
    getMutations(filter) {
        throw new NotImplementedError("getMutations");
    }
    getChanges(filter) {
        throw new NotImplementedError("getChanges");
    }
}
exports.default = Api;

},{"../Lib/SimpleEventEmitter":44}],32:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataBase = exports.DataBaseSettings = void 0;
const SimpleEventEmitter_1 = __importDefault(require("../Lib/SimpleEventEmitter"));
const reference_1 = require("./reference");
const DebugLogger_1 = __importDefault(require("../Lib/DebugLogger"));
const TypeMappings_1 = __importDefault(require("../Lib/TypeMappings"));
class DataBaseSettings {
    constructor(options) {
        /**
         * What level to use for console logging.
         * @default 'log'
         */
        this.logLevel = "log";
        /**
         * Whether to use colors in the console logs output
         * @default true
         */
        this.logColors = true;
        /**
         * @internal (for internal use)
         */
        this.info = "realtime database";
        if (typeof options !== "object") {
            options = {};
        }
        if (typeof options.logLevel === "string") {
            this.logLevel = options.logLevel;
        }
        if (typeof options.logColors === "boolean") {
            this.logColors = options.logColors;
        }
        if (typeof options.info === "string") {
            this.info = options.info;
        }
    }
}
exports.DataBaseSettings = DataBaseSettings;
class DataBase extends SimpleEventEmitter_1.default {
    constructor(dbname, options = {}) {
        super();
        this._ready = false;
        options = new DataBaseSettings(options);
        this.name = dbname;
        // Setup console logging
        this.debug = new DebugLogger_1.default(options.logLevel, `[${dbname}]`);
        // Setup type mapping functionality
        this.types = new TypeMappings_1.default(this);
        this.once("ready", () => {
            // console.log(`database "${dbname}" (${this.constructor.name}) is ready to use`);
            this._ready = true;
        });
    }
    /**
     * Waits for the database to be ready before running your callback.
     * @param callback (optional) callback function that is called when the database is ready to be used. You can also use the returned promise.
     * @returns returns a promise that resolves when ready
     */
    async ready(callback) {
        if (!this._ready) {
            // Wait for ready event
            await new Promise((resolve) => this.on("ready", resolve));
        }
        callback === null || callback === void 0 ? void 0 : callback();
    }
    get isReady() {
        return this._ready;
    }
    /**
     * Creates a reference to a node
     * @param path
     * @returns reference to the requested node
     */
    ref(path) {
        return new reference_1.DataReference(this, path);
    }
    /**
     * Get a reference to the root database node
     * @returns reference to root node
     */
    get root() {
        return this.ref("");
    }
    /**
     * Creates a query on the requested node
     * @param path
     * @returns query for the requested node
     */
    query(path) {
        const ref = new reference_1.DataReference(this, path);
        return new reference_1.DataReferenceQuery(ref);
    }
    get schema() {
        return {
            get: (path) => {
                return this.storage.getSchema(path);
            },
            set: (path, schema, warnOnly = false) => {
                return this.storage.setSchema(path, schema, warnOnly);
            },
            all: () => {
                return this.storage.getSchemas();
            },
            check: (path, value, isUpdate) => {
                return this.storage.validateSchema(path, value, isUpdate);
            },
        };
    }
}
exports.DataBase = DataBase;
exports.default = DataBase;

},{"../Lib/DebugLogger":37,"../Lib/SimpleEventEmitter":44,"../Lib/TypeMappings":48,"./reference":33}],33:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataReferenceQuery = exports.DataReferencesArray = exports.DataSnapshotsArray = exports.QueryDataRetrievalOptions = exports.DataReference = exports.DataRetrievalOptions = void 0;
const Subscription_1 = require("../Lib/Subscription");
const snapshot_1 = require("./snapshot");
const PathInfo_1 = __importDefault(require("../Lib/PathInfo"));
const ID_1 = __importDefault(require("../Lib/ID"));
const OptionalObservable_1 = require("../Lib/OptionalObservable");
class DataRetrievalOptions {
    /**
     * Opções para recuperação de dados, permite o carregamento seletivo de propriedades de objetos.
     */
    constructor(options) {
        if (!options) {
            options = {};
        }
        if (typeof options.include !== "undefined" && !(options.include instanceof Array)) {
            throw new TypeError("options.include must be an array");
        }
        if (typeof options.exclude !== "undefined" && !(options.exclude instanceof Array)) {
            throw new TypeError("options.exclude must be an array");
        }
        if (typeof options.child_objects !== "undefined" && typeof options.child_objects !== "boolean") {
            throw new TypeError("options.child_objects must be a boolean");
        }
        if (typeof options.cache_mode === "string" && !["allow", "bypass", "force"].includes(options.cache_mode)) {
            throw new TypeError("invalid value for options.cache_mode");
        }
        this.include = options.include || undefined;
        this.exclude = options.exclude || undefined;
        this.child_objects = typeof options.child_objects === "boolean" ? options.child_objects : undefined;
        this.cache_mode = typeof options.cache_mode === "string" ? options.cache_mode : typeof options.allow_cache === "boolean" ? (options.allow_cache ? "allow" : "bypass") : "allow";
        this.cache_cursor = typeof options.cache_cursor === "string" ? options.cache_cursor : undefined;
    }
}
exports.DataRetrievalOptions = DataRetrievalOptions;
const _private = Symbol("private");
class DataReference {
    /**
     * Cria uma referência para um nó
     */
    constructor(db, path, vars) {
        this.db = db;
        if (!path) {
            path = "";
        }
        path = path.replace(/^\/|\/$/g, ""); // Trim slashes
        const pathInfo = PathInfo_1.default.get(path);
        const key = pathInfo.key;
        const callbacks = [];
        this[_private] = {
            get path() {
                return path;
            },
            get key() {
                return key;
            },
            get callbacks() {
                return callbacks;
            },
            vars: vars || {},
            context: {},
            pushed: false,
            cursor: null,
        };
    }
    context(context, merge = false) {
        const currentContext = this[_private].context;
        if (typeof context === "object") {
            const newContext = context ? (merge ? currentContext || {} : context) : {};
            if (context) {
                // Mesclar novo com o contexto atual
                Object.keys(context).forEach((key) => {
                    newContext[key] = context[key];
                });
            }
            this[_private].context = newContext;
            return this;
        }
        else if (typeof context === "undefined") {
            console.warn("Use snap.context() instead of snap.ref.context() to get updating context in event callbacks");
            return currentContext;
        }
        else {
            throw new Error("Invalid context argument");
        }
    }
    /**
     * Contém o último cursor recebido para este caminho referenciado (se o banco de dados conectado tiver o log de transações ativado).
     * Se você deseja ser notificado se esse valor mudar, adicione um manipulador com `ref.onCursor(callback)`.
     */
    get cursor() {
        return this[_private].cursor;
    }
    set cursor(value) {
        var _a;
        this[_private].cursor = value;
        (_a = this.onCursor) === null || _a === void 0 ? void 0 : _a.call(this, value);
    }
    get isWildcardPath() {
        return this.path.indexOf("*") >= 0 || this.path.indexOf("$") >= 0;
    }
    /**
     * O caminho com o qual esta instância foi criada
     */
    get path() {
        return this[_private].path;
    }
    /**
     * A chave ou índice deste nó
     */
    get key() {
        const key = this[_private].key;
        return typeof key === "number" ? `[${key}]` : key;
    }
    /**
     * Se a "chave" for um número, é um índice!
     */
    get index() {
        const key = this[_private].key;
        if (typeof key !== "number") {
            throw new Error(`"${key}" is not a number`);
        }
        return key;
    }
    /**
     * Retorna uma nova referência para o pai deste nó
     */
    get parent() {
        const currentPath = PathInfo_1.default.fillVariables2(this.path, this.vars);
        const info = PathInfo_1.default.get(currentPath);
        if (info.parentPath === null) {
            return null;
        }
        return new DataReference(this.db, info.parentPath).context(this[_private].context);
    }
    /**
     * Contém valores das variáveis/curingas usadas em um caminho de assinatura se esta referência foi
     * criada por um evento ("value", "child_added", etc.), ou em um caminho de mapeamento de tipo ao serializar / instanciar objetos tipados.
     */
    get vars() {
        return this[_private].vars;
    }
    /**
     * Retorna uma nova referência para um nó filho
     * @param childPath Chave de filho, índice ou caminho
     * @returns Referência para o filho
     */
    child(childPath) {
        childPath = typeof childPath === "number" ? childPath : childPath.replace(/^\/|\/$/g, "");
        const currentPath = PathInfo_1.default.fillVariables2(this.path, this.vars);
        const targetPath = PathInfo_1.default.getChildPath(currentPath, childPath);
        return new DataReference(this.db, targetPath).context(this[_private].context); //  `${this.path}/${childPath}`
    }
    /**
     * Define ou sobrescreve o valor armazenado.
     * @param value Valor a ser armazenado no banco de dados.
     * @param onComplete Callback de conclusão opcional a ser usado em vez de retornar uma promise.
     * @returns Promise que é resolvida com esta referência quando concluída.
     */
    async set(value, onComplete) {
        try {
            if (this.isWildcardPath) {
                throw new Error(`Cannot set the value of wildcard path "/${this.path}"`);
            }
            if (this.parent === null) {
                throw new Error("Cannot set the root object. Use update, or set individual child properties");
            }
            if (typeof value === "undefined") {
                throw new TypeError(`Cannot store undefined value in "/${this.path}"`);
            }
            if (!this.db.isReady) {
                await this.db.ready();
            }
            value = this.db.types.serialize(this.path, value);
            const { cursor } = await this.db.storage.set(this.path, value, { context: this[_private].context });
            this.cursor = cursor;
            if (typeof onComplete === "function") {
                try {
                    onComplete(null, this);
                }
                catch (err) {
                    console.error("Error in onComplete callback:", err);
                }
            }
        }
        catch (err) {
            if (typeof onComplete === "function") {
                try {
                    onComplete(err, this);
                }
                catch (err) {
                    console.error("Error in onComplete callback:", err);
                }
            }
            else {
                // throw again
                throw err;
            }
        }
        return this;
    }
    /**
     * Atualiza as propriedades do nó referenciado.
     * @param updates Contendo as propriedades a serem atualizadas.
     * @param onComplete Callback de conclusão opcional a ser usado em vez de retornar uma promise.
     * @return Retorna uma promise que é resolvida com esta referência quando concluída.
     */
    async update(updates, onComplete) {
        try {
            if (this.isWildcardPath) {
                throw new Error(`Cannot update the value of wildcard path "/${this.path}"`);
            }
            if (!this.db.isReady) {
                await this.db.ready();
            }
            if (typeof updates !== "object" || updates instanceof Array || updates instanceof ArrayBuffer || updates instanceof Date) {
                await this.set(updates);
            }
            else if (Object.keys(updates).length === 0) {
                console.warn(`update called on path "/${this.path}", but there is nothing to update`);
            }
            else {
                updates = this.db.types.serialize(this.path, updates);
                const { cursor } = await this.db.storage.update(this.path, updates, { context: this[_private].context });
                this.cursor = cursor;
            }
            if (typeof onComplete === "function") {
                try {
                    onComplete(null, this);
                }
                catch (err) {
                    console.error("Error in onComplete callback:", err);
                }
            }
        }
        catch (err) {
            if (typeof onComplete === "function") {
                try {
                    onComplete(err, this);
                }
                catch (err) {
                    console.error("Error in onComplete callback:", err);
                }
            }
            else {
                // throw again
                throw err;
            }
        }
        return this;
    }
    /**
     * Define o valor de um nó usando uma transação: executa sua função de retorno de chamada com o valor atual, utiliza seu valor de retorno como o novo valor a ser armazenado.
     * A transação é cancelada se sua função de retorno de chamada retornar undefined ou lançar um erro. Se sua função de retorno de chamada retornar null, o nó de destino será removido.
     * @param callback - Função de retorno de chamada que realiza a transação no valor atual do nó. Deve retornar o novo valor a ser armazenado (ou uma promise com o novo valor), undefined para cancelar a transação ou null para remover o nó.
     * @returns Retorna uma promise que é resolvida com a DataReference assim que a transação for processada.
     */
    async transaction(callback) {
        if (this.isWildcardPath) {
            throw new Error(`Cannot start a transaction on wildcard path "/${this.path}"`);
        }
        if (!this.db.isReady) {
            await this.db.ready();
        }
        let throwError;
        const cb = (currentValue) => {
            currentValue = this.db.types.deserialize(this.path, currentValue);
            const snap = new snapshot_1.DataSnapshot(this, currentValue);
            let newValue;
            try {
                newValue = callback(snap);
            }
            catch (err) {
                // O código de retorno de chamada lançou um erro
                throwError = err; // Lembre-se do erro
                return; // cancela a transação retornando undefined
            }
            if (newValue instanceof Promise) {
                return newValue
                    .then((val) => {
                    return this.db.types.serialize(this.path, val);
                })
                    .catch((err) => {
                    throwError = err; // Lembre-se do erro
                    return; // cancela a transação retornando undefined
                });
            }
            else {
                return this.db.types.serialize(this.path, newValue);
            }
        };
        const { cursor } = await this.db.storage.transaction(this.path, cb, { context: this[_private].context });
        this.cursor = cursor;
        if (throwError) {
            // Relançar erro do código de retorno de chamada
            throw throwError;
        }
        return this;
    }
    on(event, callback, cancelCallback) {
        if (this.path === "" && ["value", "child_changed"].includes(event)) {
            // Removidos os eventos 'notify_value' e 'notify_child_changed' da lista, pois eles não exigem mais carregamento adicional de dados.
            console.warn("WARNING: Listening for value and child_changed events on the root node is a bad practice. These events require loading of all data (value event), or potentially lots of data (child_changed event) each time they are fired");
        }
        let eventPublisher;
        const eventStream = new Subscription_1.EventStream((publisher) => {
            eventPublisher = publisher;
        });
        // Mapear NOSSO retorno de chamada para o retorno de chamada original, para que o .off possa remover o(s) retorno(s) de chamada certo(s)
        const cb = {
            event,
            stream: eventStream,
            userCallback: typeof callback === "function" ? callback : undefined,
            ourCallback: (err, path, newValue, oldValue, eventContext) => {
                if (err) {
                    // TODO: Investigar se isso realmente acontece?
                    this.db.debug.error(`Error getting data for event ${event} on path "${path}"`, err);
                    return;
                }
                const ref = this.db.ref(path);
                ref[_private].vars = PathInfo_1.default.extractVariables(this.path, path);
                let callbackObject;
                if (event.startsWith("notify_")) {
                    // No evento de dados, retorno de chamada com referência
                    callbackObject = ref.context(eventContext || {});
                }
                else {
                    const values = {
                        previous: this.db.types.deserialize(path, oldValue),
                        current: this.db.types.deserialize(path, newValue),
                    };
                    if (event === "child_removed") {
                        callbackObject = new snapshot_1.DataSnapshot(ref, values.previous, true, values.previous, eventContext);
                    }
                    else if (event === "mutations") {
                        callbackObject = new snapshot_1.MutationsDataSnapshot(ref, values.current, eventContext);
                    }
                    else {
                        const isRemoved = event === "mutated" && values.current === null;
                        callbackObject = new snapshot_1.DataSnapshot(ref, values.current, isRemoved, values.previous, eventContext);
                    }
                }
                eventPublisher.publish(callbackObject);
                if (eventContext === null || eventContext === void 0 ? void 0 : eventContext.acebase_cursor) {
                    this.cursor = eventContext.acebase_cursor;
                }
            },
        };
        this[_private].callbacks.push(cb);
        const subscribe = () => {
            // (NOVO) Adicionar retorno de chamada ao fluxo de eventos
            // ref.on('value', callback) agora é exatamente o mesmo que ref.on('value').subscribe(callback)
            if (typeof callback === "function") {
                eventStream.subscribe(callback, (activated, cancelReason) => {
                    if (!activated) {
                        cancelCallback && cancelCallback(cancelReason);
                    }
                });
            }
            const advancedOptions = typeof callback === "object" ? callback : { newOnly: !callback }; // newOnly: se o retorno de chamada não for 'truthy', poderia alterar isso para (typeof callback !== 'function' && callback !== true), mas isso quebraria o código do cliente que usa um argumento truthy.
            if (typeof advancedOptions.newOnly !== "boolean") {
                advancedOptions.newOnly = false;
            }
            if (this.isWildcardPath) {
                advancedOptions.newOnly = true;
            }
            const cancelSubscription = (err) => {
                // Acesso negado?
                // Cancelar a assinatura
                const callbacks = this[_private].callbacks;
                callbacks.splice(callbacks.indexOf(cb), 1);
                this.db.storage.unsubscribe(this.path, event, cb.ourCallback);
                // Chamar cancelCallbacks
                this.db.debug.error(`Subscription "${event}" on path "/${this.path}" canceled because of an error: ${err.message}`);
                eventPublisher.cancel(err.message);
            };
            const authorized = this.db.storage.subscribe(this.path, event, cb.ourCallback, {
                newOnly: advancedOptions.newOnly,
                cancelCallback: cancelSubscription,
                syncFallback: advancedOptions.syncFallback,
            });
            const allSubscriptionsStoppedCallback = () => {
                const callbacks = this[_private].callbacks;
                callbacks.splice(callbacks.indexOf(cb), 1);
                return this.db.storage.unsubscribe(this.path, event, cb.ourCallback);
            };
            if (authorized instanceof Promise) {
                // A API da Web agora retorna uma promise que é resolvida se a solicitação for permitida
                // e é rejeitada quando o acesso é negado pelas regras de segurança definidas.
                authorized
                    .then(() => {
                    // Acesso concedido
                    eventPublisher.start(allSubscriptionsStoppedCallback);
                })
                    .catch(cancelSubscription);
            }
            else {
                // API local, sempre autorizada
                eventPublisher.start(allSubscriptionsStoppedCallback);
            }
            if (!advancedOptions.newOnly) {
                // Se o parâmetro de retorno de chamada for fornecido (seja uma função de retorno de chamada, true ou qualquer valor truthy),
                // ele disparará eventos para os valores atuais agora.
                // Caso contrário, espera-se que o método .subscribe seja usado, que então
                // só será chamado para eventos futuros.
                if (event === "value") {
                    this.get((snap) => {
                        eventPublisher.publish(snap);
                    });
                }
                else if (event === "child_added") {
                    this.get((snap) => {
                        const val = snap.val();
                        if (val === null || typeof val !== "object") {
                            return;
                        }
                        Object.keys(val).forEach((key) => {
                            const childSnap = new snapshot_1.DataSnapshot(this.child(key), val[key]);
                            eventPublisher.publish(childSnap);
                        });
                    });
                }
                else if (event === "notify_child_added") {
                    // Use a API de reflexão para obter os filhos atuais.
                    // NOTA: Isso não funciona com o IvipBase <= v0.9.7, apenas quando conectado como administrador.
                    const step = 100, limit = step;
                    let skip = 0;
                    const more = async () => {
                        const children = await this.db.storage.reflect(this.path, "children", { limit, skip });
                        if (children && "more" in children) {
                            children.list.forEach((child) => {
                                const childRef = this.child(child.key);
                                eventPublisher.publish(childRef);
                                // typeof callback === 'function' && callback(childRef);
                            });
                            if (children.more) {
                                skip += step;
                                more();
                            }
                        }
                    };
                    more();
                }
            }
        };
        if (this.db.isReady) {
            subscribe();
        }
        else {
            this.db.ready(subscribe);
        }
        return eventStream;
    }
    off(event, callback) {
        const subscriptions = this[_private].callbacks;
        const stopSubs = subscriptions.filter((sub) => (!event || sub.event === event) && (!callback || sub.userCallback === callback));
        if (stopSubs.length === 0) {
            this.db.debug.warn(`Can't find event subscriptions to stop (path: "${this.path}", event: ${event || "(any)"}, callback: ${callback})`);
        }
        stopSubs.forEach((sub) => {
            sub.stream.stop();
        });
        return this;
    }
    get(optionsOrCallback, callback) {
        if (!this.db.isReady) {
            const promise = this.db.ready().then(() => this.get(optionsOrCallback, callback));
            return typeof optionsOrCallback !== "function" && typeof callback !== "function" ? promise : undefined; // retorna apenas uma promise se nenhum retorno de chamada for utilizado
        }
        callback = typeof optionsOrCallback === "function" ? optionsOrCallback : typeof callback === "function" ? callback : undefined;
        if (this.isWildcardPath) {
            const error = new Error(`Cannot get value of wildcard path "/${this.path}". Use .query() instead`);
            if (typeof callback === "function") {
                throw error;
            }
            return Promise.reject(error);
        }
        const options = new DataRetrievalOptions(typeof optionsOrCallback === "object" ? optionsOrCallback : { cache_mode: "allow" });
        const promise = this.db.storage.get(this.path, options).then((result) => {
            var _a;
            const isNewApiResult = "context" in result && "value" in result;
            if (!isNewApiResult) {
                // A versão do pacote acebase-core foi atualizada, mas os pacotes acebase ou acebase-client não foram? Aviso, mas não lance um erro.
                console.warn("IvipBase api.get method returned an old response value. Update your acebase or acebase-client package");
                result = { value: result, context: {} };
            }
            const value = this.db.types.deserialize(this.path, result.value);
            const snapshot = new snapshot_1.DataSnapshot(this, value, undefined, undefined, result.context);
            if ((_a = result.context) === null || _a === void 0 ? void 0 : _a.acebase_cursor) {
                this.cursor = result.context.acebase_cursor;
            }
            return snapshot;
        });
        if (callback) {
            promise.then(callback).catch((err) => {
                console.error("Uncaught error:", err);
            });
            return;
        }
        else {
            return promise;
        }
    }
    /**
     * Aguarda a ocorrência de um evento
     * @param event Nome do evento, por exemplo, "value", "child_added", "child_changed", "child_removed"
     * @param options Opções de recuperação de dados, para incluir ou excluir chaves específicas de filhos
     * @returns Retorna uma promise que é resolvida com uma snapshot dos dados
     */
    once(event, options) {
        if (event === "value" && !this.isWildcardPath) {
            // Shortcut, do not start listening for future events
            return this.get(options);
        }
        return new Promise((resolve) => {
            const callback = (snap) => {
                this.off(event, callback); // unsubscribe directly
                resolve(snap);
            };
            this.on(event, callback);
        });
    }
    /**
     * @param value Valor opcional para armazenar no banco de dados imediatamente
     * @param onComplete Função de retorno de chamada opcional para ser executada uma vez que o valor foi armazenado
     * @returns Retorna uma promise que é resolvida com a referência após o valor passado ter sido armazenado
     */
    push(value, onComplete) {
        if (this.isWildcardPath) {
            const error = new Error(`Cannot push to wildcard path "/${this.path}"`);
            if (typeof value === "undefined" || typeof onComplete === "function") {
                throw error;
            }
            return Promise.reject(error);
        }
        const id = ID_1.default.generate();
        const ref = this.child(id);
        ref[_private].pushed = true;
        if (typeof value !== "undefined") {
            return ref.set(value, onComplete).then(() => ref);
        }
        else {
            return ref;
        }
    }
    /**
     * Remove este nó e todos os filhos
     */
    async remove() {
        if (this.isWildcardPath) {
            throw new Error(`Cannot remove wildcard path "/${this.path}". Use query().remove instead`);
        }
        if (this.parent === null) {
            throw new Error("Cannot remove the root node");
        }
        return this.set(null);
    }
    /**
     * Verifica rapidamente se esta referência possui um valor no banco de dados, sem retornar seus dados
     * @returns Retorna uma promise que é resolvida com um valor booleano
     */
    async exists() {
        if (this.isWildcardPath) {
            throw new Error(`Cannot check wildcard path "/${this.path}" existence`);
        }
        if (!this.db.isReady) {
            await this.db.ready();
        }
        return this.db.storage.exists(this.path);
    }
    /**
     * Cria um objeto de consulta para o nó atual
     */
    query() {
        return new DataReferenceQuery(this);
    }
    /**
     * Obtém o número de filhos que este nó possui, utiliza reflexão
     */
    async count() {
        const info = await this.reflect("info", { child_count: true });
        return info.children.count;
    }
    async reflect(type, args) {
        if (this.isWildcardPath) {
            throw new Error(`Cannot reflect on wildcard path "/${this.path}"`);
        }
        if (!this.db.isReady) {
            await this.db.ready();
        }
        return this.db.storage.reflect(this.path, type, args);
    }
    async export(write, options = { format: "json", type_safe: true }) {
        if (this.isWildcardPath) {
            throw new Error(`Cannot export wildcard path "/${this.path}"`);
        }
        if (!this.db.isReady) {
            await this.db.ready();
        }
        const writeFn = typeof write === "function" ? write : write.write.bind(write);
        return this.db.storage.export(this.path, writeFn, options);
    }
    /**
     * Importa o valor deste nó e todos os filhos
     * @param read Função que lê dados do seu fluxo
     * @param options Atualmente, o único formato suportado é json
     * @returns Retorna uma promise que é resolvida assim que todos os dados forem importados
     */
    async import(read, options = { format: "json", suppress_events: false }) {
        if (this.isWildcardPath) {
            throw new Error(`Cannot import to wildcard path "/${this.path}"`);
        }
        if (!this.db.isReady) {
            await this.db.ready();
        }
        return this.db.storage.import(this.path, read, options);
    }
    /**
     * @param options Opções opcionais iniciais de recuperação de dados.
     * Não recomendado para uso ainda - os includes/excludes fornecidos não são aplicados às mutações recebidas,
     * ou ações de sincronização ao usar um IvipBase com banco de dados de cache.
     */
    observe(options) {
        // options não deve ser usado ainda - não podemos prevenir/filtrar eventos de mutação em caminhos excluídos no momento
        if (options) {
            throw new Error("observe does not support data retrieval options yet");
        }
        if (this.isWildcardPath) {
            throw new Error(`Cannot observe wildcard path "/${this.path}"`);
        }
        const Observable = (0, OptionalObservable_1.getObservable)();
        return new Observable((observer) => {
            let cache, resolved = false;
            let promise = Promise.all([this.get(options)]).then(([snap]) => {
                resolved = true;
                cache = snap.val();
                observer.next(cache);
            });
            const updateCache = (snap) => {
                if (!resolved) {
                    promise = promise.then(() => updateCache(snap));
                    return;
                }
                const mutatedPath = snap.ref.path;
                if (mutatedPath === this.path) {
                    cache = snap.val();
                    return observer.next(cache);
                }
                const trailKeys = PathInfo_1.default.getPathKeys(mutatedPath).slice(PathInfo_1.default.getPathKeys(this.path).length);
                let target = cache;
                while (trailKeys.length > 1) {
                    const key = trailKeys.shift();
                    if (typeof key === "string" || typeof key === "number") {
                        if (!(key in target)) {
                            // Ocorre se os dados carregados inicialmente não incluíram / excluíram esses dados,
                            // ou se perdemos um evento
                            target[key] = typeof trailKeys[0] === "number" ? [] : {};
                        }
                        target = target[key];
                    }
                }
                const prop = trailKeys.shift();
                const newValue = snap.val();
                if (typeof prop === "string" || typeof prop === "number") {
                    if (newValue === null) {
                        // Remova isso
                        target instanceof Array && typeof prop === "number" ? target.splice(prop, 1) : delete target[prop];
                    }
                    else {
                        // Defina ou atualize isso
                        target[prop] = newValue;
                    }
                }
                observer.next(cache);
            };
            this.on("mutated", updateCache); // TODO: Refatorar para o evento 'mutations' em vez disso
            // Retornar a função de cancelamento da inscrição
            return () => {
                this.off("mutated", updateCache);
            };
        });
    }
    async forEach(callbackOrOptions, callback) {
        let options;
        if (typeof callbackOrOptions === "function") {
            callback = callbackOrOptions;
        }
        else {
            options = callbackOrOptions;
        }
        if (typeof callback !== "function") {
            throw new TypeError("No callback function given");
        }
        // Obtenha todos os filhos por meio de reflexão. Isso pode ser ajustado ainda mais usando paginação
        const { children } = await this.reflect("children", { limit: 0, skip: 0 }); // Obtém TODAS as chaves dos filhos
        const summary = {
            canceled: false,
            total: children && "list" in children ? children === null || children === void 0 ? void 0 : children.list.length : 0,
            processed: 0,
        };
        // Iterar por todos os filhos até que a função de retorno de chamada retorne false
        if (children && "list" in children) {
            for (let i = 0; i < children.list.length; i++) {
                const key = children.list[i].key;
                // Obter dados do filho
                const snapshot = await this.child(key).get(options);
                summary.processed++;
                if (!snapshot || !snapshot.exists()) {
                    // Foi removido nesse meio tempo, pule
                    continue;
                }
                // Executar a função de retorno de chamada
                const result = await callback(snapshot);
                if (result === false) {
                    summary.canceled = true;
                    break; // Parar o loop
                }
            }
        }
        return summary;
    }
    async getMutations(cursorOrDate) {
        const cursor = typeof cursorOrDate === "string" ? cursorOrDate : undefined;
        const timestamp = cursorOrDate === null || typeof cursorOrDate === "undefined" ? 0 : cursorOrDate instanceof Date ? cursorOrDate.getTime() : Date.now();
        return this.db.storage.getMutations({ path: this.path, cursor, timestamp });
    }
    async getChanges(cursorOrDate) {
        const cursor = typeof cursorOrDate === "string" ? cursorOrDate : undefined;
        const timestamp = cursorOrDate === null || typeof cursorOrDate === "undefined" ? 0 : cursorOrDate instanceof Date ? cursorOrDate.getTime() : Date.now();
        return this.db.storage.getChanges({ path: this.path, cursor, timestamp });
    }
}
exports.DataReference = DataReference;
class QueryDataRetrievalOptions extends DataRetrievalOptions {
    /**
     * @param options Opções para recuperação de dados, permite o carregamento seletivo de propriedades de objeto
     */
    constructor(options) {
        super(options);
        if (!["undefined", "boolean"].includes(typeof options.snapshots)) {
            throw new TypeError("options.snapshots must be a boolean");
        }
        this.snapshots = typeof options.snapshots === "boolean" ? options.snapshots : true;
    }
}
exports.QueryDataRetrievalOptions = QueryDataRetrievalOptions;
class DataSnapshotsArray extends Array {
    static from(snaps) {
        const arr = new DataSnapshotsArray(snaps.length);
        snaps.forEach((snap, i) => (arr[i] = snap));
        return arr;
    }
    getValues() {
        return this.map((snap) => snap.val());
    }
}
exports.DataSnapshotsArray = DataSnapshotsArray;
class DataReferencesArray extends Array {
    static from(refs) {
        const arr = new DataReferencesArray(refs.length);
        refs.forEach((ref, i) => (arr[i] = ref));
        return arr;
    }
    getPaths() {
        return this.map((ref) => ref.path);
    }
}
exports.DataReferencesArray = DataReferencesArray;
class DataReferenceQuery {
    /**
     * Cria uma consulta em uma referência
     */
    constructor(ref) {
        this.ref = ref;
        this[_private] = {
            filters: [],
            skip: 0,
            take: 0,
            order: [],
            events: {},
        };
    }
    /**
     * Aplica um filtro aos filhos da referência sendo consultada.
     * Se houver um índice na chave da propriedade que está sendo consultada, ele será usado
     * para acelerar a consulta.
     * @param key Propriedade para testar o valor
     * @param op Operador a ser usado
     * @param compare Valor a ser comparado
     */
    filter(key, op, compare) {
        if ((op === "in" || op === "!in") && (!(compare instanceof Array) || compare.length === 0)) {
            throw new Error(`${op} filter for ${key} must supply an Array compare argument containing at least 1 value`);
        }
        if ((op === "between" || op === "!between") && (!(compare instanceof Array) || compare.length !== 2)) {
            throw new Error(`${op} filter for ${key} must supply an Array compare argument containing 2 values`);
        }
        if ((op === "matches" || op === "!matches") && !(compare instanceof RegExp)) {
            throw new Error(`${op} filter for ${key} must supply a RegExp compare argument`);
        }
        // DISABLED 2019/10/23 because it is not fully implemented only works locally
        // if (op === "custom" && typeof compare !== "function") {
        //     throw `${op} filter for ${key} must supply a Function compare argument`;
        // }
        // DISABLED 2022/08/15, implemented by query.ts in acebase
        // if ((op === 'contains' || op === '!contains') && ((typeof compare === 'object' && !(compare instanceof Array) && !(compare instanceof Date)) || (compare instanceof Array && compare.length === 0))) {
        //     throw new Error(`${op} filter for ${key} must supply a simple value or (non-zero length) array compare argument`);
        // }
        this[_private].filters.push({ key, op, compare });
        return this;
    }
    /**
     * @deprecated use `.filter` instead
     */
    where(key, op, compare) {
        return this.filter(key, op, compare);
    }
    /**
     * Limits the number of query results
     */
    take(n) {
        this[_private].take = n;
        return this;
    }
    /**
     * Skips the first n query results
     */
    skip(n) {
        this[_private].skip = n;
        return this;
    }
    sort(key, ascending = true) {
        if (!["string", "number"].includes(typeof key)) {
            throw "key must be a string or number";
        }
        this[_private].order.push({ key, ascending });
        return this;
    }
    /**
     * @deprecated use `.sort` instead
     */
    order(key, ascending = true) {
        return this.sort(key, ascending);
    }
    get(optionsOrCallback, callback) {
        if (!this.ref.db.isReady) {
            const promise = this.ref.db.ready().then(() => this.get(optionsOrCallback, callback));
            return typeof optionsOrCallback !== "function" && typeof callback !== "function" ? promise : undefined; // only return promise if no callback is used
        }
        callback = typeof optionsOrCallback === "function" ? optionsOrCallback : typeof callback === "function" ? callback : undefined;
        const options = new QueryDataRetrievalOptions(typeof optionsOrCallback === "object" ? optionsOrCallback : { snapshots: true, cache_mode: "allow" });
        options.allow_cache = options.cache_mode !== "bypass"; // Backward compatibility when using older acebase-client
        options.eventHandler = (ev) => {
            // TODO: implement context for query events
            if (!this[_private].events[ev.name]) {
                return false;
            }
            const listeners = this[_private].events[ev.name];
            if (typeof listeners !== "object" || listeners.length === 0) {
                return false;
            }
            if (["add", "change", "remove"].includes(ev.name)) {
                const eventData = {
                    name: ev.name,
                    ref: new DataReference(this.ref.db, ev.path),
                };
                if (eventData.ref && options.snapshots && ev.name !== "remove") {
                    const val = db.types.deserialize(ev.path, ev.value);
                    eventData.snapshot = new snapshot_1.DataSnapshot(eventData.ref, val, false);
                }
                ev = eventData;
            }
            listeners.forEach((callback) => {
                var _a, _b;
                try {
                    callback(ev);
                }
                catch (err) {
                    this.ref.db.debug.error(`Error executing "${ev.name}" event handler of realtime query on path "${this.ref.path}": ${(_b = (_a = err === null || err === void 0 ? void 0 : err.stack) !== null && _a !== void 0 ? _a : err === null || err === void 0 ? void 0 : err.message) !== null && _b !== void 0 ? _b : err}`);
                }
            });
        };
        // Check if there are event listeners set for realtime changes
        options.monitor = { add: false, change: false, remove: false };
        if (this[_private].events) {
            if (this[_private].events["add"] && this[_private].events["add"].length > 0) {
                options.monitor.add = true;
            }
            if (this[_private].events["change"] && this[_private].events["change"].length > 0) {
                options.monitor.change = true;
            }
            if (this[_private].events["remove"] && this[_private].events["remove"].length > 0) {
                options.monitor.remove = true;
            }
        }
        // Interrompe os resultados em tempo real se ainda estiverem habilitados em um .get anterior nesta instância
        this.stop();
        // NOTA: retorna uma promise aqui, independentemente do argumento de retorno de chamada. Bom argumento para refatorar o método para async/await em breve
        const db = this.ref.db;
        return db.storage
            .query(this.ref.path, this[_private], options)
            .catch((err) => {
            throw new Error(err);
        })
            .then((res) => {
            const { stop } = res;
            let { results, context } = res;
            this.stop = async () => {
                await stop();
            };
            if (!("results" in res && "context" in res)) {
                console.warn("Query results missing context. Update your acebase and/or acebase-client packages");
                (results = res), (context = {});
            }
            if (options.snapshots) {
                const snaps = results.map((result) => {
                    const val = db.types.deserialize(result.path, result.val);
                    return new snapshot_1.DataSnapshot(db.ref(result.path), val, false, undefined, context);
                });
                return DataSnapshotsArray.from(snaps);
            }
            else {
                const refs = results.map((path) => db.ref(path));
                return DataReferencesArray.from(refs);
            }
        })
            .then((results) => {
            callback && callback(results);
            return results;
        });
    }
    /**
     * Stops a realtime query, no more notifications will be received.
     */
    async stop() {
        // Overridden by .get
    }
    /**
     * Executes the query and returns references. Short for `.get({ snapshots: false })`
     * @param callback callback to use instead of returning a promise
     * @returns returns an Promise that resolves with an array of DataReferences, or void when using a callback
     * @deprecated Use `find` instead
     */
    getRefs(callback) {
        return this.get({ snapshots: false }, callback);
    }
    /**
     * Executes the query and returns an array of references. Short for `.get({ snapshots: false })`
     */
    find() {
        return this.get({ snapshots: false });
    }
    /**
     * Executes the query and returns the number of results
     */
    async count() {
        const refs = await this.find();
        return refs.length;
    }
    /**
     * Executes the query and returns if there are any results
     */
    async exists() {
        const originalTake = this[_private].take;
        const p = this.take(1).find();
        this.take(originalTake);
        const refs = await p;
        return refs.length !== 0;
    }
    /**
     * Executes the query, removes all matches from the database
     * @returns returns a Promise that resolves once all matches have been removed
     */
    async remove(callback) {
        const refs = await this.find();
        // Perform updates on each distinct parent collection (only 1 parent if this is not a wildcard path)
        const parentUpdates = refs.reduce((parents, ref) => {
            if (ref.parent) {
                const parent = parents[ref.parent.path];
                if (!parent) {
                    parents[ref.parent.path] = [ref];
                }
                else {
                    parent.push(ref);
                }
            }
            return parents;
        }, {});
        const db = this.ref.db;
        const promises = Object.keys(parentUpdates).map(async (parentPath) => {
            const updates = refs.reduce((updates, ref) => {
                updates[ref.key] = null;
                return updates;
            }, {});
            const ref = db.ref(parentPath);
            try {
                await ref.update(updates);
                return { ref, success: true };
            }
            catch (error) {
                return { ref, success: false, error };
            }
        });
        const results = await Promise.all(promises);
        callback && callback(results);
        return results;
    }
    on(event, callback) {
        if (!this[_private].events[event]) {
            this[_private].events[event] = [];
        }
        this[_private].events[event].push(callback);
        return this;
    }
    /**
     * Unsubscribes from (a) previously added event(s)
     * @param event Name of the event
     * @param callback callback function to remove
     * @returns returns reference to this query
     */
    off(event, callback) {
        if (typeof event === "undefined") {
            this[_private].events = {};
            return this;
        }
        if (!this[_private].events[event]) {
            return this;
        }
        if (typeof callback === "undefined") {
            delete this[_private].events[event];
            return this;
        }
        const index = this[_private].events[event].indexOf(callback);
        if (!~index) {
            return this;
        }
        this[_private].events[event].splice(index, 1);
        return this;
    }
    async forEach(callbackOrOptions, callback) {
        let options;
        if (typeof callbackOrOptions === "function") {
            callback = callbackOrOptions;
        }
        else {
            options = callbackOrOptions;
        }
        if (typeof callback !== "function") {
            throw new TypeError("No callback function given");
        }
        // Get all query results. This could be tweaked further using paging
        const refs = await this.find();
        const summary = {
            canceled: false,
            total: refs.length,
            processed: 0,
        };
        // Iterate through all children until callback returns false
        for (let i = 0; i < refs.length; i++) {
            const ref = refs[i];
            // Get child data
            const snapshot = await ref.get(options);
            summary.processed++;
            if (!snapshot || !snapshot.exists()) {
                // Was removed in the meantime, skip
                continue;
            }
            // Run callback
            const result = await callback(snapshot);
            if (result === false) {
                summary.canceled = true;
                break; // Stop looping
            }
        }
        return summary;
    }
}
exports.DataReferenceQuery = DataReferenceQuery;

},{"../Lib/ID":38,"../Lib/OptionalObservable":40,"../Lib/PathInfo":42,"../Lib/Subscription":46,"./snapshot":34}],34:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MutationsDataSnapshot = exports.DataSnapshot = void 0;
const PathInfo_1 = __importDefault(require("../Lib/PathInfo"));
function getChild(snapshot, path, previous = false) {
    if (!snapshot.exists()) {
        return null;
    }
    let child = previous ? snapshot.previous() : snapshot.val();
    if (typeof path === "number") {
        return child[path];
    }
    PathInfo_1.default.getPathKeys(path).every((key) => {
        child = child[key];
        return typeof child !== "undefined";
    });
    return child || null;
}
function getChildren(snapshot) {
    if (!snapshot.exists()) {
        return [];
    }
    const value = snapshot.val();
    if (value instanceof Array) {
        return new Array(value.length).map((v, i) => i);
    }
    if (typeof value === "object") {
        return Object.keys(value);
    }
    return [];
}
class DataSnapshot {
    /**
     * Indica se o nó existe no banco de dados
     */
    exists() {
        return false;
    }
    /**
     * Cria uma nova instância do DataSnapshot
     */
    constructor(ref, value, isRemoved = false, prevValue, context) {
        this.ref = ref;
        this.val = () => {
            return value;
        };
        this.previous = () => {
            return prevValue;
        };
        this.exists = () => {
            if (isRemoved) {
                return false;
            }
            return value !== null && typeof value !== "undefined";
        };
        this.context = () => {
            return context || {};
        };
    }
    /**
     * Cria uma instância `DataSnapshot`
     * @internal (para uso interno)
     */
    static for(ref, value) {
        return new DataSnapshot(ref, value);
    }
    child(path) {
        // Create new snapshot for child data
        const val = getChild(this, path, false);
        const prev = getChild(this, path, true);
        return new DataSnapshot(this.ref.child(path), val, false, prev);
    }
    /**
     * Verifica se o valor do instantâneo tem um filho com a chave ou caminho fornecido
     * @param path chave filho ou caminho
     */
    hasChild(path) {
        return getChild(this, path) !== null;
    }
    /**
     * Indica se o valor do instantâneo tem algum nó filho
     */
    hasChildren() {
        return getChildren(this).length > 0;
    }
    /**
     * O número de nós filhos neste instantâneo
     */
    numChildren() {
        return getChildren(this).length;
    }
    /**
     * Executa uma função de retorno de chamada para cada nó filho neste instantâneo até que o retorno de chamada retorne falso
     * @param callback Função de retorno de chamada com um instantâneo de cada nó filho neste instantâneo.
     * Deve retornar um valor booleano que indica se a iteração deve continuar ou não.
     */
    forEach(callback) {
        var _a, _b;
        const value = (_a = this.val()) !== null && _a !== void 0 ? _a : {};
        const prev = (_b = this.previous()) !== null && _b !== void 0 ? _b : {};
        return getChildren(this).every((key) => {
            const snap = new DataSnapshot(this.ref.child(key), value[key], false, prev[key]);
            return callback(snap);
        });
    }
    /**
     * A chave do caminho do nó
     */
    get key() {
        return this.ref.key;
    }
}
exports.DataSnapshot = DataSnapshot;
class MutationsDataSnapshot extends DataSnapshot {
    constructor(ref, mutations, context) {
        super(ref, mutations, false, undefined, context);
        /**
         * Não use isso para obter valores anteriores de nós mutados.
         * Use as propriedades `.previous` nas snapshots individuais de cada filho.
         * @throws Lança um erro se você o utilizar.
         */
        this.previous = () => {
            throw new Error("Iterate values to get previous values for each mutation");
        };
        this.val = (warn = true) => {
            if (warn) {
                console.warn("Unless you know what you are doing, it is best not to use the value of a mutations snapshot directly. Use child methods and forEach to iterate the mutations instead");
            }
            return mutations;
        };
    }
    /**
     * Executa uma função de retorno de chamada para cada mutação nesta snapshot até que a função de retorno de chamada retorne false.
     * @param callback Função chamada com uma snapshot de cada mutação nesta snapshot. Deve retornar um valor booleano que indica se deve continuar a iteração ou não.
     * @returns Retorna se cada filho foi iterado.
     */
    forEach(callback) {
        const mutations = this.val(false);
        return mutations.every((mutation) => {
            const ref = mutation.target.reduce((ref, key) => ref.child(key), this.ref);
            const snap = new DataSnapshot(ref, mutation.val, false, mutation.prev);
            return callback(snap);
        });
    }
    child(index) {
        if (typeof index !== "number") {
            throw new Error("child index must be a number");
        }
        const mutation = this.val(false)[index];
        const ref = mutation.target.reduce((ref, key) => ref.child(key), this.ref);
        return new DataSnapshot(ref, mutation.val, false, mutation.prev);
    }
}
exports.MutationsDataSnapshot = MutationsDataSnapshot;

},{"../Lib/PathInfo":42}],35:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ascii85 = void 0;
function c(input, length, result) {
    const b = [0, 0, 0, 0, 0];
    for (let i = 0; i < length; i += 4) {
        let n = ((input[i] * 256 + input[i + 1]) * 256 + input[i + 2]) * 256 + input[i + 3];
        if (!n) {
            result.push("z");
        }
        else {
            for (let j = 0; j < 5; b[j++] = (n % 85) + 33, n = Math.floor(n / 85)) { }
            result.push(String.fromCharCode(b[4], b[3], b[2], b[1], b[0]));
        }
    }
}
function encode(arr) {
    // summary: encodes input data in ascii85 string
    // input: ArrayLike
    var _a;
    const input = arr, result = [], remainder = input.length % 4, length = input.length - remainder;
    c(input, length, result);
    if (remainder) {
        const t = new Uint8Array(4);
        t.set(input.slice(length), 0);
        c(t, 4, result);
        let x = (_a = result.pop()) !== null && _a !== void 0 ? _a : "";
        if (x == "z") {
            x = "!!!!!";
        }
        result.push(x.substr(0, remainder + 1));
    }
    let ret = result.join(""); // String
    ret = "<~" + ret + "~>";
    return ret;
}
exports.ascii85 = {
    encode: function (arr) {
        if (arr instanceof ArrayBuffer) {
            arr = new Uint8Array(arr, 0, arr.byteLength);
        }
        return encode(arr);
    },
    decode: function (input) {
        // summary: decodes the input string back to an ArrayBuffer
        // input: String: the input string to decode
        if (!input.startsWith("<~") || !input.endsWith("~>")) {
            throw new Error("Invalid input string");
        }
        input = input.substr(2, input.length - 4);
        const n = input.length, r = [], b = [0, 0, 0, 0, 0];
        let t, x, y, d;
        for (let i = 0; i < n; ++i) {
            if (input.charAt(i) == "z") {
                r.push(0, 0, 0, 0);
                continue;
            }
            for (let j = 0; j < 5; ++j) {
                b[j] = input.charCodeAt(i + j) - 33;
            }
            d = n - i;
            if (d < 5) {
                for (let j = d; j < 4; b[++j] = 0) { }
                b[d] = 85;
            }
            t = (((b[0] * 85 + b[1]) * 85 + b[2]) * 85 + b[3]) * 85 + b[4];
            x = t & 255;
            t >>>= 8;
            y = t & 255;
            t >>>= 8;
            r.push(t >>> 8, t & 255, y, x);
            for (let j = d; j < 5; ++j, r.pop()) { }
            i += 4;
        }
        const data = new Uint8Array(r);
        return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    },
};
exports.default = exports.ascii85;

},{}],36:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assert = void 0;
/**
 * Replacement for console.assert, throws an error if condition is not met.
 * @param condition 'truthy' condition
 * @param error
 */
function assert(condition, error) {
    if (!condition) {
        throw new Error(`Assertion failed: ${error !== null && error !== void 0 ? error : "check your code"}`);
    }
}
exports.assert = assert;

},{}],37:[function(require,module,exports){
(function (process){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => { };
class DebugLogger {
    constructor(level = "log", prefix = "") {
        this.level = level;
        this.prefix = prefix;
        this.setLevel(level);
    }
    setLevel(level) {
        const prefix = this.prefix ? this.prefix + " %s" : "";
        this.verbose = ["verbose"].includes(level) ? (prefix ? console.log.bind(console, prefix) : console.log.bind(console)) : noop;
        this.log = ["verbose", "log"].includes(level) ? (prefix ? console.log.bind(console, prefix) : console.log.bind(console)) : noop;
        this.warn = ["verbose", "log", "warn"].includes(level) ? (prefix ? console.warn.bind(console, prefix) : console.warn.bind(console)) : noop;
        this.error = ["verbose", "log", "warn", "error"].includes(level) ? (prefix ? console.error.bind(console, prefix) : console.error.bind(console)) : noop;
        this.write = (text) => {
            const isRunKit = typeof process !== "undefined" && process.env && typeof process.env.RUNKIT_ENDPOINT_PATH === "string";
            if (text && isRunKit) {
                text.split("\n").forEach((line) => console.log(line)); // Logs each line separately
            }
            else {
                console.log(text);
            }
        };
    }
}
exports.default = DebugLogger;

}).call(this)}).call(this,require('_process'))
},{"_process":13}],38:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cuid_1 = __importDefault(require("cuid"));
// Not using slugs, removed code
let timeBias = 0;
class ID {
    /**
     * (for internal use)
     * bias in milliseconds to adjust generated cuid timestamps with
     */
    static set timeBias(bias) {
        if (typeof bias !== "number") {
            return;
        }
        timeBias = bias;
    }
    static generate() {
        // Could also use https://www.npmjs.com/package/pushid for Firebase style 20 char id's
        return (0, cuid_1.default)().slice(1); // Cuts off the always leading 'c'
        // return uuid62.v1();
    }
}
exports.default = ID;

},{"cuid":14}],39:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectCollection = void 0;
const ID_1 = __importDefault(require("./ID"));
/**
 * Convenience interface for defining an object collection
 * @example
 * type ChatMessage = {
 *    text: string, uid: string, sent: Date
 * }
 * type Chat = {
 *    title: text
 *    messages: ObjectCollection<ChatMessage>
 * }
 */
class ObjectCollection {
    /**
     * Converts and array of values into an object collection, generating a unique key for each item in the array
     * @param array
     * @example
     * const array = [
     *  { title: "Don't make me think!", author: "Steve Krug" },
     *  { title: "The tipping point", author: "Malcolm Gladwell" }
     * ];
     *
     * // Convert:
     * const collection = ObjectCollection.from(array);
     * // --> {
     * //   kh1x3ygb000120r7ipw6biln: {
     * //       title: "Don't make me think!",
     * //       author: "Steve Krug"
     * //   },
     * //   kh1x3ygb000220r757ybpyec: {
     * //       title: "The tipping point",
     * //       author: "Malcolm Gladwell"
     * //   }
     * // }
     *
     * // Now it's easy to add them to the db:
     * db.ref('books').update(collection);
     */
    static from(array) {
        const collection = {};
        array.forEach((child) => {
            collection[ID_1.default.generate()] = child;
        });
        return collection;
    }
}
exports.ObjectCollection = ObjectCollection;

},{"./ID":38}],40:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setObservable = exports.getObservable = void 0;
const SimpleObservable_1 = __importDefault(require("./SimpleObservable"));
const Utils_1 = require("./Utils");
let _shimRequested = false;
let _observable;
(async () => {
    // Try pre-loading rxjs Observable
    // Test availability in global scope first
    const global = (0, Utils_1.getGlobalObject)();
    if (typeof global.Observable !== "undefined") {
        _observable = global.Observable;
        return;
    }
    // Try importing it from dependencies
    try {
        const { Observable } = await Promise.resolve().then(() => __importStar(require("rxjs")));
        _observable = Observable;
    }
    catch (_a) {
        // rxjs Observable not available, setObservable must be used if usage of SimpleObservable is not desired
        _observable = SimpleObservable_1.default;
    }
})();
function getObservable() {
    if (_observable === SimpleObservable_1.default && !_shimRequested) {
        console.warn("Using IvipBase's simple Observable implementation because rxjs is not available. " +
            'Add it to your project with "npm install rxjs", add it to IvipBase using db.setObservable(Observable), ' +
            'or call db.setObservable("shim") to suppress this warning');
    }
    if (_observable) {
        return _observable;
    }
    throw new Error("RxJS Observable could not be loaded. ");
}
exports.getObservable = getObservable;
function setObservable(Observable) {
    if (Observable === "shim") {
        _observable = SimpleObservable_1.default;
        _shimRequested = true;
    }
    else {
        _observable = Observable;
    }
}
exports.setObservable = setObservable;

},{"./SimpleObservable":45,"./Utils":49,"rxjs":13}],41:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartialArray = void 0;
/**
 * Sparse/partial array converted to a serializable object. Use `Object.keys(sparseArray)` and `Object.values(sparseArray)` to iterate its indice and/or values
 */
class PartialArray {
    constructor(sparseArray) {
        if (sparseArray instanceof Array) {
            for (let i = 0; i < sparseArray.length; i++) {
                if (typeof sparseArray[i] !== "undefined") {
                    this[i] = sparseArray[i];
                }
            }
        }
        else if (sparseArray) {
            Object.assign(this, sparseArray);
        }
    }
}
exports.PartialArray = PartialArray;

},{}],42:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathInfo = exports.PathReference = void 0;
class PathReference {
    /**
     * Cria uma referência a um caminho que pode ser armazenado no banco de dados. Use isso para criar referências cruzadas para outros dados em seu banco de dados.
     * @param path
     */
    constructor(path) {
        this.path = path;
    }
}
exports.PathReference = PathReference;
function getPathKeys(path) {
    path = path.replace(/\[/g, "/[").replace(/^\/+/, "").replace(/\/+$/, ""); // Substitua `[` por `/[`, remova barras invertidas iniciais, remova barras invertidas finais
    if (path.length === 0) {
        return [""];
    }
    const keys = ["", ...path.split("/")];
    return keys.map((key) => {
        return key.startsWith("[") ? parseInt(key.slice(1, -1)) : key;
    });
}
class PathInfo {
    static get(path) {
        return new PathInfo(path);
    }
    static getChildPath(path, childKey) {
        // return getChildPath(path, childKey);
        return PathInfo.get(path).child(childKey).path;
    }
    static getPathKeys(path) {
        return getPathKeys(path);
    }
    constructor(path) {
        if (typeof path === "string") {
            this.keys = getPathKeys(path);
        }
        else if (path instanceof Array) {
            this.keys = path;
        }
        else {
            this.keys = [""];
        }
        this.path = this.keys.reduce((path, key, i) => (i === 0 ? `${key}` : typeof key === "string" ? `${path}/${key}` : `${path}[${key}]`), "").replace(/^\//gi, "");
    }
    get key() {
        return this.keys.length === 0 ? null : this.keys.slice(-1)[0];
    }
    get parent() {
        if (this.keys.length == 0) {
            return null;
        }
        const parentKeys = this.keys.slice(0, -1);
        return new PathInfo(parentKeys);
    }
    get parentPath() {
        var _a, _b;
        return this.keys.length === 0 ? null : (_b = (_a = this.parent) === null || _a === void 0 ? void 0 : _a.path) !== null && _b !== void 0 ? _b : null;
    }
    child(childKey) {
        if (typeof childKey === "string") {
            if (childKey.length === 0) {
                throw new Error(`child key for path "${this.path}" cannot be empty`);
            }
            // Permitir a expansão de um caminho filho (por exemplo, "user/name") para o equivalente a `child('user').child('name')`
            const keys = getPathKeys(childKey);
            keys.forEach((key, index) => {
                // Verifique as regras de chave do IvipBase aqui para que sejam aplicadas independentemente do destino de armazenamento.
                // Isso impede que chaves específicas sejam permitidas em um ambiente (por exemplo, navegador), mas depois
                // recusadas ao sincronizar com um banco de dados binário IvipBase.
                if (typeof key !== "string") {
                    return;
                }
                if (/[\x00-\x08\x0b\x0c\x0e-\x1f/[\]\\]/.test(key)) {
                    throw new Error(`Invalid child key "${key}" for path "${this.path}". Keys cannot contain control characters or any of the following characters: \\ / [ ]`);
                }
                if (key.length > 128) {
                    throw new Error(`child key "${key}" for path "${this.path}" is too long. Max key length is 128`);
                }
                if (index !== 0 && key.length === 0) {
                    throw new Error(`child key for path "${this.path}" cannot be empty`);
                }
            });
            childKey = keys;
        }
        if (Array.isArray(childKey) && childKey[0] === "")
            childKey.shift();
        return new PathInfo(this.keys.concat(childKey).filter((key, i, l) => (key === "" ? i === 0 : true)));
    }
    childPath(childKey) {
        return this.child(childKey).path;
    }
    get pathKeys() {
        return this.keys;
    }
    /**
     * Se varPath contiver variáveis ou wildcards, ele as retornará com os valores encontrados em fullPath
     * @param {string} varPath caminho contendo variáveis como * e $name
     * @param {string} fullPath caminho real para um nó
     * @returns {{ [index: number]: string|number, [variable: string]: string|number }} retorna um objeto semelhante a uma matriz com todos os valores de variáveis. Todas as variáveis nomeadas também são definidas no objeto pelo nome delas (por exemplo, vars.uid e vars.$uid)
     * @example
     * PathInfo.extractVariables('users/$uid/posts/$postid', 'users/ewout/posts/post1/title') === {
     *  0: 'ewout',
     *  1: 'post1',
     *  uid: 'ewout', // ou $uid
     *  postid: 'post1' // ou $postid
     * };
     *
     * PathInfo.extractVariables('users/*\/posts/*\/$property', 'users/ewout/posts/post1/title') === {
     *  0: 'ewout',
     *  1: 'post1',
     *  2: 'title',
     *  property: 'title' // ou $property
     * };
     *
     * PathInfo.extractVariables('users/$user/friends[*]/$friend', 'users/dora/friends[4]/diego') === {
     *  0: 'dora',
     *  1: 4,
     *  2: 'diego',
     *  user: 'dora', // ou $user
     *  friend: 'diego' // ou $friend
     * };
     */
    static extractVariables(varPath, fullPath) {
        if (!varPath.includes("*") && !varPath.includes("$")) {
            return [];
        }
        // if (!this.equals(fullPath)) {
        //     throw new Error(`path does not match with the path of this PathInfo instance: info.equals(path) === false!`)
        // }
        const keys = getPathKeys(varPath);
        const pathKeys = getPathKeys(fullPath);
        let count = 0;
        const variables = {
            get length() {
                return count;
            },
        };
        keys.forEach((key, index) => {
            const pathKey = pathKeys[index];
            if (key === "*") {
                variables[count++] = pathKey;
            }
            else if (typeof key === "string" && key[0] === "$") {
                variables[count++] = pathKey;
                // Set the $variable property
                variables[key] = pathKey;
                // Set friendly property name (without $)
                const varName = key.slice(1);
                if (typeof variables[varName] === "undefined") {
                    variables[varName] = pathKey;
                }
            }
        });
        return variables;
    }
    /**
     * Se varPath contiver variáveis ou wildcards, ele retornará um caminho com as variáveis substituídas pelas chaves encontradas em fullPath.
     * @example
     * PathInfo.fillVariables('users/$uid/posts/$postid', 'users/ewout/posts/post1/title') === 'users/ewout/posts/post1'
     */
    static fillVariables(varPath, fullPath) {
        if (varPath.indexOf("*") < 0 && varPath.indexOf("$") < 0) {
            return varPath;
        }
        const keys = getPathKeys(varPath);
        const pathKeys = getPathKeys(fullPath);
        const merged = keys.map((key, index) => {
            if (key === pathKeys[index] || index >= pathKeys.length) {
                return key;
            }
            else if (typeof key === "string" && (key === "*" || key[0] === "$")) {
                return pathKeys[index];
            }
            else {
                throw new Error(`Path "${fullPath}" cannot be used to fill variables of path "${varPath}" because they do not match`);
            }
        });
        let mergedPath = "";
        merged.forEach((key) => {
            if (typeof key === "number") {
                mergedPath += `[${key}]`;
            }
            else {
                if (mergedPath.length > 0) {
                    mergedPath += "/";
                }
                mergedPath += key;
            }
        });
        return mergedPath;
    }
    /**
     * Substitui todas as variáveis em um caminho pelos valores no argumento vars
     * @param varPath caminho contendo variáveis
     * @param vars objeto de variáveis, como aquele obtido a partir de PathInfo.extractVariables
     */
    static fillVariables2(varPath, vars) {
        if (typeof vars !== "object" || Object.keys(vars).length === 0) {
            return varPath; // Nothing to fill
        }
        const pathKeys = getPathKeys(varPath);
        let n = 0;
        const targetPath = pathKeys.reduce((path, key) => {
            if (typeof key === "string" && (key === "*" || key.startsWith("$"))) {
                return PathInfo.getChildPath(path, vars[n++]);
            }
            else {
                return PathInfo.getChildPath(path, key);
            }
        }, "");
        return targetPath;
    }
    /**
     * Verifica se um caminho dado corresponde a este caminho, por exemplo, "posts/*\/title" corresponde a "posts/12344/title" e "users/123/name" corresponde a "users/$uid/name"
     */
    equals(otherPath) {
        const other = otherPath instanceof PathInfo ? otherPath : new PathInfo(otherPath);
        if (this.path === other.path) {
            return true;
        } // they are identical
        if (this.keys.length !== other.keys.length) {
            return false;
        }
        return this.keys.every((key, index) => {
            const otherKey = other.keys[index];
            return otherKey === key || (typeof otherKey === "string" && (otherKey === "*" || otherKey[0] === "$")) || (typeof key === "string" && (key === "*" || key[0] === "$"));
        });
    }
    /**
     * Verifica se um caminho dado é um ancestral, por exemplo, "posts" é um ancestral de "posts/12344/title"
     */
    isAncestorOf(descendantPath) {
        const descendant = descendantPath instanceof PathInfo ? descendantPath : new PathInfo(descendantPath);
        if (descendant.path === "" || this.path === descendant.path) {
            return false;
        }
        if (this.path === "") {
            return true;
        }
        if (this.keys.length >= descendant.keys.length) {
            return false;
        }
        return this.keys.every((key, index) => {
            const otherKey = descendant.keys[index];
            return otherKey === key || (typeof otherKey === "string" && (otherKey === "*" || otherKey[0] === "$")) || (typeof key === "string" && (key === "*" || key[0] === "$"));
        });
    }
    /**
     * Verifica se um caminho dado é um descendente, por exemplo, "posts/1234/title" é um descendente de "posts"
     */
    isDescendantOf(ancestorPath) {
        const ancestor = ancestorPath instanceof PathInfo ? ancestorPath : new PathInfo(ancestorPath);
        if (this.path === "" || this.path === ancestor.path) {
            return false;
        }
        if (ancestorPath === "") {
            return true;
        }
        if (ancestor.keys.length >= this.keys.length) {
            return false;
        }
        return ancestor.keys.every((key, index) => {
            const otherKey = this.keys[index];
            return otherKey === key || (typeof otherKey === "string" && (otherKey === "*" || otherKey[0] === "$")) || (typeof key === "string" && (key === "*" || key[0] === "$"));
        });
    }
    /**
     * Verifica se o outro caminho está na mesma trilha que este caminho. Caminhos estão na mesma trilha se compartilharem um
     * ancestral comum. Por exemplo, "posts" está na trilha de "posts/1234/title" e vice-versa.
     */
    isOnTrailOf(otherPath) {
        const other = otherPath instanceof PathInfo ? otherPath : new PathInfo(otherPath);
        if (this.path.length === 0 || other.path.length === 0) {
            return true;
        }
        if (this.path === other.path) {
            return true;
        }
        return this.pathKeys.every((key, index) => {
            if (index >= other.keys.length) {
                return true;
            }
            const otherKey = other.keys[index];
            return otherKey === key || (typeof otherKey === "string" && (otherKey === "*" || otherKey[0] === "$")) || (typeof key === "string" && (key === "*" || key[0] === "$"));
        });
    }
    /**
     * Verifica se um determinado caminho é um filho direto, por exemplo, "posts/1234/title" é um filho de "posts/1234"
     */
    isChildOf(otherPath) {
        var _a, _b;
        const other = otherPath instanceof PathInfo ? otherPath : new PathInfo(otherPath);
        if (this.path === "") {
            return false;
        } // Se nosso caminho for a raiz, ele não é filho de ninguém...
        return (_b = (_a = this.parent) === null || _a === void 0 ? void 0 : _a.equals(other)) !== null && _b !== void 0 ? _b : false;
    }
    /**
     * Verifica se um determinado caminho é seu pai, por exemplo, "posts/1234" é o pai de "posts/1234/title"
     */
    isParentOf(otherPath) {
        const other = otherPath instanceof PathInfo ? otherPath : new PathInfo(otherPath);
        if (other.path === "" || !other.parent) {
            return false;
        } // Verifica se um determinado caminho é seu pai, por exemplo, "posts/1234" é o pai de "posts/1234/title"
        return this.equals(other.parent);
    }
}
exports.PathInfo = PathInfo;
exports.default = PathInfo;

},{}],43:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaDefinition = void 0;
// parses a typestring, creates checker functions
function parse(definition) {
    // tokenize
    let pos = 0;
    function consumeSpaces() {
        let c;
        while (((c = definition[pos]), [" ", "\r", "\n", "\t"].includes(c))) {
            pos++;
        }
    }
    function consumeCharacter(c) {
        if (definition[pos] !== c) {
            throw new Error(`Unexpected character at position ${pos}. Expected: '${c}', found '${definition[pos]}'`);
        }
        pos++;
    }
    function readProperty() {
        consumeSpaces();
        const prop = { name: "", optional: false, wildcard: false };
        let c;
        while (((c = definition[pos]),
            c === "_" || c === "$" || (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || (prop.name.length > 0 && c >= "0" && c <= "9") || (prop.name.length === 0 && c === "*"))) {
            prop.name += c;
            pos++;
        }
        if (prop.name.length === 0) {
            throw new Error(`Property name expected at position ${pos}, found: ${definition.slice(pos, pos + 10)}..`);
        }
        if (definition[pos] === "?") {
            prop.optional = true;
            pos++;
        }
        if (prop.name === "*" || prop.name[0] === "$") {
            prop.optional = true;
            prop.wildcard = true;
        }
        consumeSpaces();
        consumeCharacter(":");
        return prop;
    }
    function readType() {
        consumeSpaces();
        let type = { typeOf: "any" }, c;
        // try reading simple type first: (string,number,boolean,Date etc)
        let name = "";
        while (((c = definition[pos]), (c >= "a" && c <= "z") || (c >= "A" && c <= "Z"))) {
            name += c;
            pos++;
        }
        if (name.length === 0) {
            if (definition[pos] === "*") {
                // any value
                consumeCharacter("*");
                type.typeOf = "any";
            }
            else if (["'", '"', "`"].includes(definition[pos])) {
                // Read string value
                type.typeOf = "string";
                type.value = "";
                const quote = definition[pos];
                consumeCharacter(quote);
                while (((c = definition[pos]), c && c !== quote)) {
                    type.value += c;
                    pos++;
                }
                consumeCharacter(quote);
            }
            else if (definition[pos] >= "0" && definition[pos] <= "9") {
                // read numeric value
                type.typeOf = "number";
                let nr = "";
                while (((c = definition[pos]), c === "." || c === "n" || (c >= "0" && c <= "9"))) {
                    nr += c;
                    pos++;
                }
                if (nr.endsWith("n")) {
                    type.value = BigInt(nr);
                }
                else if (nr.includes(".")) {
                    type.value = parseFloat(nr);
                }
                else {
                    type.value = parseInt(nr);
                }
            }
            else if (definition[pos] === "{") {
                // Read object (interface) definition
                consumeCharacter("{");
                type.typeOf = "object";
                type.instanceOf = Object;
                // Read children:
                type.children = [];
                while (true) {
                    const prop = readProperty();
                    const types = readTypes();
                    type.children.push({ name: prop.name, optional: prop.optional, wildcard: prop.wildcard, types });
                    consumeSpaces();
                    if (definition[pos] === ";" || definition[pos] === ",") {
                        consumeCharacter(definition[pos]);
                        consumeSpaces();
                    }
                    if (definition[pos] === "}") {
                        break;
                    }
                }
                consumeCharacter("}");
            }
            else if (definition[pos] === "/") {
                // Read regular expression definition
                consumeCharacter("/");
                let pattern = "", flags = "";
                while (((c = definition[pos]), c !== "/" || pattern.endsWith("\\"))) {
                    pattern += c;
                    pos++;
                }
                consumeCharacter("/");
                while (((c = definition[pos]), ["g", "i", "m", "s", "u", "y", "d"].includes(c))) {
                    flags += c;
                    pos++;
                }
                type.typeOf = "string";
                type.matches = new RegExp(pattern, flags);
            }
            else {
                throw new Error(`Expected a type definition at position ${pos}, found character '${definition[pos]}'`);
            }
        }
        else if (["string", "number", "boolean", "bigint", "undefined", "String", "Number", "Boolean", "BigInt"].includes(name)) {
            type.typeOf = name.toLowerCase();
        }
        else if (name === "Object" || name === "object") {
            type.typeOf = "object";
            type.instanceOf = Object;
        }
        else if (name === "Date") {
            type.typeOf = "object";
            type.instanceOf = Date;
        }
        else if (name === "Binary" || name === "binary") {
            type.typeOf = "object";
            type.instanceOf = ArrayBuffer;
        }
        else if (name === "any") {
            type.typeOf = "any";
        }
        else if (name === "null") {
            // This is ignored, null values are not stored in the db (null indicates deletion)
            type.typeOf = "object";
            type.value = null;
        }
        else if (name === "Array") {
            // Read generic Array defintion
            consumeCharacter("<");
            type.typeOf = "object";
            type.instanceOf = Array; //name;
            type.genericTypes = readTypes();
            consumeCharacter(">");
        }
        else if (["true", "false"].includes(name)) {
            type.typeOf = "boolean";
            type.value = name === "true";
        }
        else {
            throw new Error(`Unknown type at position ${pos}: "${type}"`);
        }
        // Check if it's an Array of given type (eg: string[] or string[][])
        // Also converts to generics, string[] becomes Array<string>, string[][] becomes Array<Array<string>>
        consumeSpaces();
        while (definition[pos] === "[") {
            consumeCharacter("[");
            consumeCharacter("]");
            type = { typeOf: "object", instanceOf: Array, genericTypes: [type] };
        }
        return type;
    }
    function readTypes() {
        consumeSpaces();
        const types = [readType()];
        while (definition[pos] === "|") {
            consumeCharacter("|");
            types.push(readType());
            consumeSpaces();
        }
        return types;
    }
    return readType();
}
function checkObject(path, properties, obj, partial) {
    // Are there any properties that should not be in there?
    const invalidProperties = properties.find((prop) => prop.name === "*" || prop.name[0] === "$") // Only if no wildcard properties are allowed
        ? []
        : Object.keys(obj).filter((key) => ![null, undefined].includes(obj[key]) && // Ignore null or undefined values
            !properties.find((prop) => prop.name === key));
    if (invalidProperties.length > 0) {
        return { ok: false, reason: `Object at path "${path}" cannot have propert${invalidProperties.length === 1 ? "y" : "ies"} ${invalidProperties.map((p) => `"${p}"`).join(", ")}` };
    }
    // Loop through properties that should be present
    function checkProperty(property) {
        const hasValue = ![null, undefined].includes(obj[property.name]);
        if (!property.optional && (partial ? obj[property.name] === null : !hasValue)) {
            return { ok: false, reason: `Property at path "${path}/${property.name}" is not optional` };
        }
        if (hasValue && property.types.length === 1) {
            return checkType(`${path}/${property.name}`, property.types[0], obj[property.name], false);
        }
        if (hasValue && !property.types.some((type) => checkType(`${path}/${property.name}`, type, obj[property.name], false).ok)) {
            return { ok: false, reason: `Property at path "${path}/${property.name}" does not match any of ${property.types.length} allowed types` };
        }
        return { ok: true };
    }
    const namedProperties = properties.filter((prop) => !prop.wildcard);
    const failedProperty = namedProperties.find((prop) => !checkProperty(prop).ok);
    if (failedProperty) {
        const reason = checkProperty(failedProperty).reason;
        return { ok: false, reason };
    }
    const wildcardProperty = properties.find((prop) => prop.wildcard);
    if (!wildcardProperty) {
        return { ok: true };
    }
    const wildcardChildKeys = Object.keys(obj).filter((key) => !namedProperties.find((prop) => prop.name === key));
    let result = { ok: true };
    for (let i = 0; i < wildcardChildKeys.length && result.ok; i++) {
        const childKey = wildcardChildKeys[i];
        result = checkProperty({ name: childKey, types: wildcardProperty.types, optional: true, wildcard: true });
    }
    return result;
}
function checkType(path, type, value, partial, trailKeys) {
    const ok = { ok: true };
    if (type.typeOf === "any") {
        return ok;
    }
    if (trailKeys instanceof Array && trailKeys.length > 0) {
        // The value to check resides in a descendant path of given type definition.
        // Recursivly check child type definitions to find a match
        if (type.typeOf !== "object") {
            return { ok: false, reason: `path "${path}" must be typeof ${type.typeOf}` }; // given value resides in a child path, but parent is not allowed be an object.
        }
        if (!type.children) {
            return ok;
        }
        const childKey = trailKeys[0];
        let property = type.children.find((prop) => prop.name === childKey);
        if (!property) {
            property = type.children.find((prop) => prop.name === "*" || prop.name[0] === "$");
        }
        if (!property) {
            return { ok: false, reason: `Object at path "${path}" cannot have property "${childKey}"` };
        }
        if (property.optional && value === null && trailKeys.length === 1) {
            return ok;
        }
        let result = { ok: false, reason: `` };
        property.types.some((type) => {
            const childPath = typeof childKey === "number" ? `${path}[${childKey}]` : `${path}/${childKey}`;
            result = checkType(childPath, type, value, partial, trailKeys.slice(1));
            return result.ok;
        });
        return result;
    }
    if (value === null) {
        return ok;
    }
    if (type.instanceOf === Object && (typeof value !== "object" || value instanceof Array || value instanceof Date)) {
        return { ok: false, reason: `path "${path}" must be an object collection` };
    }
    if (type.instanceOf && (typeof value !== "object" || value.constructor !== type.instanceOf)) {
        // !(value instanceof type.instanceOf) // value.constructor.name !== type.instanceOf
        return { ok: false, reason: `path "${path}" must be an instance of ${type.instanceOf.name}` };
    }
    if ("value" in type && value !== type.value) {
        return { ok: false, reason: `path "${path}" must be value: ${type.value}` };
    }
    if (typeof value !== type.typeOf) {
        return { ok: false, reason: `path "${path}" must be typeof ${type.typeOf}` };
    }
    if (type.instanceOf === Array && type.genericTypes && !value.every((v) => { var _a; return ((_a = type.genericTypes) !== null && _a !== void 0 ? _a : []).some((t) => checkType(path, t, v, false).ok); })) {
        return { ok: false, reason: `every array value of path "${path}" must match one of the specified types` };
    }
    if (type.typeOf === "object" && type.children) {
        return checkObject(path, type.children, value, partial);
    }
    if (type.matches && !type.matches.test(value)) {
        return { ok: false, reason: `path "${path}" must match regular expression /${type.matches.source}/${type.matches.flags}` };
    }
    return ok;
}
// eslint-disable-next-line @typescript-eslint/ban-types
function getConstructorType(val) {
    switch (val) {
        case String:
            return "string";
        case Number:
            return "number";
        case Boolean:
            return "boolean";
        case Date:
            return "Date";
        case BigInt:
            return "bigint";
        case Array:
            throw new Error("Schema error: Array cannot be used without a type. Use string[] or Array<string> instead");
        default:
            throw new Error(`Schema error: unknown type used: ${val.name}`);
    }
}
class SchemaDefinition {
    constructor(definition, handling = { warnOnly: false }) {
        this.handling = handling;
        this.source = definition;
        if (typeof definition === "object") {
            // Turn object into typescript definitions
            // eg:
            // const example = {
            //     name: String,
            //     born: Date,
            //     instrument: "'guitar'|'piano'",
            //     "address?": {
            //         street: String
            //     }
            // };
            // Resulting ts: "{name:string,born:Date,instrument:'guitar'|'piano',address?:{street:string}}"
            const toTS = (obj) => {
                return ("{" +
                    Object.keys(obj)
                        .map((key) => {
                        let val = obj[key];
                        if (val === undefined) {
                            val = "undefined";
                        }
                        else if (val instanceof RegExp) {
                            val = `/${val.source}/${val.flags}`;
                        }
                        else if (typeof val === "object") {
                            val = toTS(val);
                        }
                        else if (typeof val === "function") {
                            val = getConstructorType(val);
                        }
                        else if (!["string", "number", "boolean", "bigint"].includes(typeof val)) {
                            throw new Error(`Type definition for key "${key}" must be a string, number, boolean, bigint, object, regular expression, or one of these classes: String, Number, Boolean, Date, BigInt`);
                        }
                        return `${key}:${val}`;
                    })
                        .join(",") +
                    "}");
            };
            this.text = toTS(definition);
        }
        else if (typeof definition === "string") {
            this.text = definition;
        }
        else {
            throw new Error("Type definiton must be a string or an object");
        }
        this.type = parse(this.text);
    }
    check(path, value, partial, trailKeys) {
        const result = checkType(path, this.type, value, partial, trailKeys);
        if (!result.ok && this.handling.warnOnly) {
            // Only issue a warning, allows schema definitions to be added to a production db to monitor if they are accurate before enforcing them.
            result.warning = `${partial ? "Partial schema" : "Schema"} check on path "${path}"${trailKeys ? ` for child "${trailKeys.join("/")}"` : ""} failed: ${result.reason}`;
            result.ok = true;
            if (typeof this.handling.warnCallback === "function")
                this.handling.warnCallback(result.warning);
        }
        return result;
    }
}
exports.SchemaDefinition = SchemaDefinition;

},{}],44:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"dup":23}],45:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * rxjs is an optional dependency that only needs installing when any of IvipBase's observe methods are used.
 * If for some reason rxjs is not available (eg in test suite), we can provide a shim. This class is used when
 * `db.setObservable("shim")` is called
 */
class SimpleObservable {
    constructor(create) {
        this._active = false;
        this._subscribers = [];
        this._create = create;
    }
    subscribe(subscriber) {
        if (!this._active) {
            const next = (value) => {
                // emit value to all subscribers
                this._subscribers.forEach((s) => {
                    try {
                        s(value);
                    }
                    catch (err) {
                        console.error("Error in subscriber callback:", err);
                    }
                });
            };
            const observer = { next };
            this._cleanup = this._create(observer);
            this._active = true;
        }
        this._subscribers.push(subscriber);
        const unsubscribe = () => {
            this._subscribers.splice(this._subscribers.indexOf(subscriber), 1);
            if (this._subscribers.length === 0) {
                this._active = false;
                this._cleanup();
            }
        };
        const subscription = {
            unsubscribe,
        };
        return subscription;
    }
}
exports.default = SimpleObservable;

},{}],46:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventStream = exports.EventPublisher = exports.EventSubscription = void 0;
class EventSubscription {
    /**
     * @param stop function that stops the subscription from receiving future events
     */
    constructor(stop) {
        this.stop = stop;
        this._internal = {
            state: "init",
            activatePromises: [],
        };
    }
    /**
     * Notifies when subscription is activated or canceled
     * @param callback optional callback to run each time activation state changes
     * @returns returns a promise that resolves once activated, or rejects when it is denied (and no callback was supplied)
     */
    activated(callback) {
        if (callback) {
            this._internal.activatePromises.push({ callback });
            if (this._internal.state === "active") {
                callback(true);
            }
            else if (this._internal.state === "canceled") {
                callback(false, this._internal.cancelReason);
            }
        }
        // Changed behaviour: now also returns a Promise when the callback is used.
        // This allows for 1 activated call to both handle: first activation result,
        // and any future events using the callback
        return new Promise((resolve, reject) => {
            if (this._internal.state === "active") {
                return resolve();
            }
            else if (this._internal.state === "canceled" && !callback) {
                return reject(new Error(this._internal.cancelReason));
            }
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            const noop = () => { };
            this._internal.activatePromises.push({
                resolve,
                reject: callback ? noop : reject, // Don't reject when callback is used: let callback handle this (prevents UnhandledPromiseRejection if only callback is used)
            });
        });
    }
    /** (for internal use) */
    _setActivationState(activated, cancelReason) {
        this._internal.cancelReason = cancelReason;
        this._internal.state = activated ? "active" : "canceled";
        while (this._internal.activatePromises.length > 0) {
            const p = this._internal.activatePromises.shift();
            if (p && activated) {
                p.callback && p.callback(true);
                p.resolve && p.resolve();
            }
            else if (p) {
                p.callback && p.callback(false, cancelReason);
                p.reject && p.reject(cancelReason);
            }
        }
    }
}
exports.EventSubscription = EventSubscription;
class EventPublisher {
    /**
     *
     * @param publish function that publishes a new value to subscribers, return if there are any active subscribers
     * @param start function that notifies subscribers their subscription is activated
     * @param cancel function that notifies subscribers their subscription has been canceled, removes all subscriptions
     */
    constructor(publish, start, cancel) {
        this.publish = publish;
        this.start = start;
        this.cancel = cancel;
    }
}
exports.EventPublisher = EventPublisher;
class EventStream {
    constructor(eventPublisherCallback) {
        const subscribers = [];
        let noMoreSubscribersCallback;
        let activationState; // TODO: refactor to string only: STATE_INIT, STATE_STOPPED, STATE_ACTIVATED, STATE_CANCELED
        const STATE_STOPPED = "stopped (no more subscribers)";
        this.subscribe = (callback, activationCallback) => {
            if (typeof callback !== "function") {
                throw new TypeError("callback must be a function");
            }
            else if (activationState === STATE_STOPPED) {
                throw new Error("stream can't be used anymore because all subscribers were stopped");
            }
            const sub = {
                callback,
                activationCallback: function (activated, cancelReason) {
                    activationCallback === null || activationCallback === void 0 ? void 0 : activationCallback(activated, cancelReason);
                    this.subscription._setActivationState(activated, cancelReason);
                },
                subscription: new EventSubscription(function stop() {
                    subscribers.splice(subscribers.indexOf(sub), 1);
                    return checkActiveSubscribers();
                }),
            };
            subscribers.push(sub);
            if (typeof activationState !== "undefined") {
                if (activationState === true) {
                    activationCallback === null || activationCallback === void 0 ? void 0 : activationCallback(true);
                    sub.subscription._setActivationState(true);
                }
                else if (typeof activationState === "string") {
                    activationCallback === null || activationCallback === void 0 ? void 0 : activationCallback(false, activationState);
                    sub.subscription._setActivationState(false, activationState);
                }
            }
            return sub.subscription;
        };
        const checkActiveSubscribers = () => {
            let ret;
            if (subscribers.length === 0) {
                ret = noMoreSubscribersCallback === null || noMoreSubscribersCallback === void 0 ? void 0 : noMoreSubscribersCallback();
                activationState = STATE_STOPPED;
            }
            return Promise.resolve(ret);
        };
        this.unsubscribe = (callback) => {
            const remove = callback
                ? subscribers.filter((sub) => sub.callback === callback)
                : subscribers;
            remove.forEach((sub) => {
                const i = subscribers.indexOf(sub);
                subscribers.splice(i, 1);
            });
            checkActiveSubscribers();
        };
        this.stop = () => {
            // Stop (remove) all subscriptions
            subscribers.splice(0);
            checkActiveSubscribers();
        };
        /**
         * For publishing side: adds a value that will trigger callbacks to all subscribers
         * @param val
         * @returns returns whether there are subscribers left
         */
        const publish = (val) => {
            subscribers.forEach((sub) => {
                try {
                    sub.callback(val);
                }
                catch (err) {
                    console.error(`Error running subscriber callback: ${err.message}`);
                }
            });
            if (subscribers.length === 0) {
                checkActiveSubscribers();
            }
            return subscribers.length > 0;
        };
        /**
         * For publishing side: let subscribers know their subscription is activated. Should be called only once
         */
        const start = (allSubscriptionsStoppedCallback) => {
            activationState = true;
            noMoreSubscribersCallback = allSubscriptionsStoppedCallback;
            subscribers.forEach((sub) => {
                var _a;
                (_a = sub.activationCallback) === null || _a === void 0 ? void 0 : _a.call(sub, true);
            });
        };
        /**
         * For publishing side: let subscribers know their subscription has been canceled. Should be called only once
         */
        const cancel = (reason) => {
            activationState = reason;
            subscribers.forEach((sub) => {
                var _a;
                (_a = sub.activationCallback) === null || _a === void 0 ? void 0 : _a.call(sub, false, reason || new Error("unknown reason"));
            });
            subscribers.splice(0); // Clear all
        };
        const publisher = new EventPublisher(publish, start, cancel);
        eventPublisherCallback(publisher);
    }
}
exports.EventStream = EventStream;

},{}],47:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deserialize2 = exports.serialize2 = exports.serialize = exports.detectSerializeVersion = exports.deserialize = void 0;
const Ascii85_1 = __importDefault(require("./Ascii85"));
const PartialArray_1 = require("./PartialArray");
const PathInfo_1 = __importStar(require("./PathInfo"));
const Utils_1 = require("./Utils");
/*
    There are now 2 different serialization methods for transporting values.

    v1:
    The original version (v1) created an object with "map" and "val" properties.
    The "map" property was made optional in v1.14.1 so they won't be present for values needing no serializing

    v2:
    The new version replaces serialized values inline by objects containing ".type" and ".val" properties.
    This serializing method was introduced by `export` and `import` methods because they use streaming and
    are unable to prepare type mappings up-front. This format is smaller in transmission (in many cases),
    and easier to read and process.

    original: { "date": (some date) }
    v1 serialized: { "map": { "date": "date" }, "val": { date: "2022-04-22T07:49:23Z" } }
    v2 serialized: { "date": { ".type": "date", ".val": "2022-04-22T07:49:23Z" } }

    original: (some date)
    v1 serialized: { "map": "date", "val": "2022-04-22T07:49:23Z" }
    v2 serialized: { ".type": "date", ".val": "2022-04-22T07:49:23Z" }
    comment: top level value that need serializing is wrapped in an object with ".type" and ".val". v1 is smaller in this case

    original: 'some string'
    v1 serialized: { "map": {}, "val": "some string" }
    v2 serialized: "some string"
    comment: primitive types such as strings don't need serializing and are returned as is in v2

    original: { "date": (some date), "text": "Some string" }
    v1 serialized: { "map": { "date": "date" }, "val": { date: "2022-04-22T07:49:23Z", "text": "Some string" } }
    v2 serialized: { "date": { ".type": "date", ".val": "2022-04-22T07:49:23Z" }, "text": "Some string" }
*/
/**
 * Original deserialization method using global `map` and `val` properties
 * @param data
 * @returns
 */
const deserialize = (data) => {
    if (data.map === null || typeof data.map === "undefined") {
        if (typeof data.val === "undefined") {
            throw new Error("serialized value must have a val property");
        }
        return data.val;
    }
    const deserializeValue = (type, val) => {
        if (type === "date") {
            // Date was serialized as a string (UTC)
            return new Date(val);
        }
        else if (type === "binary") {
            // ascii85 encoded binary data
            return Ascii85_1.default.decode(val);
        }
        else if (type === "reference") {
            return new PathInfo_1.PathReference(val);
        }
        else if (type === "regexp") {
            return new RegExp(val.pattern, val.flags);
        }
        else if (type === "array") {
            return new PartialArray_1.PartialArray(val);
        }
        else if (type === "bigint") {
            return BigInt(val);
        }
        return val;
    };
    if (typeof data.map === "string") {
        // Single value
        return deserializeValue(data.map, data.val);
    }
    Object.keys(data.map).forEach((path) => {
        const type = data.map[path];
        const keys = PathInfo_1.default.getPathKeys(path);
        let parent = data;
        let key = "val";
        let val = data.val;
        keys.forEach((k) => {
            key = k;
            parent = val;
            val = val[key]; // If an error occurs here, there's something wrong with the calling code...
        });
        parent[key] = deserializeValue(type, val);
    });
    return data.val;
};
exports.deserialize = deserialize;
/**
 * Function to detect the used serialization method with for the given object
 * @param data
 * @returns
 */
const detectSerializeVersion = (data) => {
    if (typeof data !== "object" || data === null) {
        // This can only be v2, which allows primitive types to bypass serializing
        return 2;
    }
    if ("map" in data && "val" in data) {
        return 1;
    }
    else if ("val" in data) {
        // If it's v1, 'val' will be the only key in the object because serialize2 adds ".version": 2 to the object to prevent confusion.
        if (Object.keys(data).length > 1) {
            return 2;
        }
        return 1;
    }
    return 2;
};
exports.detectSerializeVersion = detectSerializeVersion;
/**
 * Original serialization method using global `map` and `val` properties
 * @param data
 * @returns
 */
const serialize = (obj) => {
    var _a;
    // Recursively find dates and binary data
    if (obj === null || typeof obj !== "object" || obj instanceof Date || obj instanceof ArrayBuffer || obj instanceof PathInfo_1.PathReference || obj instanceof RegExp) {
        // Single value
        const ser = (0, exports.serialize)({ value: obj });
        return {
            map: (_a = ser.map) === null || _a === void 0 ? void 0 : _a.value,
            val: ser.val.value,
        };
    }
    obj = (0, Utils_1.cloneObject)(obj); // Make sure we don't alter the original object
    const process = (obj, mappings, prefix) => {
        if (obj instanceof PartialArray_1.PartialArray) {
            mappings[prefix] = "array";
        }
        Object.keys(obj).forEach((key) => {
            const val = obj[key];
            const path = prefix.length === 0 ? key : `${prefix}/${key}`;
            if (typeof val === "bigint") {
                obj[key] = val.toString();
                mappings[path] = "bigint";
            }
            else if (val instanceof Date) {
                // serialize date to UTC string
                obj[key] = val.toISOString();
                mappings[path] = "date";
            }
            else if (val instanceof ArrayBuffer) {
                // Serialize binary data with ascii85
                obj[key] = Ascii85_1.default.encode(val); //ascii85.encode(Buffer.from(val)).toString();
                mappings[path] = "binary";
            }
            else if (val instanceof PathInfo_1.PathReference) {
                obj[key] = val.path;
                mappings[path] = "reference";
            }
            else if (val instanceof RegExp) {
                // Queries using the 'matches' filter with a regular expression can now also be used on remote db's
                obj[key] = { pattern: val.source, flags: val.flags };
                mappings[path] = "regexp";
            }
            else if (typeof val === "object" && val !== null) {
                process(val, mappings, path);
            }
        });
    };
    const mappings = {};
    process(obj, mappings, "");
    const serialized = { val: obj };
    if (Object.keys(mappings).length > 0) {
        serialized.map = mappings;
    }
    return serialized;
};
exports.serialize = serialize;
/**
 * New serialization method using inline `.type` and `.val` properties
 * @param obj
 * @returns
 */
const serialize2 = (obj) => {
    // Recursively find data that needs serializing
    const getSerializedValue = (val) => {
        if (typeof val === "bigint") {
            // serialize bigint to string
            return {
                ".type": "bigint",
                ".val": val.toString(),
            };
        }
        else if (val instanceof Date) {
            // serialize date to UTC string
            return {
                ".type": "date",
                ".val": val.toISOString(),
            };
        }
        else if (val instanceof ArrayBuffer) {
            // Serialize binary data with ascii85
            return {
                ".type": "binary",
                ".val": Ascii85_1.default.encode(val),
            };
        }
        else if (val instanceof PathInfo_1.PathReference) {
            return {
                ".type": "reference",
                ".val": val.path,
            };
        }
        else if (val instanceof RegExp) {
            // Queries using the 'matches' filter with a regular expression can now also be used on remote db's
            return {
                ".type": "regexp",
                ".val": `/${val.source}/${val.flags}`, // new: shorter
                // '.val': {
                //     pattern: val.source,
                //     flags: val.flags
                // }
            };
        }
        else if (typeof val === "object" && val !== null) {
            if (val instanceof Array) {
                const copy = [];
                for (let i = 0; i < val.length; i++) {
                    copy[i] = getSerializedValue(val[i]);
                }
                return copy;
            }
            else {
                const copy = {}; //val instanceof Array ? [] : {} as SerializedValueV2;
                if (val instanceof PartialArray_1.PartialArray) {
                    // Mark the object as partial ("sparse") array
                    copy[".type"] = "array";
                }
                for (const prop in val) {
                    copy[prop] = getSerializedValue(val[prop]);
                }
                return copy;
            }
        }
        else {
            // Primitive value. Don't serialize
            return val;
        }
    };
    const serialized = getSerializedValue(obj);
    if (serialized !== null && typeof serialized === "object" && "val" in serialized && Object.keys(serialized).length === 1) {
        // acebase-core v1.14.1 made the 'map' property optional.
        // This v2 serialized object might be confused with a v1 without mappings, because it only has a "val" property
        // To prevent this, mark the serialized object with version 2
        serialized[".version"] = 2;
    }
    return serialized;
};
exports.serialize2 = serialize2;
/**
 * New deserialization method using inline `.type` and `.val` properties
 * @param obj
 * @returns
 */
const deserialize2 = (data) => {
    if (typeof data !== "object" || data === null) {
        // primitive value, not serialized
        return data;
    }
    if (typeof data[".type"] === "undefined") {
        // No type given: this is a plain object or array
        if (data instanceof Array) {
            // Plain array, deserialize items into a copy
            const copy = [];
            const arr = data;
            for (let i = 0; i < arr.length; i++) {
                copy.push((0, exports.deserialize2)(arr[i]));
            }
            return copy;
        }
        else {
            // Plain object, deserialize properties into a copy
            const copy = {};
            const obj = data;
            for (const prop in obj) {
                copy[prop] = (0, exports.deserialize2)(obj[prop]);
            }
            return copy;
        }
    }
    else if (typeof data[".type"] === "string") {
        const dataType = data[".type"].toLowerCase();
        if (dataType === "bigint") {
            const val = data[".val"];
            return BigInt(val);
        }
        else if (dataType === "array") {
            // partial ("sparse") array, deserialize children into a copy
            const arr = data;
            const copy = {};
            for (const index in arr) {
                copy[index] = (0, exports.deserialize2)(arr[index]);
            }
            delete copy[".type"];
            return new PartialArray_1.PartialArray(copy);
        }
        else if (dataType === "date") {
            // Date was serialized as a string (UTC)
            const val = data[".val"];
            return new Date(val);
        }
        else if (dataType === "binary") {
            // ascii85 encoded binary data
            const val = data[".val"];
            return Ascii85_1.default.decode(val);
        }
        else if (dataType === "reference") {
            const val = data[".val"];
            return new PathInfo_1.PathReference(val);
        }
        else if (dataType === "regexp") {
            const val = data[".val"];
            if (typeof val === "string") {
                // serialized as '/(pattern)/flags'
                const match = /^\/(.*)\/([a-z]+)$/.exec(val);
                return match ? new RegExp(match[1], match[2]) : null;
            }
            // serialized as object with pattern & flags properties
            return new RegExp(val.pattern, val.flags);
        }
    }
    throw new Error(`Unknown data type "${data[".type"]}" in serialized value`);
};
exports.deserialize2 = deserialize2;

},{"./Ascii85":35,"./PartialArray":41,"./PathInfo":42,"./Utils":49}],48:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Utils_1 = require("./Utils");
const PathInfo_1 = __importDefault(require("./PathInfo"));
const reference_1 = require("../DataBase/reference");
const snapshot_1 = require("../DataBase/snapshot");
/**
 * (for internal use) - gets the mapping set for a specific path
 */
function get(mappings, path) {
    // path points to the mapped (object container) location
    path = path.replace(/^\/|\/$/g, ""); // trim slashes
    const keys = PathInfo_1.default.getPathKeys(path);
    const mappedPath = Object.keys(mappings).find((mpath) => {
        const mkeys = PathInfo_1.default.getPathKeys(mpath);
        if (mkeys.length !== keys.length) {
            return false; // Can't be a match
        }
        return mkeys.every((mkey, index) => {
            if (mkey === "*" || (typeof mkey === "string" && mkey[0] === "$")) {
                return true; // wildcard
            }
            return mkey === keys[index];
        });
    });
    if (!mappedPath)
        return;
    const mapping = mappings[mappedPath];
    return mapping;
}
/**
 * (for internal use) - gets the mapping set for a specific path's parent
 */
function map(mappings, path) {
    // path points to the object location, its parent should have the mapping
    const targetPath = PathInfo_1.default.get(path).parentPath;
    if (targetPath === null) {
        return;
    }
    return get(mappings, targetPath);
}
/**
 * (for internal use) - gets all mappings set for a specific path and all subnodes
 * @returns returns array of all matched mappings in path
 */
function mapDeep(mappings, entryPath) {
    // returns mapping for this node, and all mappings for nested nodes
    // entryPath: "users/ewout"
    // mappingPath: "users"
    // mappingPath: "users/*/posts"
    entryPath = entryPath.replace(/^\/|\/$/g, ""); // trim slashes
    // Start with current path's parent node
    const pathInfo = PathInfo_1.default.get(entryPath);
    const startPath = pathInfo.parentPath;
    const keys = startPath ? PathInfo_1.default.getPathKeys(startPath) : [];
    // Every path that starts with startPath, is a match
    // TODO: refactor to return Object.keys(mappings),filter(...)
    const matches = Object.keys(mappings).reduce((m, mpath) => {
        //const mkeys = mpath.length > 0 ? mpath.split("/") : [];
        const mkeys = PathInfo_1.default.getPathKeys(mpath);
        if (mkeys.length < keys.length) {
            return m; // Can't be a match
        }
        let isMatch = true;
        if (keys.length === 0 && startPath !== null) {
            // Only match first node's children if mapping pattern is "*" or "$variable"
            isMatch = mkeys.length === 1 && (mkeys[0] === "*" || (typeof mkeys[0] === "string" && mkeys[0][0] === "$"));
        }
        else {
            mkeys.every((mkey, index) => {
                if (index >= keys.length) {
                    return false; // stop .every loop
                }
                else if (mkey === "*" || (typeof mkey === "string" && mkey[0] === "$") || mkey === keys[index]) {
                    return true; // continue .every loop
                }
                else {
                    isMatch = false;
                    return false; // stop .every loop
                }
            });
        }
        if (isMatch) {
            const mapping = mappings[mpath];
            m.push({ path: mpath, type: mapping });
        }
        return m;
    }, []);
    return matches;
}
/**
 * (for internal use) - serializes or deserializes an object using type mappings
 * @returns returns the (de)serialized value
 */
function process(db, mappings, path, obj, action) {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }
    const keys = PathInfo_1.default.getPathKeys(path); // path.length > 0 ? path.split("/") : [];
    const m = mapDeep(mappings, path);
    const changes = [];
    m.sort((a, b) => (PathInfo_1.default.getPathKeys(a.path).length > PathInfo_1.default.getPathKeys(b.path).length ? -1 : 1)); // Deepest paths first
    m.forEach((mapping) => {
        const mkeys = PathInfo_1.default.getPathKeys(mapping.path); //mapping.path.length > 0 ? mapping.path.split("/") : [];
        mkeys.push("*");
        const mTrailKeys = mkeys.slice(keys.length);
        if (mTrailKeys.length === 0) {
            const vars = PathInfo_1.default.extractVariables(mapping.path, path);
            const ref = new reference_1.DataReference(db, path, vars);
            if (action === "serialize") {
                // serialize this object
                obj = mapping.type.serialize(obj, ref);
            }
            else if (action === "deserialize") {
                // deserialize this object
                const snap = new snapshot_1.DataSnapshot(ref, obj);
                obj = mapping.type.deserialize(snap);
            }
            return;
        }
        // Find all nested objects at this trail path
        const process = (parentPath, parent, keys) => {
            if (obj === null || typeof obj !== "object") {
                return obj;
            }
            const key = keys[0];
            let children = [];
            if (key === "*" || (typeof key === "string" && key[0] === "$")) {
                // Include all children
                if (parent instanceof Array) {
                    children = parent.map((val, index) => ({
                        key: index,
                        val,
                    }));
                }
                else {
                    children = Object.keys(parent).map((k) => ({
                        key: k,
                        val: parent[k],
                    }));
                }
            }
            else {
                // Get the 1 child
                const child = parent[key];
                if (typeof child === "object") {
                    children.push({ key, val: child });
                }
            }
            children.forEach((child) => {
                const childPath = PathInfo_1.default.getChildPath(parentPath, child.key);
                const vars = PathInfo_1.default.extractVariables(mapping.path, childPath);
                const ref = new reference_1.DataReference(db, childPath, vars);
                if (keys.length === 1) {
                    // TODO: this alters the existing object, we must build our own copy!
                    if (action === "serialize") {
                        // serialize this object
                        changes.push({
                            parent,
                            key: child.key,
                            original: parent[child.key],
                        });
                        parent[child.key] = mapping.type.serialize(child.val, ref);
                    }
                    else if (action === "deserialize") {
                        // deserialize this object
                        const snap = new snapshot_1.DataSnapshot(ref, child.val);
                        parent[child.key] = mapping.type.deserialize(snap);
                    }
                }
                else {
                    // Dig deeper
                    process(childPath, child.val, keys.slice(1));
                }
            });
        };
        process(path, obj, mTrailKeys);
    });
    if (action === "serialize") {
        // Clone this serialized object so any types that remained
        // will become plain objects without functions, and we can restore
        // the original object's values if any mappings were processed.
        // This will also prevent circular references
        obj = (0, Utils_1.cloneObject)(obj);
        if (changes.length > 0) {
            // Restore the changes made to the original object
            changes.forEach((change) => {
                change.parent[change.key] = change.original;
            });
        }
    }
    return obj;
}
const _mappings = Symbol("mappings");
class TypeMappings {
    constructor(db) {
        this.db = db;
        this[_mappings] = {};
    }
    /** (for internal use) */
    get mappings() {
        return this[_mappings];
    }
    /** (for internal use) */
    map(path) {
        return map(this[_mappings], path);
    }
    /**
     * Maps objects that are stored in a specific path to a class, so they can automatically be
     * serialized when stored to, and deserialized (instantiated) when loaded from the database.
     * @param path path to an object container, eg "users" or "users/*\/posts"
     * @param type class to bind all child objects of path to
     * Best practice is to implement 2 methods for instantiation and serializing of your objects:
     * 1) `static create(snap: DataSnapshot)` and 2) `serialize(ref: DataReference)`. See example
     * @param options (optional) You can specify the functions to use to
     * serialize and/or instantiate your class. If you do not specificy a creator (constructor) method,
     * IvipBase will call `YourClass.create(snapshot)` method if it exists, or create an instance of
     * YourClass with `new YourClass(snapshot)`.
     * If you do not specifiy a serializer method, IvipBase will call `YourClass.prototype.serialize(ref)`
     * if it exists, or tries storing your object's fields unaltered. NOTE: `this` in your creator
     * function will point to `YourClass`, and `this` in your serializer function will point to the
     * `instance` of `YourClass`.
     * @example
     * class User {
     *    static create(snap: DataSnapshot): User {
     *        // Deserialize (instantiate) User from plain database object
     *        let user = new User();
     *        Object.assign(user, snap.val()); // Copy all properties to user
     *        user.id = snap.ref.key; // Add the key as id
     *        return user;
     *    }
     *    serialize(ref: DataReference) {
     *        // Serialize user for database storage
     *        return {
     *            name: this.name
     *            email: this.email
     *        };
     *    }
     * }
     * db.types.bind('users', User); // Automatically uses serialize and static create methods
     */
    bind(path, type, options = {}) {
        // Maps objects that are stored in a specific path to a constructor method,
        // so they are automatically deserialized
        if (typeof path !== "string") {
            throw new TypeError("path must be a string");
        }
        if (typeof type !== "function") {
            throw new TypeError("constructor must be a function");
        }
        if (typeof options.serializer === "undefined") {
            // if (typeof type.prototype.serialize === 'function') {
            //     // Use .serialize instance method
            //     options.serializer = type.prototype.serialize;
            // }
            // Use object's serialize method upon serialization (if available)
        }
        else if (typeof options.serializer === "string") {
            if (typeof type.prototype[options.serializer] === "function") {
                options.serializer = type.prototype[options.serializer];
            }
            else {
                throw new TypeError(`${type.name}.prototype.${options.serializer} is not a function, cannot use it as serializer`);
            }
        }
        else if (typeof options.serializer !== "function") {
            throw new TypeError(`serializer for class ${type.name} must be a function, or the name of a prototype method`);
        }
        if (typeof options.creator === "undefined") {
            if (typeof type.create === "function") {
                // Use static .create as creator method
                options.creator = type.create;
            }
        }
        else if (typeof options.creator === "string") {
            if (typeof type[options.creator] === "function") {
                options.creator = type[options.creator];
            }
            else {
                throw new TypeError(`${type.name}.${options.creator} is not a function, cannot use it as creator`);
            }
        }
        else if (typeof options.creator !== "function") {
            throw new TypeError(`creator for class ${type.name} must be a function, or the name of a static method`);
        }
        path = path.replace(/^\/|\/$/g, ""); // trim slashes
        this[_mappings][path] = {
            db: this.db,
            type,
            creator: options.creator,
            serializer: options.serializer,
            deserialize(snap) {
                // run constructor method
                let obj;
                if (this.creator) {
                    obj = this.creator.call(this.type, snap);
                }
                else {
                    obj = new this.type(snap);
                }
                return obj;
            },
            serialize(obj, ref) {
                if (this.serializer) {
                    obj = this.serializer.call(obj, ref, obj);
                }
                else if (obj && typeof obj.serialize === "function") {
                    obj = obj.serialize(ref, obj);
                }
                return obj;
            },
        };
    }
    /**
     * @internal (for internal use)
     * Serializes any child in given object that has a type mapping
     * @param path | path to the object's location
     * @param obj object to serialize
     */
    serialize(path, obj) {
        return process(this.db, this[_mappings], path, obj, "serialize");
    }
    /**
     * @internal (for internal use)
     * Deserialzes any child in given object that has a type mapping
     * @param path path to the object's location
     * @param obj object to deserialize
     */
    deserialize(path, obj) {
        return process(this.db, this[_mappings], path, obj, "deserialize");
    }
}
exports.default = TypeMappings;

},{"../DataBase/reference":33,"../DataBase/snapshot":34,"./PathInfo":42,"./Utils":49}],49:[function(require,module,exports){
(function (global,Buffer){(function (){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uuidv4 = exports.deepEqual = exports.isEmpty = exports.safeGet = exports.contains = exports.getGlobalObject = exports.defer = exports.getChildValues = exports.getMutations = exports.compareValues = exports.isDate = exports.ObjectDifferences = exports.valuesAreEqual = exports.cloneObject = exports.concatTypedArrays = exports.decodeString = exports.encodeString = exports.bytesToBigint = exports.bigintToBytes = exports.bytesToNumber = exports.numberToBytes = void 0;
const PathInfo_1 = require("./PathInfo");
const PartialArray_1 = require("./PartialArray");
const process_1 = __importDefault(require("../process"));
function numberToBytes(number) {
    const bytes = new Uint8Array(8);
    const view = new DataView(bytes.buffer);
    view.setFloat64(0, number);
    return new Array(...bytes);
}
exports.numberToBytes = numberToBytes;
function bytesToNumber(bytes) {
    const length = Array.isArray(bytes) ? bytes.length : bytes.byteLength;
    if (length !== 8) {
        throw new TypeError("must be 8 bytes");
    }
    const bin = new Uint8Array(bytes);
    const view = new DataView(bin.buffer);
    const nr = view.getFloat64(0);
    return nr;
}
exports.bytesToNumber = bytesToNumber;
const hasBigIntSupport = (() => {
    try {
        return typeof BigInt(0) === "bigint";
    }
    catch (err) {
        return false;
    }
})();
const noBigIntError = "BigInt is not supported on this platform";
const bigIntFunctions = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    bigintToBytes(number) {
        throw new Error(noBigIntError);
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    bytesToBigint(bytes) {
        throw new Error(noBigIntError);
    },
};
if (hasBigIntSupport) {
    const big = {
        zero: BigInt(0),
        one: BigInt(1),
        two: BigInt(2),
        eight: BigInt(8),
        ff: BigInt(0xff),
    };
    bigIntFunctions.bigintToBytes = function bigintToBytes(number) {
        if (typeof number !== "bigint") {
            throw new Error("number must be a bigint");
        }
        const bytes = [];
        const negative = number < big.zero;
        do {
            const byte = Number(number & big.ff); // NOTE: bits are inverted on negative numbers
            bytes.push(byte);
            number = number >> big.eight;
        } while (number !== (negative ? -big.one : big.zero));
        bytes.reverse(); // little-endian
        if (negative ? bytes[0] < 128 : bytes[0] >= 128) {
            bytes.unshift(negative ? 255 : 0); // extra sign byte needed
        }
        return bytes;
    };
    bigIntFunctions.bytesToBigint = function bytesToBigint(bytes) {
        const negative = bytes[0] >= 128;
        let number = big.zero;
        for (let b of bytes) {
            if (negative) {
                b = ~b & 0xff;
            } // Invert the bits
            number = (number << big.eight) + BigInt(b);
        }
        if (negative) {
            number = -(number + big.one);
        }
        return number;
    };
}
exports.bigintToBytes = bigIntFunctions.bigintToBytes;
exports.bytesToBigint = bigIntFunctions.bytesToBigint;
/**
 * Converts a string to a utf-8 encoded Uint8Array
 */
function encodeString(str) {
    if (typeof TextEncoder !== "undefined") {
        // Modern browsers, Node.js v11.0.0+ (or v8.3.0+ with util.TextEncoder)
        const encoder = new TextEncoder();
        return encoder.encode(str);
    }
    else if (typeof Buffer === "function") {
        // Node.js
        const buf = Buffer.from(str, "utf-8");
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    else {
        // Older browsers. Manually encode
        const arr = [];
        for (let i = 0; i < str.length; i++) {
            let code = str.charCodeAt(i);
            if (code > 128) {
                // Attempt simple UTF-8 conversion. See https://en.wikipedia.org/wiki/UTF-8
                if ((code & 0xd800) === 0xd800) {
                    // code starts with 1101 10...: this is a 2-part utf-16 char code
                    const nextCode = str.charCodeAt(i + 1);
                    if ((nextCode & 0xdc00) !== 0xdc00) {
                        // next code must start with 1101 11...
                        throw new Error("follow-up utf-16 character does not start with 0xDC00");
                    }
                    i++;
                    const p1 = code & 0x3ff; // Only use last 10 bits
                    const p2 = nextCode & 0x3ff;
                    // Create code point from these 2: (see https://en.wikipedia.org/wiki/UTF-16)
                    code = 0x10000 | (p1 << 10) | p2;
                }
                if (code < 2048) {
                    // Use 2 bytes for 11 bit value, first byte starts with 110xxxxx (0xc0), 2nd byte with 10xxxxxx (0x80)
                    const b1 = 0xc0 | ((code >> 6) & 0x1f); // 0xc0 = 11000000, 0x1f = 11111
                    const b2 = 0x80 | (code & 0x3f); // 0x80 = 10000000, 0x3f = 111111
                    arr.push(b1, b2);
                }
                else if (code < 65536) {
                    // Use 3 bytes for 16-bit value, bits per byte: 4, 6, 6
                    const b1 = 0xe0 | ((code >> 12) & 0xf); // 0xe0 = 11100000, 0xf = 1111
                    const b2 = 0x80 | ((code >> 6) & 0x3f); // 0x80 = 10000000, 0x3f = 111111
                    const b3 = 0x80 | (code & 0x3f);
                    arr.push(b1, b2, b3);
                }
                else if (code < 2097152) {
                    // Use 4 bytes for 21-bit value, bits per byte: 3, 6, 6, 6
                    const b1 = 0xf0 | ((code >> 18) & 0x7); // 0xf0 = 11110000, 0x7 = 111
                    const b2 = 0x80 | ((code >> 12) & 0x3f); // 0x80 = 10000000, 0x3f = 111111
                    const b3 = 0x80 | ((code >> 6) & 0x3f); // 0x80 = 10000000, 0x3f = 111111
                    const b4 = 0x80 | (code & 0x3f);
                    arr.push(b1, b2, b3, b4);
                }
                else {
                    throw new Error(`Cannot convert character ${str.charAt(i)} (code ${code}) to utf-8`);
                }
            }
            else {
                arr.push(code < 128 ? code : 63); // 63 = ?
            }
        }
        return new Uint8Array(arr);
    }
}
exports.encodeString = encodeString;
/**
 * Converts a utf-8 encoded buffer to string
 */
function decodeString(buffer) {
    // ArrayBuffer|
    if (typeof TextDecoder !== "undefined") {
        // Modern browsers, Node.js v11.0.0+ (or v8.3.0+ with util.TextDecoder)
        const decoder = new TextDecoder();
        if (buffer instanceof Uint8Array) {
            return decoder.decode(buffer);
        }
        const buf = Uint8Array.from(buffer);
        return decoder.decode(buf);
    }
    else if (typeof Buffer === "function") {
        // Node.js (v10 and below)
        if (buffer instanceof Array) {
            buffer = Uint8Array.from(buffer); // convert to typed array
        }
        if (!(buffer instanceof Buffer) && "buffer" in buffer && buffer.buffer instanceof ArrayBuffer) {
            const typedArray = buffer;
            buffer = Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength); // Convert typed array to node.js Buffer
        }
        if (!(buffer instanceof Buffer)) {
            throw new Error("Unsupported buffer argument");
        }
        return buffer.toString("utf-8");
    }
    else {
        // Older browsers. Manually decode!
        if (!(buffer instanceof Uint8Array) && "buffer" in buffer && buffer["buffer"] instanceof ArrayBuffer) {
            // Convert TypedArray to Uint8Array
            const typedArray = buffer;
            buffer = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
        }
        if (buffer instanceof Buffer || buffer instanceof Array || buffer instanceof Uint8Array) {
            let str = "";
            for (let i = 0; i < buffer.length; i++) {
                let code = buffer[i];
                if (code > 128) {
                    // Decode Unicode character
                    if ((code & 0xf0) === 0xf0) {
                        // 4 byte char
                        const b1 = code, b2 = buffer[i + 1], b3 = buffer[i + 2], b4 = buffer[i + 3];
                        code = ((b1 & 0x7) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f);
                        i += 3;
                    }
                    else if ((code & 0xe0) === 0xe0) {
                        // 3 byte char
                        const b1 = code, b2 = buffer[i + 1], b3 = buffer[i + 2];
                        code = ((b1 & 0xf) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
                        i += 2;
                    }
                    else if ((code & 0xc0) === 0xc0) {
                        // 2 byte char
                        const b1 = code, b2 = buffer[i + 1];
                        code = ((b1 & 0x1f) << 6) | (b2 & 0x3f);
                        i++;
                    }
                    else {
                        throw new Error("invalid utf-8 data");
                    }
                }
                if (code >= 65536) {
                    // Split into 2-part utf-16 char codes
                    code ^= 0x10000;
                    const p1 = 0xd800 | (code >> 10);
                    const p2 = 0xdc00 | (code & 0x3ff);
                    str += String.fromCharCode(p1);
                    str += String.fromCharCode(p2);
                }
                else {
                    str += String.fromCharCode(code);
                }
            }
            return str;
        }
        else {
            throw new Error("Unsupported buffer argument");
        }
    }
}
exports.decodeString = decodeString;
function concatTypedArrays(a, b) {
    const c = new a.constructor(a.length + b.length);
    c.set(a);
    c.set(b, a.length);
    return c;
}
exports.concatTypedArrays = concatTypedArrays;
function cloneObject(original, stack = []) {
    var _a;
    if (((_a = original === null || original === void 0 ? void 0 : original.constructor) === null || _a === void 0 ? void 0 : _a.name) === "DataSnapshot") {
        throw new TypeError(`Object to clone is a DataSnapshot (path "${original.ref.path}")`);
    }
    const checkAndFixTypedArray = (obj) => {
        if (obj !== null &&
            typeof obj === "object" &&
            typeof obj.constructor === "function" &&
            typeof obj.constructor.name === "string" &&
            ["Buffer", "Uint8Array", "Int8Array", "Uint16Array", "Int16Array", "Uint32Array", "Int32Array", "BigUint64Array", "BigInt64Array"].includes(obj.constructor.name)) {
            // FIX for typed array being converted to objects with numeric properties:
            // Convert Buffer or TypedArray to ArrayBuffer
            obj = obj.buffer.slice(obj.byteOffset, obj.byteOffset + obj.byteLength);
        }
        return obj;
    };
    original = checkAndFixTypedArray(original);
    if (typeof original !== "object" || original === null || original instanceof Date || original instanceof ArrayBuffer || original instanceof PathInfo_1.PathReference || original instanceof RegExp) {
        return original;
    }
    const cloneValue = (val) => {
        if (stack.indexOf(val) >= 0) {
            throw new ReferenceError("object contains a circular reference");
        }
        val = checkAndFixTypedArray(val);
        if (val === null || val instanceof Date || val instanceof ArrayBuffer || val instanceof PathInfo_1.PathReference || val instanceof RegExp) {
            // || val instanceof ID
            return val;
        }
        else if (typeof val === "object") {
            stack.push(val);
            val = cloneObject(val, stack);
            stack.pop();
            return val;
        }
        else {
            return val; // Anything other can just be copied
        }
    };
    if (typeof stack === "undefined") {
        stack = [original];
    }
    const clone = original instanceof Array ? [] : original instanceof PartialArray_1.PartialArray ? new PartialArray_1.PartialArray() : {};
    Object.keys(original).forEach((key) => {
        const val = original[key];
        if (typeof val === "function") {
            return; // skip functions
        }
        clone[key] = cloneValue(val);
    });
    return clone;
}
exports.cloneObject = cloneObject;
const isTypedArray = (val) => typeof val === "object" && ["ArrayBuffer", "Buffer", "Uint8Array", "Uint16Array", "Uint32Array", "Int8Array", "Int16Array", "Int32Array"].includes(val.constructor.name);
// CONSIDER: updating isTypedArray to: const isTypedArray = val => typeof val === 'object' && 'buffer' in val && 'byteOffset' in val && 'byteLength' in val;
function valuesAreEqual(val1, val2) {
    if (val1 === val2) {
        return true;
    }
    if (typeof val1 !== typeof val2) {
        return false;
    }
    if (typeof val1 === "object" || typeof val2 === "object") {
        if (val1 === null || val2 === null) {
            return false;
        }
        if (val1 instanceof PathInfo_1.PathReference || val2 instanceof PathInfo_1.PathReference) {
            return val1 instanceof PathInfo_1.PathReference && val2 instanceof PathInfo_1.PathReference && val1.path === val2.path;
        }
        if (val1 instanceof Date || val2 instanceof Date) {
            return val1 instanceof Date && val2 instanceof Date && val1.getTime() === val2.getTime();
        }
        if (val1 instanceof Array || val2 instanceof Array) {
            return val1 instanceof Array && val2 instanceof Array && val1.length === val2.length && val1.every((item, i) => valuesAreEqual(val1[i], val2[i]));
        }
        if (isTypedArray(val1) || isTypedArray(val2)) {
            if (!isTypedArray(val1) || !isTypedArray(val2) || val1.byteLength === val2.byteLength) {
                return false;
            }
            const typed1 = val1 instanceof ArrayBuffer ? new Uint8Array(val1) : new Uint8Array(val1.buffer, val1.byteOffset, val1.byteLength), typed2 = val2 instanceof ArrayBuffer ? new Uint8Array(val2) : new Uint8Array(val2.buffer, val2.byteOffset, val2.byteLength);
            return typed1.every((val, i) => typed2[i] === val);
        }
        const keys1 = Object.keys(val1), keys2 = Object.keys(val2);
        return keys1.length === keys2.length && keys1.every((key) => keys2.includes(key)) && keys1.every((key) => valuesAreEqual(val1[key], val2[key]));
    }
    return false;
}
exports.valuesAreEqual = valuesAreEqual;
class ObjectDifferences {
    constructor(added, removed, changed) {
        this.added = added;
        this.removed = removed;
        this.changed = changed;
    }
    forChild(key) {
        if (this.added.includes(key)) {
            return "added";
        }
        if (this.removed.includes(key)) {
            return "removed";
        }
        const changed = this.changed.find((ch) => ch.key === key);
        return changed ? changed.change : "identical";
    }
}
exports.ObjectDifferences = ObjectDifferences;
const isDate = function (value) {
    return value instanceof Date || (typeof value === "string" && !isNaN(Date.parse(value)));
};
exports.isDate = isDate;
function compareValues(oldVal, newVal, sortedResults = false) {
    const voids = [undefined, null];
    if (oldVal === newVal) {
        return "identical";
    }
    else if (voids.indexOf(oldVal) >= 0 && voids.indexOf(newVal) < 0) {
        return "added";
    }
    else if (voids.indexOf(oldVal) < 0 && voids.indexOf(newVal) >= 0) {
        return "removed";
    }
    else if (typeof oldVal !== typeof newVal) {
        return "changed";
    }
    else if (isTypedArray(oldVal) || isTypedArray(newVal)) {
        // One or both values are typed arrays.
        if (!isTypedArray(oldVal) || !isTypedArray(newVal)) {
            return "changed";
        }
        // Both are typed. Compare lengths and byte content of typed arrays
        const typed1 = oldVal instanceof Uint8Array
            ? oldVal
            : oldVal instanceof ArrayBuffer
                ? new Uint8Array(oldVal)
                : new Uint8Array(oldVal.buffer, oldVal.byteOffset, oldVal.byteLength);
        const typed2 = newVal instanceof Uint8Array
            ? newVal
            : newVal instanceof ArrayBuffer
                ? new Uint8Array(newVal)
                : new Uint8Array(newVal.buffer, newVal.byteOffset, newVal.byteLength);
        return typed1.byteLength === typed2.byteLength && typed1.every((val, i) => typed2[i] === val) ? "identical" : "changed";
    }
    else if ((0, exports.isDate)(oldVal) || (0, exports.isDate)(newVal)) {
        return (0, exports.isDate)(oldVal) && (0, exports.isDate)(newVal) && new Date(oldVal).getTime() === new Date(newVal).getTime() ? "identical" : "changed";
    }
    else if (oldVal instanceof PathInfo_1.PathReference || newVal instanceof PathInfo_1.PathReference) {
        return oldVal instanceof PathInfo_1.PathReference && newVal instanceof PathInfo_1.PathReference && oldVal.path === newVal.path ? "identical" : "changed";
    }
    else if (typeof oldVal === "object") {
        // Do key-by-key comparison of objects
        const isArray = oldVal instanceof Array;
        const getKeys = (obj) => {
            let keys = Object.keys(obj).filter((key) => !voids.includes(obj[key]));
            if (isArray) {
                keys = keys.map((v) => parseInt(v));
            }
            return keys;
        };
        const oldKeys = getKeys(oldVal);
        const newKeys = getKeys(newVal);
        const removedKeys = oldKeys.filter((key) => !newKeys.includes(key));
        const addedKeys = newKeys.filter((key) => !oldKeys.includes(key));
        const changedKeys = newKeys.reduce((changed, key) => {
            if (oldKeys.includes(key)) {
                const val1 = oldVal[key];
                const val2 = newVal[key];
                const c = compareValues(val1, val2);
                if (c !== "identical") {
                    changed.push({ key, change: c });
                }
            }
            return changed;
        }, []);
        if (addedKeys.length === 0 && removedKeys.length === 0 && changedKeys.length === 0) {
            return "identical";
        }
        else {
            return new ObjectDifferences(addedKeys, removedKeys, sortedResults ? changedKeys.sort((a, b) => (a.key < b.key ? -1 : 1)) : changedKeys);
        }
    }
    return "changed";
}
exports.compareValues = compareValues;
function getMutations(oldVal, newVal, sortedResults = false) {
    const process = (target, compareResult, prev, val) => {
        switch (compareResult) {
            case "identical":
                return [];
            case "changed":
                return [{ target, prev, val }];
            case "added":
                return [{ target, prev: null, val }];
            case "removed":
                return [{ target, prev, val: null }];
            default: {
                let changes = [];
                compareResult.added.forEach((key) => changes.push({ target: target.concat(key), prev: null, val: val[key] }));
                compareResult.removed.forEach((key) => changes.push({ target: target.concat(key), prev: prev[key], val: null }));
                compareResult.changed.forEach((item) => {
                    const childChanges = process(target.concat(item.key), item.change, prev[item.key], val[item.key]);
                    changes = changes.concat(childChanges);
                });
                return changes;
            }
        }
    };
    const compareResult = compareValues(oldVal, newVal, sortedResults);
    return process([], compareResult, oldVal, newVal);
}
exports.getMutations = getMutations;
function getChildValues(childKey, oldValue, newValue) {
    oldValue = oldValue === null ? null : oldValue[childKey];
    if (typeof oldValue === "undefined") {
        oldValue = null;
    }
    newValue = newValue === null ? null : newValue[childKey];
    if (typeof newValue === "undefined") {
        newValue = null;
    }
    return { oldValue, newValue };
}
exports.getChildValues = getChildValues;
function defer(fn) {
    process_1.default.nextTick(fn);
}
exports.defer = defer;
function getGlobalObject() {
    if (typeof globalThis !== "undefined") {
        return globalThis;
    }
    if (typeof self !== "undefined") {
        return self;
    }
    if (typeof window !== "undefined") {
        return window;
    }
    if (typeof global !== "undefined") {
        return global;
    }
    throw new Error("Unable to locate global object.");
}
exports.getGlobalObject = getGlobalObject;
function contains(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}
exports.contains = contains;
function safeGet(obj, key) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
        return obj[key];
    }
    else {
        return undefined;
    }
}
exports.safeGet = safeGet;
function isEmpty(obj) {
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            return false;
        }
    }
    return true;
}
exports.isEmpty = isEmpty;
/**
 * Deep equal two objects. Support Arrays and Objects.
 */
function deepEqual(a, b) {
    if (a === b) {
        return true;
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    for (const k of aKeys) {
        if (!bKeys.includes(k)) {
            return false;
        }
        const aProp = a[k];
        const bProp = b[k];
        if (isObject(aProp) && isObject(bProp)) {
            if (!deepEqual(aProp, bProp)) {
                return false;
            }
        }
        else if (aProp !== bProp) {
            return false;
        }
    }
    for (const k of bKeys) {
        if (!aKeys.includes(k)) {
            return false;
        }
    }
    return true;
}
exports.deepEqual = deepEqual;
function isObject(thing) {
    return thing !== null && typeof thing === "object";
}
/**
 * Copied from https://stackoverflow.com/a/2117523
 * Generates a new uuid.
 * @public
 */
function uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
exports.uuidv4 = uuidv4;

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"../process":53,"./PartialArray":41,"./PathInfo":42,"buffer":13}],50:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assert = void 0;
var Assert_1 = require("./Assert");
Object.defineProperty(exports, "assert", { enumerable: true, get: function () { return Assert_1.assert; } });

},{"./Assert":36}],51:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],52:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectCollection = exports.PartialArray = exports.SimpleObservable = exports.SchemaDefinition = exports.SimpleEventEmitter = exports.ascii85 = exports.Utils = exports.TypeMappings = exports.Transport = exports.EventSubscription = exports.EventPublisher = exports.EventStream = exports.PathInfo = exports.PathReference = exports.ID = exports.DebugLogger = exports.Lib = exports.MutationsDataSnapshot = exports.DataSnapshot = exports.DataReferencesArray = exports.DataSnapshotsArray = exports.QueryDataRetrievalOptions = exports.DataRetrievalOptions = exports.DataReferenceQuery = exports.DataReference = exports.Types = exports.Api = exports.DataBaseSettings = exports.DataBase = void 0;
var DataBase_1 = require("./DataBase");
Object.defineProperty(exports, "DataBase", { enumerable: true, get: function () { return DataBase_1.DataBase; } });
Object.defineProperty(exports, "DataBaseSettings", { enumerable: true, get: function () { return DataBase_1.DataBaseSettings; } });
var api_1 = require("./DataBase/api");
Object.defineProperty(exports, "Api", { enumerable: true, get: function () { return __importDefault(api_1).default; } });
exports.Types = __importStar(require("./Types"));
var reference_1 = require("./DataBase/reference");
Object.defineProperty(exports, "DataReference", { enumerable: true, get: function () { return reference_1.DataReference; } });
Object.defineProperty(exports, "DataReferenceQuery", { enumerable: true, get: function () { return reference_1.DataReferenceQuery; } });
Object.defineProperty(exports, "DataRetrievalOptions", { enumerable: true, get: function () { return reference_1.DataRetrievalOptions; } });
Object.defineProperty(exports, "QueryDataRetrievalOptions", { enumerable: true, get: function () { return reference_1.QueryDataRetrievalOptions; } });
Object.defineProperty(exports, "DataSnapshotsArray", { enumerable: true, get: function () { return reference_1.DataSnapshotsArray; } });
Object.defineProperty(exports, "DataReferencesArray", { enumerable: true, get: function () { return reference_1.DataReferencesArray; } });
var snapshot_1 = require("./DataBase/snapshot");
Object.defineProperty(exports, "DataSnapshot", { enumerable: true, get: function () { return snapshot_1.DataSnapshot; } });
Object.defineProperty(exports, "MutationsDataSnapshot", { enumerable: true, get: function () { return snapshot_1.MutationsDataSnapshot; } });
exports.Lib = __importStar(require("./Lib"));
var DebugLogger_1 = require("./Lib/DebugLogger");
Object.defineProperty(exports, "DebugLogger", { enumerable: true, get: function () { return __importDefault(DebugLogger_1).default; } });
var ID_1 = require("./Lib/ID");
Object.defineProperty(exports, "ID", { enumerable: true, get: function () { return __importDefault(ID_1).default; } });
var PathInfo_1 = require("./Lib/PathInfo");
Object.defineProperty(exports, "PathReference", { enumerable: true, get: function () { return PathInfo_1.PathReference; } });
Object.defineProperty(exports, "PathInfo", { enumerable: true, get: function () { return PathInfo_1.PathInfo; } });
var Subscription_1 = require("./Lib/Subscription");
Object.defineProperty(exports, "EventStream", { enumerable: true, get: function () { return Subscription_1.EventStream; } });
Object.defineProperty(exports, "EventPublisher", { enumerable: true, get: function () { return Subscription_1.EventPublisher; } });
Object.defineProperty(exports, "EventSubscription", { enumerable: true, get: function () { return Subscription_1.EventSubscription; } });
exports.Transport = __importStar(require("./Lib/Transport"));
var TypeMappings_1 = require("./Lib/TypeMappings");
Object.defineProperty(exports, "TypeMappings", { enumerable: true, get: function () { return __importDefault(TypeMappings_1).default; } });
exports.Utils = __importStar(require("./Lib/Utils"));
var Ascii85_1 = require("./Lib/Ascii85");
Object.defineProperty(exports, "ascii85", { enumerable: true, get: function () { return Ascii85_1.ascii85; } });
var SimpleEventEmitter_1 = require("./Lib/SimpleEventEmitter");
Object.defineProperty(exports, "SimpleEventEmitter", { enumerable: true, get: function () { return __importDefault(SimpleEventEmitter_1).default; } });
var Schema_1 = require("./Lib/Schema");
Object.defineProperty(exports, "SchemaDefinition", { enumerable: true, get: function () { return Schema_1.SchemaDefinition; } });
var SimpleObservable_1 = require("./Lib/SimpleObservable");
Object.defineProperty(exports, "SimpleObservable", { enumerable: true, get: function () { return __importDefault(SimpleObservable_1).default; } });
var PartialArray_1 = require("./Lib/PartialArray");
Object.defineProperty(exports, "PartialArray", { enumerable: true, get: function () { return PartialArray_1.PartialArray; } });
var ObjectCollection_1 = require("./Lib/ObjectCollection");
Object.defineProperty(exports, "ObjectCollection", { enumerable: true, get: function () { return ObjectCollection_1.ObjectCollection; } });

},{"./DataBase":32,"./DataBase/api":31,"./DataBase/reference":33,"./DataBase/snapshot":34,"./Lib":50,"./Lib/Ascii85":35,"./Lib/DebugLogger":37,"./Lib/ID":38,"./Lib/ObjectCollection":39,"./Lib/PartialArray":41,"./Lib/PathInfo":42,"./Lib/Schema":43,"./Lib/SimpleEventEmitter":44,"./Lib/SimpleObservable":45,"./Lib/Subscription":46,"./Lib/Transport":47,"./Lib/TypeMappings":48,"./Lib/Utils":49,"./Types":51}],53:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    // eslint-disable-next-line @typescript-eslint/ban-types
    nextTick(fn) {
        setTimeout(fn, 0);
    },
};

},{}]},{},[4])(4)
});
