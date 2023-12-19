"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabase = exports.DataBase = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const app_1 = require("../app");
const MDE_1 = require("../controller/storage/MDE");
class StorageDBServer extends ivipbase_core_1.Api {
    constructor(db) {
        super();
        this.db = db;
        this.cache = {};
        this.db.emit("ready");
    }
    async stats() {
        return {
            writes: 0,
            reads: 0,
            bytesRead: 0,
            bytesWritten: 0,
        };
    }
    subscribe(path, event, callback) {
        this.db.subscriptions.add(path, event, callback);
    }
    unsubscribe(path, event, callback) {
        this.db.subscriptions.remove(path, event, callback);
    }
    async set(path, value, options) {
        await this.db.app.storage.set(path, value);
        return {};
    }
    async get(path, options) {
        if (!options) {
            options = {};
        }
        if (typeof options.include !== "undefined" && !(options.include instanceof Array)) {
            throw new TypeError(`options.include must be an array of key names`);
        }
        if (typeof options.exclude !== "undefined" && !(options.exclude instanceof Array)) {
            throw new TypeError(`options.exclude must be an array of key names`);
        }
        const value = await this.db.app.storage.get(path);
        return { value, context: { more: false } };
    }
    async update(path, updates, options) {
        await this.db.app.storage.set(path, updates);
        return {};
    }
    async exists(path) {
        return await this.db.app.storage.isPathExists(path);
    }
    async reflect(path, type, args) {
        var _a, _b, _c, _d, _e;
        args = args || {};
        const getChildren = async (path, limit = 50, skip = 0, from = null) => {
            if (typeof limit === "string") {
                limit = parseInt(limit);
            }
            if (typeof skip === "string") {
                skip = parseInt(skip);
            }
            if (["null", "undefined", null, undefined].includes(from)) {
                from = null;
            }
            const children = []; // Array<{ key: string | number; type: string; value: any; address?: any }>;
            let n = 0, stop = false, more = false; //stop = skip + limit,
            await this.db.app.storage
                .getChildren(path)
                .next((childInfo) => {
                var _a, _b;
                if (stop) {
                    // Stop 1 child too late on purpose to make sure there's more
                    more = true;
                    return false; // Stop iterating
                }
                n++;
                const include = from !== null && childInfo.key ? childInfo.key > from : skip === 0 || n > skip;
                if (include) {
                    children.push(Object.assign({ key: (_a = (typeof childInfo.key === "string" ? childInfo.key : childInfo.index)) !== null && _a !== void 0 ? _a : "", type: (_b = childInfo.valueTypeName) !== null && _b !== void 0 ? _b : "unknown", value: childInfo.value }, (typeof childInfo.address === "object" && {
                        address: childInfo.address,
                    })));
                }
                stop = limit > 0 && children.length === limit;
            })
                .catch((err) => {
                throw err;
            });
            return {
                more,
                list: children,
            };
        };
        switch (type) {
            case "children": {
                const result = await getChildren(path, args.limit, args.skip, args.from);
                return result;
            }
            case "info": {
                const info = {
                    key: "",
                    exists: false,
                    type: "unknown",
                    value: undefined,
                    address: undefined,
                    children: {
                        count: 0,
                        more: false,
                        list: [],
                    },
                };
                const nodeInfo = await this.db.app.storage.getInfoBy(path, { include_child_count: args.child_count === true });
                info.key = (_a = (typeof nodeInfo.key !== "undefined" ? nodeInfo.key : nodeInfo.index)) !== null && _a !== void 0 ? _a : "";
                info.exists = (_b = nodeInfo.exists) !== null && _b !== void 0 ? _b : false;
                info.type = (_c = (nodeInfo.exists ? nodeInfo.valueTypeName : undefined)) !== null && _c !== void 0 ? _c : "unknown";
                info.value = nodeInfo.value;
                info.address = typeof nodeInfo.address === "object" ? nodeInfo.address : undefined;
                const isObjectOrArray = nodeInfo.exists && nodeInfo.address && [MDE_1.VALUE_TYPES.OBJECT, MDE_1.VALUE_TYPES.ARRAY].includes((_d = nodeInfo.type) !== null && _d !== void 0 ? _d : 0);
                if (args.child_count === true) {
                    info.children = { count: isObjectOrArray ? (_e = nodeInfo.childCount) !== null && _e !== void 0 ? _e : 0 : 0 };
                }
                else if (typeof args.child_limit === "number" && args.child_limit > 0) {
                    if (isObjectOrArray) {
                        info.children = await getChildren(path, args.child_limit, args.child_skip, args.child_from);
                    }
                }
                return info;
            }
        }
    }
}
class StorageDBClient extends ivipbase_core_1.Api {
    constructor(db) {
        super();
        this.db = db;
        this.cache = {};
        this.db.emit("ready");
    }
}
const SUPPORTED_EVENTS = ["value", "child_added", "child_changed", "child_removed", "mutated", "mutations"];
SUPPORTED_EVENTS.push(...SUPPORTED_EVENTS.map((event) => `notify_${event}`));
class DataBase extends ivipbase_core_1.DataBase {
    constructor(app = undefined, options) {
        const appNow = typeof app === "string" ? (0, app_1.getApp)(app) : app instanceof app_1.IvipBaseApp ? app : (0, app_1.getFirstApp)();
        super(appNow.settings.dbname, options);
        this._eventSubscriptions = {};
        this.subscriptions = {
            /**
             * Adiciona uma assinatura a um nó
             * @param path Caminho para o nó ao qual adicionar a assinatura
             * @param type Tipo da assinatura
             * @param callback Função de retorno de chamada da assinatura
             */
            add: (path, type, callback) => {
                if (SUPPORTED_EVENTS.indexOf(type) < 0) {
                    throw new TypeError(`Invalid event type "${type}"`);
                }
                let pathSubs = this._eventSubscriptions[path];
                if (!pathSubs) {
                    pathSubs = this._eventSubscriptions[path] = [];
                }
                // if (pathSubs.findIndex(ps => ps.type === type && ps.callback === callback)) {
                //     storage.debug.warn(`Identical subscription of type ${type} on path "${path}" being added`);
                // }
                pathSubs.push({ created: Date.now(), type, callback });
                //this.emit('subscribe', { path, event: type, callback });
            },
            /**
             * Remove 1 ou mais assinaturas de um nó
             * @param path Caminho para o nó do qual remover a assinatura
             * @param type Tipo de assinatura(s) a ser removido (opcional: se omitido, todos os tipos serão removidos)
             * @param callback Callback a ser removido (opcional: se omitido, todos do mesmo tipo serão removidos)
             */
            remove: (path, type, callback) => {
                const pathSubs = this._eventSubscriptions[path];
                if (!pathSubs) {
                    return;
                }
                const next = () => pathSubs.findIndex((ps) => (type ? ps.type === type : true) && (callback ? ps.callback === callback : true));
                let i;
                while ((i = next()) >= 0) {
                    pathSubs.splice(i, 1);
                }
                //this.emit('unsubscribe', { path, event: type, callback });
            },
            /**
             * Verifica se existem assinantes no caminho fornecido que precisam do valor anterior do nó quando uma alteração é acionada
             * @param path
             */
            hasValueSubscribersForPath(path) {
                const valueNeeded = this.getValueSubscribersForPath(path);
                return !!valueNeeded;
            },
            /**
             * Obtém todos os assinantes no caminho fornecido que precisam do valor anterior do nó quando uma alteração é acionada
             * @param path
             */
            getValueSubscribersForPath: (path) => {
                // Assinantes que DEVEM ter o valor anterior completo de um nó antes da atualização:
                //  - Eventos "value" no próprio caminho e em qualquer caminho ancestral
                //  - Eventos "child_added", "child_removed" no caminho pai
                //  - Eventos "child_changed" no caminho pai e em seus ancestrais
                //  - TODOS os eventos em caminhos filhos/descendentes
                const pathInfo = new ivipbase_core_1.PathInfo(path);
                const valueSubscribers = [];
                Object.keys(this._eventSubscriptions).forEach((subscriptionPath) => {
                    if (pathInfo.equals(subscriptionPath) || pathInfo.isDescendantOf(subscriptionPath)) {
                        // Caminho sendo atualizado === subscriptionPath, ou um caminho filho/descendente dele
                        // por exemplo, caminho === "posts/123/title"
                        // e subscriptionPath é "posts/123/title", "posts/$postId/title", "posts/123", "posts/*", "posts", etc.
                        const pathSubs = this._eventSubscriptions[subscriptionPath];
                        const eventPath = ivipbase_core_1.PathInfo.fillVariables(subscriptionPath, path);
                        pathSubs
                            .filter((sub) => !sub.type.startsWith("notify_")) // Eventos de notificação não precisam de carregamento de valor adicional
                            .forEach((sub) => {
                            let dataPath = null;
                            if (sub.type === "value") {
                                // ["value", "notify_value"].includes(sub.type)
                                dataPath = eventPath;
                            }
                            else if (["mutated", "mutations"].includes(sub.type) && pathInfo.isDescendantOf(eventPath)) {
                                //["mutated", "notify_mutated"].includes(sub.type)
                                dataPath = path; // A única informação necessária são as propriedades sendo atualizadas no caminho alvo
                            }
                            else if (sub.type === "child_changed" && path !== eventPath) {
                                // ["child_changed", "notify_child_changed"].includes(sub.type)
                                const childKey = ivipbase_core_1.PathInfo.getPathKeys(path.slice(eventPath.length).replace(/^\//, ""))[0];
                                dataPath = ivipbase_core_1.PathInfo.getChildPath(eventPath, childKey);
                            }
                            else if (["child_added", "child_removed"].includes(sub.type) && pathInfo.isChildOf(eventPath)) {
                                //["child_added", "child_removed", "notify_child_added", "notify_child_removed"]
                                const childKey = ivipbase_core_1.PathInfo.getPathKeys(path.slice(eventPath.length).replace(/^\//, ""))[0];
                                dataPath = ivipbase_core_1.PathInfo.getChildPath(eventPath, childKey);
                            }
                            if (dataPath !== null && !valueSubscribers.some((s) => s.type === sub.type && s.eventPath === eventPath)) {
                                valueSubscribers.push({ type: sub.type, eventPath, dataPath, subscriptionPath });
                            }
                        });
                    }
                });
                return valueSubscribers;
            },
            /**
             * Obtém todos os assinantes no caminho fornecido que possivelmente podem ser acionados após a atualização de um nó
             */
            getAllSubscribersForPath: (path) => {
                const pathInfo = ivipbase_core_1.PathInfo.get(path);
                const subscribers = [];
                Object.keys(this._eventSubscriptions).forEach((subscriptionPath) => {
                    // if (pathInfo.equals(subscriptionPath) //path === subscriptionPath
                    //     || pathInfo.isDescendantOf(subscriptionPath)
                    //     || pathInfo.isAncestorOf(subscriptionPath)
                    // ) {
                    if (pathInfo.isOnTrailOf(subscriptionPath)) {
                        const pathSubs = this._eventSubscriptions[subscriptionPath];
                        const eventPath = ivipbase_core_1.PathInfo.fillVariables(subscriptionPath, path);
                        pathSubs.forEach((sub) => {
                            let dataPath = null;
                            if (sub.type === "value" || sub.type === "notify_value") {
                                dataPath = eventPath;
                            }
                            else if (["child_changed", "notify_child_changed"].includes(sub.type)) {
                                const childKey = path === eventPath || pathInfo.isAncestorOf(eventPath) ? "*" : ivipbase_core_1.PathInfo.getPathKeys(path.slice(eventPath.length).replace(/^\//, ""))[0];
                                dataPath = ivipbase_core_1.PathInfo.getChildPath(eventPath, childKey);
                            }
                            else if (["mutated", "mutations", "notify_mutated", "notify_mutations"].includes(sub.type)) {
                                dataPath = path;
                            }
                            else if (["child_added", "child_removed", "notify_child_added", "notify_child_removed"].includes(sub.type) &&
                                (pathInfo.isChildOf(eventPath) || path === eventPath || pathInfo.isAncestorOf(eventPath))) {
                                const childKey = path === eventPath || pathInfo.isAncestorOf(eventPath) ? "*" : ivipbase_core_1.PathInfo.getPathKeys(path.slice(eventPath.length).replace(/^\//, ""))[0];
                                dataPath = ivipbase_core_1.PathInfo.getChildPath(eventPath, childKey); //NodePath(subscriptionPath).childPath(childKey);
                            }
                            if (dataPath !== null && !subscribers.some((s) => s.type === sub.type && s.eventPath === eventPath && s.subscriptionPath === subscriptionPath)) {
                                // && subscribers.findIndex(s => s.type === sub.type && s.dataPath === dataPath) < 0
                                subscribers.push({ type: sub.type, eventPath, dataPath, subscriptionPath });
                            }
                        });
                    }
                });
                return subscribers;
            },
            /**
             * Aciona eventos de assinatura para serem executados em nós relevantes
             * @param event Tipo de evento: "value", "child_added", "child_changed", "child_removed"
             * @param path Caminho para o nó no qual a assinatura está presente
             * @param dataPath Caminho para o nó onde o valor está armazenado
             * @param oldValue Valor antigo
             * @param newValue Novo valor
             * @param context Contexto usado pelo cliente que atualizou esses dados
             */
            trigger: (event, path, dataPath, oldValue, newValue, context) => {
                //console.warn(`Event "${event}" triggered on node "/${path}" with data of "/${dataPath}": `, newValue);
                const pathSubscriptions = this._eventSubscriptions[path] || [];
                pathSubscriptions
                    .filter((sub) => sub.type === event)
                    .forEach((sub) => {
                    sub.callback(null, dataPath, newValue, oldValue, context);
                    // if (event.startsWith('notify_')) {
                    //     // Notify only event, run callback without data
                    //     sub.callback(null, dataPath);
                    // }
                    // else {
                    //     // Run callback with data
                    //     sub.callback(null, dataPath, newValue, oldValue);
                    // }
                });
            },
        };
        this.app = appNow;
        const hostnameRegex = /^(?:(?:https?|ftp):\/\/)?(?:localhost|(?:[a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,}|(?:\d{1,3}\.){3}\d{1,3})$/;
        const valid_client = !!appNow.settings.client && typeof appNow.settings.client.host === "string" && hostnameRegex.test(appNow.settings.client.host.trim());
        this.storage = appNow.isServer || !valid_client ? new StorageDBServer(this) : new StorageDBClient(this);
        this.emitOnce("ready");
    }
}
exports.DataBase = DataBase;
function getDatabase(app = undefined, options) {
    return new DataBase(app, options);
}
exports.getDatabase = getDatabase;
//# sourceMappingURL=index.js.map