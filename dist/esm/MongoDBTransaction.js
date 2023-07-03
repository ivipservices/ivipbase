"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoDBTransaction = exports.storageSettings = void 0;
const acebase_1 = require("acebase");
const storageSettings = (dbname, mongodb, cache, ipc) => new acebase_1.CustomStorageSettings({
    name: 'MongoDB',
    locking: true,
    removeVoidProperties: true,
    async ready() { },
    async getTransaction(target) {
        const context = { debug: true, dbname, mongodb, cache, ipc: ipc() };
        const transaction = new MongoDBTransaction(context, target);
        return transaction;
    }
});
exports.storageSettings = storageSettings;
class MongoDBTransaction extends acebase_1.CustomStorageTransaction {
    constructor(context, target) {
        super(target);
        this.context = context;
        this.mongodb = this.context.mongodb;
        this.collection = this.context.dbname;
        this._storageKeysPrefix = `${this.context.dbname}::`;
        this._pending = [];
    }
    async commit() {
        if (this._pending.length === 0) {
            return;
        }
        const batch = this._pending.splice(0);
        this.context.ipc?.sendNotification({ action: 'cache.invalidate', paths: batch.map(op => op.path) });
        try {
            batch.forEach((op, i) => {
                const path = op.path;
                const key = this.getStorageKeyForPath(path);
                if (op.action === 'set') {
                    const document = {
                        path: key,
                        content: op.node
                    };
                    this.mongodb.db.collection(this.collection).updateOne({ path: key }, { $set: document }, { upsert: true });
                    this.context.cache.set(path, op.node);
                }
                else if (op.action === 'remove') {
                    this.mongodb.db.collection(this.collection).deleteOne({ path: key });
                    this.context.cache.remove(path);
                }
            });
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    }
    async rollback(err) {
        this._pending = [];
    }
    async get(path) {
        if (this.context.cache.has(path)) {
            const cache = this.context.cache.get(path);
            return cache;
        }
        try {
            const key = this.getStorageKeyForPath(path);
            const document = await this.mongodb.db.collection(this.collection).findOne({ path: key });
            if (document) {
                this.context.cache.set(path, document.content);
                return document.content;
            }
            else {
                return null;
            }
        }
        catch (err) {
            console.error(`MongoDB get error`, err);
            throw err;
        }
    }
    async set(path, node) {
        this._pending.push({ action: 'set', path, node });
    }
    async remove(path) {
        this._pending.push({ action: 'remove', path });
    }
    childrenOf(path, include, checkCallback, addCallback) {
        return this._getChildrenOf(path, { ...include, descendants: false }, checkCallback, addCallback);
    }
    descendantsOf(path, include, checkCallback, addCallback) {
        return this._getChildrenOf(path, { ...include, descendants: true }, checkCallback, addCallback);
    }
    _getChildrenOf(path, include, checkCallback, addCallback) {
        return new Promise((resolve, reject) => {
            const pathInfo = acebase_1.CustomStorageHelpers.PathInfo.get(path);
            const cursor = this.mongodb.db.collection(this.collection).find({ path: { $regex: `^${this.getStorageKeyForPath(path)}` } });
            cursor.forEach((document) => {
                //if (!document.path.startsWith(this._storageKeysPrefix)){ return true; }
                let otherPath = this.getPathFromStorageKey(document.path);
                let keepGoing = true;
                if (!document.path.startsWith(this._storageKeysPrefix)) {
                    // No more results
                    return true;
                }
                else if (!pathInfo.isAncestorOf(otherPath)) {
                    // Paths are sorted, no more children or ancestors to be expected!
                    keepGoing = false;
                }
                else if (include.descendants || pathInfo.isParentOf(otherPath)) {
                    let node;
                    if (include.metadata || include.value) {
                        node = document.content;
                        if (node.value === null) {
                            this.context.cache.remove(otherPath);
                        }
                        else {
                            this.context.cache.set(otherPath, node);
                        }
                    }
                    const shouldAdd = checkCallback(otherPath, node);
                    if (shouldAdd) {
                        keepGoing = addCallback(otherPath, node);
                    }
                }
                if (!keepGoing) {
                    //return true;
                }
            }).catch(reject).finally(resolve);
        });
    }
    getPathFromStorageKey(key) {
        return key.slice(this._storageKeysPrefix.length);
    }
    getStorageKeyForPath(path) {
        return `${this._storageKeysPrefix}${path}`;
    }
}
exports.MongoDBTransaction = MongoDBTransaction;
//# sourceMappingURL=MongoDBTransaction.js.map