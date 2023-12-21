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
const dirnameRoot = (0, path_1.dirname)(require.resolve("."));
class JsonFileStorageSettings {
    constructor(options = {}) {
        this.filePath = "";
        if (typeof options.filePath === "string") {
            this.filePath = path.resolve(dirnameRoot, options.filePath);
            console.log(this.filePath);
        }
    }
}
exports.JsonFileStorageSettings = JsonFileStorageSettings;
class JsonFileStorage extends CustomStorage_1.CustomStorage {
    constructor(options = {}) {
        super();
        this.data = new Map();
        this.options = new JsonFileStorageSettings(options);
        this.ready = false;
        fs.readFile(this.options.filePath, "utf8", (err, data) => {
            if (err) {
                throw `Erro ao ler o arquivo: ${err}`;
            }
            try {
                const jsonData = JSON.parse(data);
                this.data = new Map(jsonData.map((item) => [item.path, item.content]));
            }
            catch (parseError) {
                throw `Erro ao fazer o parse do JSON: ${String(parseError)}`;
            }
            this.ready = true;
        });
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
    async setNode(path, content, node) {
        this.data.set(path, content);
        await this.saveFile();
    }
    async removeNode(path, content, node) {
        this.data.delete(path);
        await this.saveFile();
    }
    saveFile() {
        return new Promise((resolve, reject) => {
            const jsonData = [];
            this.data.forEach((content, path) => {
                jsonData.push({
                    path,
                    content,
                });
            });
            const jsonString = JSON.stringify(jsonData, null, 4);
            fs.writeFileSync(this.options.filePath, jsonString, "utf8");
        });
    }
}
exports.JsonFileStorage = JsonFileStorage;
//# sourceMappingURL=JsonFileStorage.js.map