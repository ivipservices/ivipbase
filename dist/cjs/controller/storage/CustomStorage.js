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
//# sourceMappingURL=CustomStorage.js.map