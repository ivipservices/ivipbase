"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subscriptions = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const utils_1 = require("../utils");
const SUPPORTED_EVENTS = ["value", "child_added", "child_changed", "child_removed", "mutated", "mutations"];
SUPPORTED_EVENTS.push(...SUPPORTED_EVENTS.map((event) => `notify_${event}`));
class Subscriptions extends ivipbase_core_1.SimpleEventEmitter {
    constructor(dbName, app) {
        super();
        this.dbName = dbName;
        this.app = app;
        this._eventSubscriptions = {};
        this._pendingEvents = new Map();
    }
    initialize() {
        const applyEvent = () => {
            var _a;
            return (_a = this.app.ipc) === null || _a === void 0 ? void 0 : _a.on("triggerEvents", (data) => {
                var _a;
                if (data.dbName !== this.dbName) {
                    return;
                }
                this.triggerAllEvents(data.path, data.oldValue, data.newValue, Object.assign(Object.assign({}, ((_a = data.options) !== null && _a !== void 0 ? _a : {})), { emitIpc: false }));
            });
        };
        this.on("subscribe", () => {
            if (!this._event) {
                this._event = applyEvent();
            }
        });
        this._event = applyEvent();
    }
    forEach(callback) {
        Object.keys(this._eventSubscriptions).forEach((path) => {
            this._eventSubscriptions[path].forEach((sub) => {
                callback(sub.type, path, sub.callback);
            });
        });
    }
    countByPath(path) {
        return (this._eventSubscriptions[path] || []).length;
    }
    /**
     * Adiciona uma assinatura a um nó
     * @param path Caminho para o nó ao qual adicionar a assinatura
     * @param type Tipo da assinatura
     * @param callback Função de retorno de chamada da assinatura
     */
    add(path, type, callback) {
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
        this.emit("subscribe", { path, event: type, callback });
    }
    /**
     * Remove 1 ou mais assinaturas de um nó
     * @param path Caminho para o nó do qual remover a assinatura
     * @param type Tipo de assinatura(s) a ser removido (opcional: se omitido, todos os tipos serão removidos)
     * @param callback Callback a ser removido (opcional: se omitido, todos do mesmo tipo serão removidos)
     */
    remove(path, type, callback) {
        const pathSubs = this._eventSubscriptions[path];
        if (!pathSubs) {
            return;
        }
        const next = () => pathSubs.findIndex((ps) => (type ? ps.type === type : true) && (callback ? ps.callback === callback : true));
        let i;
        while ((i = next()) >= 0) {
            pathSubs.splice(i, 1);
        }
        this.emit("unsubscribe", { path, event: type, callback });
    }
    /**
     * Verifica se existem assinantes no caminho fornecido que precisam do valor anterior do nó quando uma alteração é acionada
     * @param path
     */
    hasValueSubscribersForPath(path) {
        const valueNeeded = this.getValueSubscribersForPath(path);
        return !!valueNeeded;
    }
    /**
     * Obtém todos os assinantes no caminho fornecido que precisam do valor anterior do nó quando uma alteração é acionada
     * @param path
     */
    getValueSubscribersForPath(path) {
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
                        dataPath = childKey !== "" ? ivipbase_core_1.PathInfo.getChildPath(eventPath, childKey) : null;
                    }
                    else if (["child_added", "child_removed"].includes(sub.type) && pathInfo.isChildOf(eventPath)) {
                        //["child_added", "child_removed", "notify_child_added", "notify_child_removed"]
                        const childKey = ivipbase_core_1.PathInfo.getPathKeys(path.slice(eventPath.length).replace(/^\//, ""))[0];
                        dataPath = childKey !== "" ? ivipbase_core_1.PathInfo.getChildPath(eventPath, childKey) : null;
                    }
                    if (dataPath !== null && !valueSubscribers.some((s) => s.type === sub.type && s.eventPath === eventPath)) {
                        valueSubscribers.push({ type: sub.type, eventPath, dataPath, subscriptionPath });
                    }
                });
            }
        });
        return valueSubscribers;
    }
    /**
     * Obtém todos os assinantes no caminho fornecido que possivelmente podem ser acionados após a atualização de um nó
     */
    getAllSubscribersForPath(path) {
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
                        dataPath = childKey !== "" ? ivipbase_core_1.PathInfo.getChildPath(eventPath, childKey) : null;
                    }
                    else if (["mutated", "mutations", "notify_mutated", "notify_mutations"].includes(sub.type)) {
                        dataPath = path;
                    }
                    else if (["child_added", "child_removed", "notify_child_added", "notify_child_removed"].includes(sub.type) &&
                        (pathInfo.isChildOf(eventPath) || path === eventPath || pathInfo.isAncestorOf(eventPath))) {
                        const childKey = path === eventPath || pathInfo.isAncestorOf(eventPath) ? "*" : ivipbase_core_1.PathInfo.getPathKeys(path.slice(eventPath.length).replace(/^\//, ""))[0];
                        dataPath = childKey !== "" ? ivipbase_core_1.PathInfo.getChildPath(eventPath, childKey) : null; //NodePath(subscriptionPath).childPath(childKey);
                    }
                    if (dataPath !== null && !subscribers.some((s) => s.type === sub.type && s.eventPath === eventPath && s.subscriptionPath === subscriptionPath)) {
                        // && subscribers.findIndex(s => s.type === sub.type && s.dataPath === dataPath) < 0
                        subscribers.push({ type: sub.type, eventPath, dataPath, subscriptionPath });
                    }
                });
            }
        });
        return subscribers;
    }
    /**
     * Aciona eventos de assinatura para serem executados em nós relevantes
     * @param event Tipo de evento: "value", "child_added", "child_changed", "child_removed"
     * @param path Caminho para o nó no qual a assinatura está presente
     * @param dataPath Caminho para o nó onde o valor está armazenado
     * @param oldValue Valor antigo
     * @param newValue Novo valor
     * @param context Contexto usado pelo cliente que atualizou esses dados
     */
    trigger(event, path, dataPath, oldValue, newValue, context) {
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
    }
    /**
     * Obtém o impacto de uma atualização no caminho especificado, considerando as assinaturas relevantes.
     * @param path Caminho para a atualização.
     * @param suppressEvents Indica se os eventos devem ser suprimidos.
     * @returns Um objeto contendo informações sobre o impacto da atualização, incluindo caminho de evento superior, assinaturas de evento, assinaturas de valor e indicador de assinaturas de valor existentes.
     */
    getUpdateImpact(path, suppressEvents = false) {
        let topEventPath = path;
        let hasValueSubscribers = false;
        // Obter todas as assinaturas que devem ser executadas nos dados (inclui eventos em nós filhos também)
        const eventSubscriptions = suppressEvents ? [] : this.getAllSubscribersForPath(path);
        // Obter todas as assinaturas para dados neste ou em nós ancestrais, determina quais dados carregar antes do processamento
        const valueSubscribers = suppressEvents ? [] : this.getValueSubscribersForPath(path);
        if (valueSubscribers.length > 0) {
            hasValueSubscribers = true;
            const eventPaths = valueSubscribers
                .map((sub) => {
                return { path: sub.dataPath, keys: ivipbase_core_1.PathInfo.getPathKeys(sub.dataPath) };
            })
                .sort((a, b) => {
                if (a.keys.length < b.keys.length) {
                    return -1;
                }
                else if (a.keys.length > b.keys.length) {
                    return 1;
                }
                return 0;
            });
            const first = eventPaths[0];
            topEventPath = first.path;
            if (valueSubscribers.filter((sub) => sub.dataPath === topEventPath).every((sub) => sub.type === "mutated" || sub.type.startsWith("notify_"))) {
                // Impede o carregamento de todos os dados no caminho, para que apenas as propriedades que mudam sejam carregadas
                hasValueSubscribers = false;
            }
            topEventPath = ivipbase_core_1.PathInfo.fillVariables(topEventPath, path); // Preenche quaisquer curingas no caminho da assinatura
        }
        return { topEventPath, eventSubscriptions, valueSubscribers, hasValueSubscribers };
    }
    /**
     * Executa um callback para cada assinante de valor associado a um caminho, considerando as mudanças nos valores antigo e novo.
     * @param sub Assinante de valor (snapshot) obtido de `this.getValueSubscribersForPath`.
     * @param oldValue Valor antigo.
     * @param newValue Novo valor.
     * @param variables Array de objetos contendo variáveis a serem substituídas no caminho.
     */
    callSubscriberWithValues(sub, currentPath, oldValue, newValue, variables = []) {
        let trigger = true;
        let type = sub.type;
        if (type.startsWith("notify_")) {
            type = type.slice("notify_".length);
        }
        if (type === "mutated") {
            return; // Ignore here, requires different logic
        }
        else if (type === "child_changed" && (oldValue === null || newValue === null)) {
            trigger = false;
        }
        else if (type === "value" || type === "child_changed") {
            const changes = ivipbase_core_1.Utils.compareValues(oldValue, newValue);
            trigger = changes !== "identical";
        }
        else if (type === "child_added") {
            trigger = oldValue === null && newValue !== null;
        }
        else if (type === "child_removed") {
            trigger = oldValue !== null && newValue === null;
        }
        if (!trigger) {
            return;
        }
        const pathKeys = ivipbase_core_1.PathInfo.getPathKeys(sub.dataPath);
        variables.forEach((variable) => {
            // only replaces first occurrence (so multiple *'s will be processed 1 by 1)
            const index = pathKeys.indexOf(variable.name);
            (0, utils_1.assert)(index >= 0, `Variable "${variable.name}" not found in subscription dataPath "${sub.dataPath}"`);
            pathKeys[index] = variable.value;
        });
        const dataPath = pathKeys.reduce((path, key) => (key !== "" ? ivipbase_core_1.PathInfo.getChildPath(path, key) : path), "");
        if (type === "value") {
            oldValue = (0, utils_1.pathValueToObject)(dataPath, currentPath, oldValue);
            newValue = (0, utils_1.pathValueToObject)(dataPath, currentPath, newValue);
        }
        this.trigger(sub.type, sub.subscriptionPath, dataPath, oldValue, newValue, {});
    }
    /**
     * Prepara eventos de mutação com base nas alterações entre um valor antigo e um novo em um determinado caminho.
     * @param currentPath Caminho atual onde as alterações ocorreram.
     * @param oldValue Valor antigo.
     * @param newValue Novo valor.
     * @param compareResult Resultado da comparação entre valores antigo e novo (opcional).
     * @returns Uma matriz de objetos representando as alterações preparadas para eventos de mutação.
     */
    prepareMutationEvents(currentPath, oldValue, newValue, compareResult) {
        const batch = [];
        const result = compareResult || ivipbase_core_1.Utils.compareValues(oldValue, newValue);
        if (result === "identical") {
            return batch; // sem alterações no caminho inscrito
        }
        else if (typeof result === "string") {
            // Estamos em um caminho com uma alteração real
            batch.push({ path: currentPath, oldValue, newValue });
        }
        // else if (oldValue instanceof Array || newValue instanceof Array) {
        //     // Trigger mutated event on the array itself instead of on individual indexes.
        //     // DO convert both arrays to objects because they are sparse
        //     const oldObj = {}, newObj = {};
        //     result.added.forEach(index => {
        //         oldObj[index] = null;
        //         newObj[index] = newValue[index];
        //     });
        //     result.removed.forEach(index => {
        //         oldObj[index] = oldValue[index];
        //         newObj[index] = null;
        //     });
        //     result.changed.forEach(index => {
        //         oldObj[index] = oldValue[index];
        //         newObj[index] = newValue[index];
        //     });
        //     batch.push({ path: currentPath, oldValue: oldObj, newValue: newObj });
        // }
        else {
            // Desabilitado: manipulação de arrays aqui, porque se um cliente estiver usando um banco de dados de cache, isso causará problemas,
            // pois as entradas individuais do array nunca devem ser modificadas.
            // if (oldValue instanceof Array && newValue instanceof Array) {
            //     // Make sure any removed events on arrays will be triggered from last to first
            //     result.removed.sort((a,b) => a < b ? 1 : -1);
            // }
            result.changed.forEach((info) => {
                const childPath = ivipbase_core_1.PathInfo.getChildPath(currentPath, info.key);
                const childValues = ivipbase_core_1.Utils.getChildValues(info.key, oldValue, newValue);
                const childBatch = this.prepareMutationEvents(childPath, childValues.oldValue, childValues.newValue, info.change);
                batch.push(...childBatch);
            });
            result.added.forEach((key) => {
                const childPath = ivipbase_core_1.PathInfo.getChildPath(currentPath, key);
                batch.push({ path: childPath, oldValue: null, newValue: newValue[key] });
            });
            if (oldValue instanceof Array && newValue instanceof Array) {
                result.removed.sort((a, b) => (a < b ? 1 : -1));
            }
            result.removed.forEach((key) => {
                const childPath = ivipbase_core_1.PathInfo.getChildPath(currentPath, key);
                batch.push({ path: childPath, oldValue: oldValue[key], newValue: null });
            });
        }
        return batch;
    }
    triggerAllEvents(path, oldValue, newValue, options = {
        suppress_events: false,
        context: undefined,
        impact: undefined,
    }) {
        var _a;
        const dataChanges = ivipbase_core_1.Utils.compareValues(oldValue, newValue);
        if (dataChanges === "identical") {
            return;
        }
        const inTime = typeof options.inTime === "boolean" ? options.inTime : true;
        if (inTime) {
            let time = this._pendingEvents.get(path);
            clearTimeout(time);
            time = setTimeout(() => {
                this._pendingEvents.delete(path);
                this.triggerAllEvents(path, oldValue, newValue, Object.assign(Object.assign({}, (options !== null && options !== void 0 ? options : {})), { inTime: false }));
            }, 100);
            this._pendingEvents.set(path, time);
            return;
        }
        const emitIpc = typeof options.emitIpc === "boolean" ? options.emitIpc : true;
        if (emitIpc) {
            (_a = this.app.ipc) === null || _a === void 0 ? void 0 : _a.sendTriggerEvents(this.dbName, path, oldValue, newValue, options);
        }
        const updateImpact = options.impact ? options.impact : this.getUpdateImpact(path, options.suppress_events);
        const { topEventPath, eventSubscriptions, hasValueSubscribers, valueSubscribers } = updateImpact;
        // Notifica todas as assinaturas de eventos, deve ser executado com um atraso
        eventSubscriptions
            .filter((sub) => !["mutated", "mutations", "notify_mutated", "notify_mutations"].includes(sub.type))
            .map((sub) => {
            const keys = ivipbase_core_1.PathInfo.getPathKeys(sub.dataPath);
            return {
                sub,
                keys,
            };
        })
            .sort((a, b) => {
            // Os caminhos mais profundos devem ser acionados primeiro, depois subir na árvore
            if (a.keys.length < b.keys.length) {
                return 1;
            }
            else if (a.keys.length > b.keys.length) {
                return -1;
            }
            return 0;
        })
            .forEach(({ sub }) => {
            const process = (currentPath, oldValue, newValue, variables = []) => {
                const trailPath = sub.dataPath.slice(currentPath.length).replace(/^\//, "");
                const trailKeys = ivipbase_core_1.PathInfo.getPathKeys(trailPath);
                while (trailKeys.length > 0) {
                    const subKey = trailKeys.shift();
                    if (typeof subKey === "string" && (subKey === "*" || subKey[0] === "$")) {
                        // Disparar em todas as chaves de filhos relevantes
                        const allKeys = !oldValue ? [] : Object.keys(oldValue).map((key) => (oldValue instanceof Array ? parseInt(key) : key));
                        newValue !== null &&
                            Object.keys(newValue).forEach((key) => {
                                const keyOrIndex = newValue instanceof Array ? parseInt(key) : key;
                                !allKeys.includes(keyOrIndex) && allKeys.push(key);
                            });
                        allKeys.forEach((key) => {
                            const childValues = ivipbase_core_1.Utils.getChildValues(key, oldValue, newValue);
                            const vars = variables.concat({ name: subKey, value: key });
                            if (trailKeys.length === 0) {
                                this.callSubscriberWithValues(sub, path, childValues.oldValue, childValues.newValue, vars);
                            }
                            else {
                                process(ivipbase_core_1.PathInfo.getChildPath(currentPath, subKey), childValues.oldValue, childValues.newValue, vars);
                            }
                        });
                        return; // Podemos interromper o processamento
                    }
                    else if ((typeof subKey === "string" || typeof subKey === "number") && subKey !== "") {
                        currentPath = ivipbase_core_1.PathInfo.getChildPath(currentPath, subKey);
                        const childValues = ivipbase_core_1.Utils.getChildValues(subKey, oldValue, newValue);
                        oldValue = childValues.oldValue;
                        newValue = childValues.newValue;
                    }
                }
                this.callSubscriberWithValues(sub, path, oldValue, newValue, variables);
            };
            if (sub.type.startsWith("notify_") && ivipbase_core_1.PathInfo.get(sub.eventPath).isAncestorOf(topEventPath)) {
                // Notificar evento em um caminho superior ao qual carregamos dados
                // Podemos acionar o evento de notificação no caminho assinado
                // Por exemplo:
                // path === 'users/ewout', updates === { name: 'Ewout Stortenbeker' }
                // sub.path === 'users' ou '', sub.type === 'notify_child_changed'
                // => OK para acionar se dataChanges !== 'removed' e 'added'
                const isOnParentPath = ivipbase_core_1.PathInfo.get(sub.eventPath).isParentOf(topEventPath);
                const trigger = sub.type === "notify_value" ||
                    (sub.type === "notify_child_changed" && (!isOnParentPath || !["added", "removed"].includes(dataChanges))) ||
                    (sub.type === "notify_child_removed" && dataChanges === "removed" && isOnParentPath) ||
                    (sub.type === "notify_child_added" && dataChanges === "added" && isOnParentPath);
                trigger && this.trigger(sub.type, sub.subscriptionPath, sub.dataPath, null, null, options.context);
            }
            else {
                // A assinatura está no caminho atual ou mais profundo
                process(topEventPath, oldValue, newValue);
            }
        });
        // Os únicos eventos que não processamos agora são eventos 'mutated'.
        // Eles requerem lógica diferente: os chamaremos para todas as propriedades aninhadas do caminho atualizado, que
        // realmente mudaram. Eles não se propagam como 'child_changed' faz.
        const mutationEvents = eventSubscriptions.filter((sub) => ["mutated", "mutations", "notify_mutated", "notify_mutations"].includes(sub.type));
        mutationEvents.forEach((sub) => {
            // Obter os dados de destino nos quais esta assinatura está interessada
            let currentPath = topEventPath;
            // const trailPath = sub.eventPath.slice(currentPath.length).replace(/^\//, ''); // eventPath pode conter variáveis e * ?
            const trailKeys = ivipbase_core_1.PathInfo.getPathKeys(sub.eventPath).slice(ivipbase_core_1.PathInfo.getPathKeys(currentPath).length); //PathInfo.getPathKeys(trailPath);
            const events = [];
            const processNextTrailKey = (target, currentTarget, oldValue, newValue, vars) => {
                if (target.length === 0) {
                    // Add it
                    return events.push({ target: currentTarget, oldValue, newValue, vars });
                }
                const subKey = target[0];
                const keys = new Set();
                const isWildcardKey = typeof subKey === "string" && (subKey === "*" || subKey.startsWith("$"));
                if (isWildcardKey) {
                    // Recursivo para cada chave em oldValue e newValue
                    if (oldValue !== null && typeof oldValue === "object") {
                        Object.keys(oldValue).forEach((key) => keys.add(key));
                    }
                    if (newValue !== null && typeof newValue === "object") {
                        Object.keys(newValue).forEach((key) => keys.add(key));
                    }
                }
                else {
                    keys.add(subKey); // apenas uma chave específica
                }
                for (const key of keys) {
                    const childValues = ivipbase_core_1.Utils.getChildValues(key, oldValue, newValue);
                    oldValue = childValues.oldValue;
                    newValue = childValues.newValue;
                    processNextTrailKey(target.slice(1), currentTarget.concat(key), oldValue, newValue, isWildcardKey ? vars.concat({ name: subKey, value: key }) : vars);
                }
            };
            processNextTrailKey(trailKeys, [], oldValue, newValue, []);
            for (const event of events) {
                const targetPath = ivipbase_core_1.PathInfo.get(currentPath).child(event.target).path;
                const batch = this.prepareMutationEvents(targetPath, event.oldValue, event.newValue);
                if (batch.length === 0) {
                    continue;
                }
                const isNotifyEvent = sub.type.startsWith("notify_");
                if (["mutated", "notify_mutated"].includes(sub.type)) {
                    // Enviar todas as mutações uma por uma
                    batch.forEach((mutation, index) => {
                        const context = options.context; // const context = cloneObject(options.context);
                        // context.acebase_mutated_event = { nr: index + 1, total: batch.length }; // Adicionar informações de contexto sobre o número de mutações
                        const prevVal = isNotifyEvent ? null : mutation.oldValue;
                        const newVal = isNotifyEvent ? null : mutation.newValue;
                        this.trigger(sub.type, sub.subscriptionPath, mutation.path, prevVal, newVal, context);
                    });
                }
                else if (["mutations", "notify_mutations"].includes(sub.type)) {
                    // Enviar 1 lote com todas as mutações
                    // const oldValues = isNotifyEvent ? null : batch.map(m => ({ target: PathInfo.getPathKeys(mutation.path.slice(sub.subscriptionPath.length)), val: m.oldValue })); // batch.reduce((obj, mutation) => (obj[mutation.path.slice(sub.subscriptionPath.length).replace(/^\//, '') || '.'] = mutation.oldValue, obj), {});
                    // const newValues = isNotifyEvent ? null : batch.map(m => ({ target: PathInfo.getPathKeys(mutation.path.slice(sub.subscriptionPath.length)), val: m.newValue })) //batch.reduce((obj, mutation) => (obj[mutation.path.slice(sub.subscriptionPath.length).replace(/^\//, '') || '.'] = mutation.newValue, obj), {});
                    const subscriptionPathKeys = ivipbase_core_1.PathInfo.getPathKeys(sub.subscriptionPath);
                    const values = isNotifyEvent ? null : batch.map((m) => ({ target: ivipbase_core_1.PathInfo.getPathKeys(m.path).slice(subscriptionPathKeys.length), prev: m.oldValue, val: m.newValue }));
                    const dataPath = ivipbase_core_1.PathInfo.get(ivipbase_core_1.PathInfo.getPathKeys(targetPath).slice(0, subscriptionPathKeys.length)).path;
                    this.trigger(sub.type, sub.subscriptionPath, dataPath, null, values, options.context);
                }
            }
        });
    }
}
exports.Subscriptions = Subscriptions;
//# sourceMappingURL=Subscriptions.js.map