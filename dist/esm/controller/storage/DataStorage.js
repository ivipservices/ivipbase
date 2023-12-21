import { CustomStorage, CustomStorageSettings } from "./CustomStorage.js";
export class DataStorageSettings extends CustomStorageSettings {
    constructor(options = {}) {
        super(options);
    }
}
export class DataStorage extends CustomStorage {
    constructor(options = {}) {
        super(options);
        this.data = new Map();
        this.dbName = "TempStorage";
        this.ready = true;
    }
    async getMultiple(expression) {
        const list = [];
        this.data.forEach((content, path) => {
            if (expression.test(path)) {
                if (content) {
                    list.push({ path, content });
                }
            }
        });
        return list;
    }
    async setNode(path, content) {
        this.data.set(path, content);
    }
    async removeNode(path) {
        this.data.delete(path);
    }
}
//# sourceMappingURL=DataStorage.js.map