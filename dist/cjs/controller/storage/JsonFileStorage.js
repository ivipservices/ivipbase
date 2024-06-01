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
exports.JsonFileStorage = exports.JsonFileStorageSettings = void 0;
const CustomStorage_1 = require("./CustomStorage");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const path_1 = require("path");
const erros_1 = require("../erros");
const dirnameRoot = (0, path_1.dirname)(require.resolve("."));
class JsonFileStorageSettings {
    constructor(options = {}) {
        this.filePath = "";
        if (typeof options.filePath === "string") {
            this.filePath = path.resolve(path.dirname(process.pkg ? process.execPath : require.main ? require.main.filename : process.argv[0]), options.filePath);
        }
    }
}
exports.JsonFileStorageSettings = JsonFileStorageSettings;
class JsonFileStorage extends CustomStorage_1.CustomStorage {
    constructor(database, options = {}) {
        super();
        this.data = {};
        this.options = new JsonFileStorageSettings(options);
        (Array.isArray(database) ? database : [database])
            .filter((name) => typeof name === "string" && name.trim() !== "")
            .forEach((name) => {
            this.data[name] = new Map();
        });
        fs.access(this.options.filePath, fs.constants.F_OK, (err) => {
            if (err) {
                this.emit("ready");
            }
            else {
                fs.readFile(this.options.filePath, "utf8", (err, data) => {
                    if (err) {
                        throw `Erro ao ler o arquivo: ${err}`;
                    }
                    try {
                        const jsonData = JSON.parse(data);
                        for (let name in jsonData) {
                            this.data[name] = new Map(jsonData[name].map((item) => [item.path, item.content]));
                        }
                    }
                    catch (parseError) {
                        throw `Erro ao fazer o parse do JSON: ${String(parseError)}`;
                    }
                    this.emit("ready");
                });
            }
        });
    }
    async getMultiple(database, { regex }) {
        if (!this.data[database]) {
            throw erros_1.ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
        }
        const list = [];
        this.data[database].forEach((content, path) => {
            if (regex.test(path)) {
                if (content) {
                    list.push({ path, content });
                }
            }
        });
        return list;
    }
    async setNode(database, path, content, node) {
        if (!this.data[database]) {
            throw erros_1.ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
        }
        this.data[database].set(path, content);
        this.saveFile();
    }
    async removeNode(database, path, content, node) {
        if (!this.data[database]) {
            throw erros_1.ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
        }
        this.data[database].delete(path);
        this.saveFile();
    }
    saveFile() {
        clearTimeout(this.timeForSaveFile);
        this.timeForSaveFile = setTimeout(() => {
            const jsonData = {};
            for (let name in this.data) {
                this.data[name].forEach((content, path) => {
                    if (!Array.isArray(jsonData[name])) {
                        jsonData[name] = [];
                    }
                    jsonData[name].push({
                        path,
                        content,
                    });
                });
            }
            const jsonString = JSON.stringify(jsonData, null, 4);
            fs.writeFileSync(this.options.filePath, jsonString, "utf8");
        }, 1000);
    }
}
exports.JsonFileStorage = JsonFileStorage;
//# sourceMappingURL=JsonFileStorage.js.map