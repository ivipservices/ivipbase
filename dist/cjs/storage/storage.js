"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Storage = exports.StorageReference = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const _private = Symbol("private");
class StorageReference extends ivipbase_core_1.SimpleEventEmitter {
    constructor(storage, path) {
        super();
        this.storage = storage;
        if (!path) {
            path = "";
        }
        path = path.replace(/^\/|\/$/g, ""); // Trim slashes
        const pathInfo = ivipbase_core_1.PathInfo.get(path);
        const key = pathInfo.key;
        this[_private] = {
            get path() {
                return path;
            },
            get key() {
                return key;
            },
        };
    }
    get isWildcardPath() {
        return this.fullPath.indexOf("*") >= 0 || this.fullPath.indexOf("$") >= 0;
    }
    /**
     * O caminho com o qual esta instância foi criada
     */
    get fullPath() {
        return this[_private].path;
    }
    get name() {
        return ivipbase_core_1.PathInfo.get(this.fullPath).key;
    }
    /**
     * A chave ou índice deste nó
     */
    get key() {
        const key = this[_private].key;
        return typeof key === "number" ? `[${key}]` : key;
    }
    /**
     * Retorna uma nova referência para o pai deste nó
     */
    get parent() {
        const info = ivipbase_core_1.PathInfo.get(this.fullPath);
        if (info.parentPath === null) {
            return null;
        }
        return new StorageReference(this.storage, info.parentPath);
    }
    get root() {
        return new StorageReference(this.storage, "");
    }
    /**
     * Retorna uma nova referência para um nó filho
     * @param childPath Chave de filho, índice ou caminho
     * @returns Referência para o filho
     */
    child(childPath) {
        childPath = typeof childPath === "number" ? childPath : childPath.replace(/^\/|\/$/g, "");
        const targetPath = ivipbase_core_1.PathInfo.getChildPath(this.fullPath, childPath);
        return new StorageReference(this.storage, targetPath); //  `${this.path}/${childPath}`
    }
    put(data, metadata) {
        const self = this;
        return {
            pause() { },
            resume() { },
            cancel() { },
            on(event, callback) {
                self.on(event, callback);
            },
        };
    }
    putString(data, type = "text") {
        const self = this;
        return {
            pause() { },
            resume() { },
            cancel() { },
            on(event, callback) {
                self.on(event, callback);
            },
        };
    }
    delete() { }
    getDownloadURL() {
        return this.storage.getDownloadURL(this);
    }
    getBlob() { }
    getBytes() { }
    getStream() { }
    listAll() {
        return this.storage.listAll(this);
    }
    list(config) {
        return this.storage.list(this, config);
    }
}
exports.StorageReference = StorageReference;
class Storage {
    constructor(app, database) {
        this.app = app;
        this.database = database;
    }
    /**
     * Creates a reference to a node
     * @param path
     * @returns reference to the requested node
     */
    ref(path) {
        return new StorageReference(this, path);
    }
    put(ref, data, metadata) {
        return Promise.resolve("");
    }
    putString(ref, data, type) {
        return Promise.resolve("");
    }
    delete(ef) {
        return Promise.resolve();
    }
    async getDownloadURL(ref) {
        const { path, isFile } = await this.database
            .ref(`__storage__`)
            .child(ref.fullPath)
            .get({
            include: ["path", "isFile"],
        })
            .then((snap) => {
            var _a;
            return Promise.resolve((_a = snap.val()) !== null && _a !== void 0 ? _a : {
                path: null,
                isFile: false,
            });
        })
            .catch(() => Promise.resolve({
            path: null,
            isFile: false,
        }));
        return typeof path === "string" && isFile ? `${this.app.url}/storage/${ref.fullPath}` : null;
    }
    async listAll(ref) {
        const snaps = await this.database.query(`__storage__/${ref.fullPath}`).get({
            include: ["path", "isFile"],
        });
        const items = [];
        const prefixes = [];
        snaps.forEach((snap) => {
            const { path, isFile } = snap.val();
            if (typeof path === "string" && isFile) {
                items.push(snap.ref.path.replace(`__storage__/${ref.fullPath}/`, ""));
            }
            else {
                prefixes.push(path.ref.path.replace(`__storage__/${ref.fullPath}/`, ""));
            }
        });
        return {
            items: items.map((child) => {
                return ref.child(child);
            }),
            prefixes: prefixes.map((child) => {
                return ref.child(child);
            }),
        };
    }
    async list(ref, config) {
        var _a, _b, _c;
        const maxResults = (_a = config.maxResults) !== null && _a !== void 0 ? _a : 10;
        const skip = ((_b = config.page) !== null && _b !== void 0 ? _b : 0) * maxResults;
        const snaps = await this.database
            .query(`__storage__/${ref.fullPath}`)
            .take(maxResults)
            .skip(skip)
            .get({
            include: ["path", "isFile"],
        });
        const items = [];
        const prefixes = [];
        snaps.forEach((snap) => {
            const { path, isFile } = snap.val();
            if (typeof path === "string" && isFile) {
                items.push(snap.ref.path.replace(`__storage__/${ref.fullPath}/`, ""));
            }
            else {
                prefixes.push(path.ref.path.replace(`__storage__/${ref.fullPath}/`, ""));
            }
        });
        return {
            more: items.length === maxResults,
            page: (_c = config.page) !== null && _c !== void 0 ? _c : 0,
            items: items.map((child) => {
                return ref.child(child);
            }),
            prefixes: prefixes.map((child) => {
                return ref.child(child);
            }),
        };
    }
}
exports.Storage = Storage;
//# sourceMappingURL=storage.js.map