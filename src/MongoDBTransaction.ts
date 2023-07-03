import { CustomStorageHelpers, CustomStorageSettings, CustomStorageTransaction, ICustomStorageNode, ICustomStorageNodeMetaData } from "acebase";
import { MongoClient, Db, Document, FindCursor } from "mongodb";
import { MongoDBPreparer, MongodbSettings } from "./mongodb";
import { SimpleCache } from "acebase-core";

export const storageSettings = (
    dbname: string, 
    mongodb: MongoDBPreparer, 
    cache: SimpleCache<string, ICustomStorageNode>,
    ipc: Function
):CustomStorageSettings => new CustomStorageSettings({
    name: 'MongoDB',
    locking: true, // Let AceBase handle resource locking to prevent multiple simultanious updates to the same data

    removeVoidProperties: true,
    
    async ready() {},

    async getTransaction(target: { path: string, write: boolean }) {
        const context = { debug: true, dbname, mongodb, cache, ipc: ipc() };
        const transaction = new MongoDBTransaction(context, target);
        return transaction;
    }
});

export class MongoDBTransaction extends CustomStorageTransaction{
    private mongodb: MongoDBPreparer;
    private collection: string;

    private _storageKeysPrefix: string;

    private _pending: Array<{ path: string; action: 'set' | 'update' | 'remove'; node?: ICustomStorageNode }>;

    constructor(readonly context: { 
        debug: boolean; 
        dbname: string; 
        mongodb: MongoDBPreparer, 
        cache: SimpleCache<string, ICustomStorageNode>,
        ipc: any
    }, target: { path: string, write: boolean }){
        super(target);

        this.mongodb = this.context.mongodb;
        this.collection = this.context.dbname;

        this._storageKeysPrefix = `${this.context.dbname}::`;

        this._pending = [];
    }

    async commit(){
        if(this._pending.length === 0){ return; }
        const batch = this._pending.splice(0);

        this.context.ipc?.sendNotification({ action: 'cache.invalidate', paths: batch.map(op => op.path) });

        try {
            batch.forEach((op, i)=>{
                const path = op.path;
                const key = this.getStorageKeyForPath(path);

                if(op.action === 'set'){
                    const document = {
                        path: key,
                        content: op.node
                    };
                    this.mongodb.db.collection(this.collection).updateOne({ path: key }, { $set: document }, { upsert: true });
                    this.context.cache.set(path, op.node);
                }else if(op.action === 'remove'){
                    this.mongodb.db.collection(this.collection).deleteOne({ path: key });
                    this.context.cache.remove(path);
                }
            });
        }catch(err){
            console.error(err);
            throw err;
        }
    }

    async rollback(err: any){
        this._pending = [];
    }

    async get(path: string):Promise<any>{
        if(this.context.cache.has(path)){
            const cache = this.context.cache.get(path);
            return cache;
        }

        try{
            const key = this.getStorageKeyForPath(path);
            const document: Document | null = await this.mongodb.db.collection(this.collection).findOne({ path: key });
            if(document){
                this.context.cache.set(path, document.content);
                return document.content;
            }else{
                return null;
            }
        }catch(err){
            console.error(`MongoDB get error`, err);
            throw err;
        }
    }

    async set(path: string, node: ICustomStorageNode){
        this.context.cache.set(path, node);
        this._pending.push({ action: 'set', path, node });
    }

    async remove(path: string):Promise<void>{
        this._pending.push({ action: 'remove', path });
    }

    childrenOf(
        path: string, 
        include: { metadata: boolean; value: boolean; },
        checkCallback: (path: string) => boolean,
        addCallback: (path: string, node: ICustomStorageNodeMetaData | ICustomStorageNode) => boolean,
    ){
        return this._getChildrenOf(path, { ...include, descendants: false }, checkCallback, addCallback);
    }

    descendantsOf(
        path: string, 
        include: { metadata: boolean; value: boolean; },
        checkCallback: (path: string) => boolean,
        addCallback: (path: string, node: ICustomStorageNodeMetaData | ICustomStorageNode) => boolean,
    ){
        return this._getChildrenOf(path, { ...include, descendants: true }, checkCallback, addCallback);
    }

    _getChildrenOf(
        path: string,
        include: {
            metadata: boolean;
            value: boolean;
            descendants: boolean;
        },
        checkCallback: (path: string, metadata?: ICustomStorageNodeMetaData) => boolean,
        addCallback?: (path: string, node?: ICustomStorageNodeMetaData|ICustomStorageNode) => boolean
    ){
        return new Promise<void>((resolve, reject) => {
            const pathInfo = CustomStorageHelpers.PathInfo.get(path);
            const cursor: FindCursor<Document> = this.mongodb.db.collection(this.collection).find({ path: { $regex: `^${this.getStorageKeyForPath(path)}` } });

            cursor.forEach((document:Document)=>{
                //if (!document.path.startsWith(this._storageKeysPrefix)){ return true; }

                let otherPath = this.getPathFromStorageKey(document.path);

                let keepGoing = true;
                if(!document.path.startsWith(this._storageKeysPrefix)){
                    // No more results
                    return true;
                }else if (!pathInfo.isAncestorOf(otherPath)) {
                    // Paths are sorted, no more children or ancestors to be expected!
                    keepGoing = false;
                }else if (include.descendants || pathInfo.isParentOf(otherPath)) {
                    let node: ICustomStorageNode | ICustomStorageNodeMetaData;

                    if(include.metadata || include.value){
                        node = document.content;
                        if((node as ICustomStorageNode).value === null){
                            this.context.cache.remove(otherPath);
                        }else{
                            this.context.cache.set(otherPath, node as ICustomStorageNode);
                        }
                    }

                    const shouldAdd = checkCallback(otherPath, node);

                    if(shouldAdd){
                        keepGoing = addCallback(otherPath, node);
                    }
                }

                if(!keepGoing){
                    //return true;
                }
            }).catch(reject).finally(resolve);
        })
    }

    getPathFromStorageKey(key: string) {
        return key.slice(this._storageKeysPrefix.length);
    }

    getStorageKeyForPath(path: string) {
        return `${this._storageKeysPrefix}${path}`;
    }
}