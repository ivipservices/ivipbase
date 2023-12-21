import { CustomStorage } from "./CustomStorage.js";
import * as fs from "fs";
import * as path from "path";
import { dirname } from "path";
const dirnameRoot = dirname(require.resolve("."));
export class JsonFileStorageSettings {
    constructor(options = {}) {
        this.filePath = "";
        if (typeof options.filePath === "string") {
            this.filePath = path.resolve(dirnameRoot, options.filePath);
            console.log(this.filePath);
        }
    }
}
export class JsonFileStorage extends CustomStorage {
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
//# sourceMappingURL=JsonFileStorage.js.map