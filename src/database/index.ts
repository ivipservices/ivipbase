import { DataBase as DataBaseCore, Api, Types, PathInfo, DataBaseSettings } from "ivipbase-core";
import { IvipBaseApp, getApp, getFirstApp, getAppsName } from "../app";
import { StorageDBServer } from "./StorageDBServer";
import { StorageDBClient } from "./StorageDBClient";

const SUPPORTED_EVENTS = ["value", "child_added", "child_changed", "child_removed", "mutated", "mutations"];
SUPPORTED_EVENTS.push(...SUPPORTED_EVENTS.map((event) => `notify_${event}`));

export class DataBase extends DataBaseCore {
	constructor(readonly database: string, readonly app: IvipBaseApp, options?: Partial<DataBaseSettings>) {
		super(database, options);

		this.storage = app.isServer || !app.settings.isValidClient ? new StorageDBServer(this) : new StorageDBClient(this);

		this.emitOnce("ready");
	}

	private _eventSubscriptions = {} as { [path: string]: Array<{ created: number; type: string; callback: Types.EventSubscriptionCallback }> };
	public subscriptions = {
		/**
		 * Adiciona uma assinatura a um nó
		 * @param path Caminho para o nó ao qual adicionar a assinatura
		 * @param type Tipo da assinatura
		 * @param callback Função de retorno de chamada da assinatura
		 */
		add: (path: string, type: string, callback: Types.EventSubscriptionCallback) => {
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
		remove: (path: string, type?: string, callback?: Types.EventSubscriptionCallback) => {
			const pathSubs = this._eventSubscriptions[path];
			if (!pathSubs) {
				return;
			}
			const next = () => pathSubs.findIndex((ps) => (type ? ps.type === type : true) && (callback ? ps.callback === callback : true));
			let i: number;
			while ((i = next()) >= 0) {
				pathSubs.splice(i, 1);
			}
			//this.emit('unsubscribe', { path, event: type, callback });
		},

		/**
		 * Verifica se existem assinantes no caminho fornecido que precisam do valor anterior do nó quando uma alteração é acionada
		 * @param path
		 */
		hasValueSubscribersForPath(path: string) {
			const valueNeeded = this.getValueSubscribersForPath(path);
			return !!valueNeeded;
		},

		/**
		 * Obtém todos os assinantes no caminho fornecido que precisam do valor anterior do nó quando uma alteração é acionada
		 * @param path
		 */
		getValueSubscribersForPath: (path: string) => {
			// Assinantes que DEVEM ter o valor anterior completo de um nó antes da atualização:
			//  - Eventos "value" no próprio caminho e em qualquer caminho ancestral
			//  - Eventos "child_added", "child_removed" no caminho pai
			//  - Eventos "child_changed" no caminho pai e em seus ancestrais
			//  - TODOS os eventos em caminhos filhos/descendentes
			const pathInfo = new PathInfo(path);
			const valueSubscribers = [] as Array<{ type: string; eventPath: string; dataPath: string; subscriptionPath: string }>;
			Object.keys(this._eventSubscriptions).forEach((subscriptionPath) => {
				if (pathInfo.equals(subscriptionPath) || pathInfo.isDescendantOf(subscriptionPath)) {
					// Caminho sendo atualizado === subscriptionPath, ou um caminho filho/descendente dele
					// por exemplo, caminho === "posts/123/title"
					// e subscriptionPath é "posts/123/title", "posts/$postId/title", "posts/123", "posts/*", "posts", etc.
					const pathSubs = this._eventSubscriptions[subscriptionPath];
					const eventPath = PathInfo.fillVariables(subscriptionPath, path);
					pathSubs
						.filter((sub) => !sub.type.startsWith("notify_")) // Eventos de notificação não precisam de carregamento de valor adicional
						.forEach((sub) => {
							let dataPath: null | string = null;
							if (sub.type === "value") {
								// ["value", "notify_value"].includes(sub.type)
								dataPath = eventPath;
							} else if (["mutated", "mutations"].includes(sub.type) && pathInfo.isDescendantOf(eventPath)) {
								//["mutated", "notify_mutated"].includes(sub.type)
								dataPath = path; // A única informação necessária são as propriedades sendo atualizadas no caminho alvo
							} else if (sub.type === "child_changed" && path !== eventPath) {
								// ["child_changed", "notify_child_changed"].includes(sub.type)
								const childKey = PathInfo.getPathKeys(path.slice(eventPath.length).replace(/^\//, ""))[0];
								dataPath = PathInfo.getChildPath(eventPath, childKey);
							} else if (["child_added", "child_removed"].includes(sub.type) && pathInfo.isChildOf(eventPath)) {
								//["child_added", "child_removed", "notify_child_added", "notify_child_removed"]
								const childKey = PathInfo.getPathKeys(path.slice(eventPath.length).replace(/^\//, ""))[0];
								dataPath = PathInfo.getChildPath(eventPath, childKey);
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
		getAllSubscribersForPath: (path: string) => {
			const pathInfo = PathInfo.get(path);
			const subscribers = [] as Array<{ type: string; eventPath: string; dataPath: string; subscriptionPath: string }>;
			Object.keys(this._eventSubscriptions).forEach((subscriptionPath) => {
				// if (pathInfo.equals(subscriptionPath) //path === subscriptionPath
				//     || pathInfo.isDescendantOf(subscriptionPath)
				//     || pathInfo.isAncestorOf(subscriptionPath)
				// ) {
				if (pathInfo.isOnTrailOf(subscriptionPath)) {
					const pathSubs = this._eventSubscriptions[subscriptionPath];
					const eventPath = PathInfo.fillVariables(subscriptionPath, path);

					pathSubs.forEach((sub) => {
						let dataPath: null | string = null;
						if (sub.type === "value" || sub.type === "notify_value") {
							dataPath = eventPath;
						} else if (["child_changed", "notify_child_changed"].includes(sub.type)) {
							const childKey = path === eventPath || pathInfo.isAncestorOf(eventPath) ? "*" : PathInfo.getPathKeys(path.slice(eventPath.length).replace(/^\//, ""))[0];
							dataPath = PathInfo.getChildPath(eventPath, childKey);
						} else if (["mutated", "mutations", "notify_mutated", "notify_mutations"].includes(sub.type)) {
							dataPath = path;
						} else if (
							["child_added", "child_removed", "notify_child_added", "notify_child_removed"].includes(sub.type) &&
							(pathInfo.isChildOf(eventPath) || path === eventPath || pathInfo.isAncestorOf(eventPath))
						) {
							const childKey = path === eventPath || pathInfo.isAncestorOf(eventPath) ? "*" : PathInfo.getPathKeys(path.slice(eventPath.length).replace(/^\//, ""))[0];
							dataPath = PathInfo.getChildPath(eventPath, childKey); //NodePath(subscriptionPath).childPath(childKey);
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
		trigger: (event: string, path: string, dataPath: string, oldValue: any, newValue: any, context: any) => {
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
}

export function getDatabase(): DataBase;
export function getDatabase(app: string | IvipBaseApp | undefined): DataBase;
export function getDatabase(app: string | IvipBaseApp | undefined, options: Partial<DataBaseSettings>): DataBase;
export function getDatabase(database: string): DataBase;
export function getDatabase(database: string, app: string | IvipBaseApp | undefined): DataBase;
export function getDatabase(database: string, app: string | IvipBaseApp | undefined, options: Partial<DataBaseSettings>): DataBase;
export function getDatabase(...args: any[]) {
	let app: IvipBaseApp = args.find((a) => a instanceof IvipBaseApp);
	const appNames = getAppsName();

	if (!app) {
		const name = appNames.find((n) => args.includes(n));
		app = name ? getApp(name) : getFirstApp();
	}

	let database: string | string[] = args.find((d) => typeof d === "string" && appNames.includes(d) !== true);

	if (typeof database !== "string") {
		database = app.settings.dbname;
	}

	return new DataBase(
		(Array.isArray(database) ? database : [database])[0],
		app,
		args.find((s) => typeof s === "object" && !(s instanceof IvipBaseApp)),
	);
}
