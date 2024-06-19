import { PathInfo, SimpleEventEmitter } from "ivipbase-core";
const _private = Symbol("private");
export class StorageReference extends SimpleEventEmitter {
    constructor(storage, path) {
        super();
        this.storage = storage;
        if (!path) {
            path = "";
        }
        path = path.replace(/^\/|\/$/g, ""); // Trim slashes
        const pathInfo = PathInfo.get(path);
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
    on(event, callback) {
        return super.on(event, callback);
    }
    emit(event, data) {
        return super.emit(event, data);
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
        return PathInfo.get(this.fullPath).key;
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
        const info = PathInfo.get(this.fullPath);
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
        const targetPath = PathInfo.getChildPath(this.fullPath, childPath);
        return new StorageReference(this.storage, targetPath); //  `${this.path}/${childPath}`
    }
    put(data, metadata) {
        if (this.isWildcardPath) {
            throw new Error("Cannot put data to a wildcard path");
        }
        const self = this;
        const promise = this.storage.put(this, data, metadata, (snapshot) => {
            self.emit("state_changed", snapshot);
        });
        return {
            pause() { },
            resume() { },
            cancel() { },
            on(event, callback) {
                return self.on(event, callback);
            },
            async async() {
                await promise;
                return self;
            },
        };
    }
    putString(data, type = "text") {
        if (this.isWildcardPath) {
            throw new Error("Cannot put data to a wildcard path");
        }
        const self = this;
        const promise = this.storage.putString(this, data, type, (snapshot) => {
            self.emit("state_changed", snapshot);
        });
        return {
            pause() { },
            resume() { },
            cancel() { },
            on(event, callback) {
                return self.on(event, callback);
            },
            async async() {
                await promise;
                return self;
            },
        };
    }
    delete() {
        if (this.isWildcardPath) {
            throw new Error("Cannot delete a wildcard path");
        }
        return this.storage.delete(this);
    }
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
//# sourceMappingURL=StorageReference.js.map