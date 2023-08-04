"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoDBTransaction = exports.storageSettings = void 0;
const acebase_1 = require("acebase");
const PathInfo_1 = require("../lib/PathInfo");
const DebugLogger_1 = require("../lib/DebugLogger");
const RootPath_1 = require("../lib/RootPath");
const path_1 = require("path");
const storageSettings = (dbname, mongodb, cache) => new acebase_1.CustomStorageSettings({
    path: (0, path_1.resolve)(RootPath_1.default, "./LocalDataBase"),
    name: "MongoDB",
    locking: true,
    removeVoidProperties: true,
    ready() {
        return __awaiter(this, void 0, void 0, function* () { });
    },
    getTransaction(target) {
        return __awaiter(this, void 0, void 0, function* () {
            const context = { debug: true, dbname, mongodb, cache };
            const transaction = new MongoDBTransaction(context, target);
            return transaction;
        });
    },
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
        this.debug = new DebugLogger_1.DebugLogger(this.context.logLevel, `[${this.context.dbname}]`);
    }
    commit() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._pending.length === 0) {
                return;
            }
            const batch = this._pending.splice(0);
            try {
                batch.forEach((op, i) => {
                    const path = op.path;
                    const key = this.getStorageKeyForPath(path);
                    if (op.action === "set") {
                        const document = {
                            path: key,
                            content: op.node,
                        };
                        this.mongodb.db.collection(this.collection).updateOne({ path: key }, { $set: document }, { upsert: true });
                        this.context.cache.set(path, op.node);
                    }
                    else if (op.action === "remove") {
                        this.mongodb.db.collection(this.collection).deleteOne({ path: key });
                        this.context.cache.remove(path);
                    }
                });
            }
            catch (err) {
                this.debug.error(err);
                throw err;
            }
        });
    }
    forceCommit() {
        clearTimeout(this.forceCommitTime);
        this.forceCommitTime = setTimeout(() => {
            this.commit();
        }, 5000);
    }
    rollback(err) {
        return __awaiter(this, void 0, void 0, function* () {
            this._pending = [];
        });
    }
    get(path) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.context.cache.has(path)) {
                const cache = this.context.cache.get(path);
                return cache;
            }
            try {
                const key = this.getStorageKeyForPath(path);
                const document = yield this.mongodb.db.collection(this.collection).findOne({ path: key });
                if (document) {
                    this.context.cache.set(path, document.content);
                    return document.content;
                }
                else {
                    return null;
                }
            }
            catch (err) {
                this.debug.error(`MongoDB get error`, err);
                throw err;
            }
        });
    }
    set(path, node) {
        return __awaiter(this, void 0, void 0, function* () {
            this.context.cache.set(path, node);
            this._pending.push({ action: "set", path, node });
            this.forceCommit();
        });
    }
    remove(path) {
        return __awaiter(this, void 0, void 0, function* () {
            this._pending.push({ action: "remove", path });
            this.forceCommit();
        });
    }
    has(path) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.context.cache.has(path)) {
                return true;
            }
            try {
                const key = this.getStorageKeyForPath(path);
                const count = yield this.mongodb.db.collection(this.collection).countDocuments({ path: key });
                return count > 0;
            }
            catch (err) {
                this.debug.error(`MongoDB has error`, err);
                throw err;
            }
        });
    }
    /**
     *
     * @param path Parent path to load children of
     * @param include What data to include
     * @param checkCallback callback method to precheck if child needs to be added, perform before loading metadata/value if possible
     * @param addCallback callback method that adds the child node. Returns whether or not to keep calling with more children
     * @returns Returns a promise that resolves when there are no more children to be streamed
     */
    childrenOf(path, include, checkCallback, addCallback) {
        return this._getChildrenOf(path, Object.assign(Object.assign({}, include), { descendants: false }), checkCallback, addCallback);
    }
    /**
     *
     * @param path Parent path to load descendants of
     * @param include What data to include
     * @param checkCallback callback method to precheck if descendant needs to be added, perform before loading metadata/value if possible. NOTE: if include.metadata === true, you should load and pass the metadata to the checkCallback if doing so has no or small performance impact
     * @param addCallback callback method that adds the descendant node. Returns whether or not to keep calling with more children
     * @returns Returns a promise that resolves when there are no more descendants to be streamed
     */
    descendantsOf(path, include, checkCallback, addCallback) {
        return this._getChildrenOf(path, Object.assign(Object.assign({}, include), { descendants: true }), checkCallback, addCallback);
    }
    _getChildrenOf(path, include, checkCallback, addCallback) {
        return new Promise((resolve, reject) => {
            const pathInfo = PathInfo_1.PathInfo.get(path);
            const cursor = this.mongodb.db.collection(this.collection).find({
                path: { $regex: `^${this.getStorageKeyForPath(path)}` },
            });
            cursor
                .forEach((document) => {
                //if (!document.path.startsWith(this._storageKeysPrefix)){ return true; }
                const otherPath = this.getPathFromStorageKey(document.path);
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
            })
                .catch(reject)
                .finally(resolve);
        });
    }
    /**
     * Returns the number of children stored in their own records. This implementation uses `childrenOf` to count, override if storage supports a quicker way.
     * Eg: For SQL databases, you can implement this with a single query like `SELECT count(*) FROM nodes WHERE ${CustomStorageHelpers.ChildPathsSql(path)}`
     * @param path
     * @returns Returns a promise that resolves with the number of children
     */
    getChildCount(path) {
        return Promise.reject();
    }
    /**
     * NOT USED YET
     * Default implementation of getMultiple that executes .get for each given path. Override for custom logic
     * @param paths
     * @returns Returns promise with a Map of paths to nodes
     */
    getMultiple(paths) {
        return Promise.reject();
    }
    /**
     * NOT USED YET
     * Default implementation of setMultiple that executes .set for each given path. Override for custom logic
     * @param nodes
     */
    setMultiple(nodes) {
        return Promise.reject();
    }
    /**
     * Default implementation of removeMultiple that executes .remove for each given path. Override for custom logic
     * @param paths
     */
    removeMultiple(paths) {
        return Promise.reject();
    }
    /**
     * Moves the transaction path to the parent node. If node locking is used, it will request a new lock
     * Used internally, must not be overridden unless custom locking mechanism is required
     * @param targetPath
     */
    moveToParentPath(targetPath) {
        return Promise.reject();
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