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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomStorage = exports.CustomStorageSettings = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const erros_1 = require("../erros");
const MDE_1 = __importStar(require("./MDE"));
class CustomStorageSettings extends MDE_1.MDESettings {
    constructor(options = {}) {
        super(options);
    }
}
exports.CustomStorageSettings = CustomStorageSettings;
class CustomStorage extends MDE_1.default {
    constructor(options = {}, app) {
        const { logLevel } = options, _options = __rest(options, ["logLevel"]);
        super(Object.assign(Object.assign({}, _options), { getMultiple: (database, e) => {
                if (!this.ready) {
                    throw erros_1.ERROR_FACTORY.create("db-disconnected" /* AppError.DB_DISCONNECTED */, { dbName: this.dbName });
                }
                return this.getMultiple(database, e);
            }, setNode: (database, path, content, node) => {
                if (!this.ready) {
                    throw erros_1.ERROR_FACTORY.create("db-disconnected" /* AppError.DB_DISCONNECTED */, { dbName: this.dbName });
                }
                return this.setNode(database, path, content, node);
            }, removeNode: (database, path, content, node) => {
                if (!this.ready) {
                    throw erros_1.ERROR_FACTORY.create("db-disconnected" /* AppError.DB_DISCONNECTED */, { dbName: this.dbName });
                }
                return this.removeNode(database, path, content, node);
            } }));
        this.app = app;
        this._dbName = "CustomStorage";
        this.logLevel = "log";
        this.logLevel = logLevel || "log";
        this._debug = new ivipbase_core_1.DebugLogger(this.logLevel, `[${this.dbName}]`);
    }
    get dbName() {
        return this._dbName;
    }
    set dbName(value) {
        this._dbName = value;
        this._debug = new ivipbase_core_1.DebugLogger(this.logLevel, `[${this._dbName}]`);
    }
    get debug() {
        return this._debug;
    }
}
exports.CustomStorage = CustomStorage;
//# sourceMappingURL=CustomStorage.js.map