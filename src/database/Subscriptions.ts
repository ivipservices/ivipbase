import { Types, PathInfo, Utils, SimpleEventEmitter } from "ivipbase-core";
import { assert, pathValueToObject } from "../utils";
import { IvipBaseApp } from "../app";
import { clear } from "console";

const SUPPORTED_EVENTS = ["value", "child_added", "child_changed", "child_removed", "mutated", "mutations"];
SUPPORTED_EVENTS.push(...SUPPORTED_EVENTS.map((event) => `notify_${event}`));

export class Subscriptions extends SimpleEventEmitter {
	private _eventSubscriptions = {} as { [path: string]: Array<{ created: number; type: string; callback: Types.EventSubscriptionCallback }> };
	private _event: Types.SimpleEventEmitterProperty | undefined;

	constructor(readonly dbName: string, readonly app: IvipBaseApp) {
		super();
	}

	initialize() {
		const applyEvent = () => {
			return this.app.ipc?.on("triggerEvents", (data: any) => {
				if (data.dbName !== this.dbName) {
					return;
				}
				this.triggerAllEvents(data.path, data.oldValue, data.newValue, {
					...(data.options ?? {}),
					emitIpc: false,
				});
			});
		};

		this.on("subscribe", () => {
			if (!this._event) {
				this._event = applyEvent();
			}
		});

		this._event = applyEvent();
	}

	forEach(callback: (event: string, path: string, callback: Types.EventSubscriptionCallback) => void) {
		Object.keys(this._eventSubscriptions).forEach((path) => {
			this._eventSubscriptions[path].forEach((sub) => {
				callback(sub.type, path, sub.callback);
			});
		});
	}

	countByPath(path: string) {
		return (this._eventSubscriptions[path] || []).length;
	}

	/**
	 * Adiciona uma assinatura a um nó
	 * @param path Caminho para o nó ao qual adicionar a assinatura
	 * @param type Tipo da assinatura
	 * @param callback Função de retorno de chamada da assinatura
	 */
	add(path: string, type: string, callback: Types.EventSubscriptionCallback) {
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
	remove(path: string, type?: string, callback?: Types.EventSubscriptionCallback) {
		const pathSubs = this._eventSubscriptions[path];
		if (!pathSubs) {
			return;
		}
		const next = () => pathSubs.findIndex((ps) => (type ? ps.type === type : true) && (callback ? ps.callback === callback : true));
		let i: number;
		while ((i = next()) >= 0) {
			pathSubs.splice(i, 1);
		}
		this.emit("unsubscribe", { path, event: type, callback });
	}

	/**
	 * Verifica se existem assinantes no caminho fornecido que precisam do valor anterior do nó quando uma alteração é acionada
	 * @param path
	 */
	hasValueSubscribersForPath(path: string) {
		const valueNeeded = this.getValueSubscribersForPath(path);
		return !!valueNeeded;
	}

	/**
	 * Obtém todos os assinantes no caminho fornecido que precisam do valor anterior do nó quando uma alteração é acionada
	 * @param path
	 */
	getValueSubscribersForPath(path: string) {
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
							dataPath = childKey !== "" ? PathInfo.getChildPath(eventPath, childKey) : null;
						} else if (["child_added", "child_removed"].includes(sub.type) && pathInfo.isChildOf(eventPath)) {
							//["child_added", "child_removed", "notify_child_added", "notify_child_removed"]
							const childKey = PathInfo.getPathKeys(path.slice(eventPath.length).replace(/^\//, ""))[0];
							dataPath = childKey !== "" ? PathInfo.getChildPath(eventPath, childKey) : null;
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
	getAllSubscribersForPath(path: string) {
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
						dataPath = childKey !== "" ? PathInfo.getChildPath(eventPath, childKey) : null;
					} else if (["mutated", "mutations", "notify_mutated", "notify_mutations"].includes(sub.type)) {
						dataPath = path;
					} else if (
						["child_added", "child_removed", "notify_child_added", "notify_child_removed"].includes(sub.type) &&
						(pathInfo.isChildOf(eventPath) || path === eventPath || pathInfo.isAncestorOf(eventPath))
					) {
						const childKey = path === eventPath || pathInfo.isAncestorOf(eventPath) ? "*" : PathInfo.getPathKeys(path.slice(eventPath.length).replace(/^\//, ""))[0];
						dataPath = childKey !== "" ? PathInfo.getChildPath(eventPath, childKey) : null; //NodePath(subscriptionPath).childPath(childKey);
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
	async trigger(event: string, path: string, dataPath: string, oldValue: any, newValue: any, context: any) {
		//console.warn(`Event "${event}" triggered on node "/${path}" with data of "/${dataPath}": `, newValue);
		if (["value", "child_added", "child_changed", "child_removed"].includes(event) && ["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(newValue))) {
			await new Promise<void>((resolve) => {
				let timer: NodeJS.Timeout;

				const callback: Types.EventSubscriptionCallback = (err, mutatedPath, value, previous) => {
					clearTimeout(timer);

					if (!err) {
						const propertyTrail = PathInfo.getPathKeys(mutatedPath.slice(dataPath.length + 1));

						const asingObj = (obj: any, value: any, insist: boolean = true) => {
							if (["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(obj)) !== true) {
								return;
							}

							let targetObject = obj;
							const targetProperty = propertyTrail.slice(-1)[0];

							for (let p of propertyTrail.slice(0, -1)) {
								if (!(p in targetObject)) {
									if (!insist) {
										return;
									}
									targetObject[p] = typeof p === "number" ? [] : {};
								}
								targetObject = targetObject[p];
							}

							if (value === null) {
								delete targetObject[targetProperty];
							} else {
								targetObject[targetProperty] = value;
							}
						};

						asingObj(newValue, value);
						asingObj(oldValue, previous, false);
					}

					timer = setTimeout(() => {
						this.remove(dataPath, "mutated", callback);
						resolve();
					}, 1000);
				};

				this.add(dataPath, "mutated", callback);

				timer = setTimeout(() => {
					this.remove(dataPath, "mutated", callback);
					resolve();
				}, 1000);
			});
		}

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
	getUpdateImpact(path: string, suppressEvents: boolean = false) {
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
					return { path: sub.dataPath, keys: PathInfo.getPathKeys(sub.dataPath) };
				})
				.sort((a, b) => {
					if (a.keys.length < b.keys.length) {
						return -1;
					} else if (a.keys.length > b.keys.length) {
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
			topEventPath = PathInfo.fillVariables(topEventPath, path); // Preenche quaisquer curingas no caminho da assinatura
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
	callSubscriberWithValues(
		sub: ReturnType<typeof this.getValueSubscribersForPath>[0],
		currentPath: string,
		oldValue: any,
		newValue: any,
		variables: Array<{ name: string; value: string | number }> = [],
	) {
		let trigger = true;
		let type = sub.type;
		if (type.startsWith("notify_")) {
			type = type.slice("notify_".length);
		}
		if (type === "mutated") {
			return; // Ignore here, requires different logic
		} else if (type === "child_changed" && (oldValue === null || newValue === null)) {
			trigger = false;
		} else if (type === "value" || type === "child_changed") {
			const changes = Utils.compareValues(oldValue, newValue);
			trigger = changes !== "identical";
		} else if (type === "child_added") {
			trigger = oldValue === null && newValue !== null;
		} else if (type === "child_removed") {
			trigger = oldValue !== null && newValue === null;
		}
		if (!trigger) {
			return;
		}

		const pathKeys = PathInfo.getPathKeys(sub.dataPath);
		variables.forEach((variable) => {
			// only replaces first occurrence (so multiple *'s will be processed 1 by 1)
			const index = pathKeys.indexOf(variable.name);
			assert(index >= 0, `Variable "${variable.name}" not found in subscription dataPath "${sub.dataPath}"`);
			pathKeys[index] = variable.value;
		});
		const dataPath = pathKeys.reduce<string>((path, key) => (key !== "" ? PathInfo.getChildPath(path, key) : path), "");

		if (type === "value") {
			oldValue = pathValueToObject(dataPath, currentPath, oldValue);
			newValue = pathValueToObject(dataPath, currentPath, newValue);
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
	prepareMutationEvents(currentPath: string, oldValue: any, newValue: any, compareResult?: Types.ValueCompareResult) {
		const batch = [] as Array<{ path: string; oldValue: typeof oldValue; newValue: typeof newValue }>;
		const result = compareResult || Utils.compareValues(oldValue, newValue);
		if (result === "identical") {
			return batch; // sem alterações no caminho inscrito
		} else if (typeof result === "string") {
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
				const childPath = PathInfo.getChildPath(currentPath, info.key);
				const childValues = Utils.getChildValues(info.key, oldValue, newValue);
				const childBatch = this.prepareMutationEvents(childPath, childValues.oldValue, childValues.newValue, info.change);
				batch.push(...childBatch);
			});
			result.added.forEach((key) => {
				const childPath = PathInfo.getChildPath(currentPath, key);
				batch.push({ path: childPath, oldValue: null, newValue: newValue[key] });
			});
			if (oldValue instanceof Array && newValue instanceof Array) {
				result.removed.sort((a, b) => (a < b ? 1 : -1));
			}
			result.removed.forEach((key) => {
				const childPath = PathInfo.getChildPath(currentPath, key);
				batch.push({ path: childPath, oldValue: oldValue[key], newValue: null });
			});
		}
		return batch;
	}

	triggerAllEvents(
		path: string,
		oldValue: any,
		newValue: any,
		options: Partial<{
			tid: string | number;
			suppress_events: boolean;
			context: any;
			impact: ReturnType<Subscriptions["getUpdateImpact"]>;
			emitIpc: boolean;
		}> = {
			suppress_events: false,
			context: undefined,
			impact: undefined,
		},
	) {
		const dataChanges = Utils.compareValues(oldValue, newValue);
		if (dataChanges === "identical") {
			return;
		}

		const emitIpc = typeof options.emitIpc === "boolean" ? options.emitIpc : true;

		if (emitIpc) {
			this.app.ipc?.sendTriggerEvents(this.dbName, path, oldValue, newValue, options);
		}

		const updateImpact = options.impact ? options.impact : this.getUpdateImpact(path, options.suppress_events);
		const { topEventPath, eventSubscriptions, hasValueSubscribers, valueSubscribers } = updateImpact;

		// Notifica todas as assinaturas de eventos, deve ser executado com um atraso
		eventSubscriptions
			.filter((sub) => !["mutated", "mutations", "notify_mutated", "notify_mutations"].includes(sub.type))
			.map((sub) => {
				const keys = PathInfo.getPathKeys(sub.dataPath);
				return {
					sub,
					keys,
				};
			})
			.sort((a, b) => {
				// Os caminhos mais profundos devem ser acionados primeiro, depois subir na árvore
				if (a.keys.length < b.keys.length) {
					return 1;
				} else if (a.keys.length > b.keys.length) {
					return -1;
				}
				return 0;
			})
			.forEach(({ sub }) => {
				const process = (currentPath: string, oldValue: any, newValue: any, variables: Array<{ name: string; value: string | number }> = []) => {
					const trailPath = sub.dataPath.slice(currentPath.length).replace(/^\//, "");
					const trailKeys = PathInfo.getPathKeys(trailPath);
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
								const childValues = Utils.getChildValues(key, oldValue, newValue);
								const vars = variables.concat({ name: subKey, value: key });
								if (trailKeys.length === 0) {
									this.callSubscriberWithValues(sub, path, childValues.oldValue, childValues.newValue, vars);
								} else {
									process(PathInfo.getChildPath(currentPath, subKey), childValues.oldValue, childValues.newValue, vars);
								}
							});
							return; // Podemos interromper o processamento
						} else if ((typeof subKey === "string" || typeof subKey === "number") && subKey !== "") {
							currentPath = PathInfo.getChildPath(currentPath, subKey);
							const childValues = Utils.getChildValues(subKey, oldValue, newValue);
							oldValue = childValues.oldValue;
							newValue = childValues.newValue;
						}
					}
					this.callSubscriberWithValues(sub, path, oldValue, newValue, variables);
				};

				if (sub.type.startsWith("notify_") && PathInfo.get(sub.eventPath).isAncestorOf(topEventPath)) {
					// Notificar evento em um caminho superior ao qual carregamos dados
					// Podemos acionar o evento de notificação no caminho assinado
					// Por exemplo:
					// path === 'users/ewout', updates === { name: 'Ewout Stortenbeker' }
					// sub.path === 'users' ou '', sub.type === 'notify_child_changed'
					// => OK para acionar se dataChanges !== 'removed' e 'added'

					const isOnParentPath = PathInfo.get(sub.eventPath).isParentOf(topEventPath);
					const trigger =
						sub.type === "notify_value" ||
						(sub.type === "notify_child_changed" && (!isOnParentPath || !["added", "removed"].includes(dataChanges as string))) ||
						(sub.type === "notify_child_removed" && dataChanges === "removed" && isOnParentPath) ||
						(sub.type === "notify_child_added" && dataChanges === "added" && isOnParentPath);
					trigger && this.trigger(sub.type, sub.subscriptionPath, sub.dataPath, null, null, options.context);
				} else {
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
			const trailKeys = PathInfo.getPathKeys(sub.eventPath).slice(PathInfo.getPathKeys(currentPath).length); //PathInfo.getPathKeys(trailPath);

			const events = [] as Array<{
				target: (string | number)[];
				vars: Array<{ name: string; value: string | number }>;
				oldValue: any;
				newValue: any;
			}>;

			const processNextTrailKey = (target: typeof trailKeys, currentTarget: typeof trailKeys, oldValue: any, newValue: any, vars: Array<{ name: string; value: string | number }>) => {
				if (target.length === 0) {
					// Add it
					return events.push({ target: currentTarget, oldValue, newValue, vars });
				}
				const subKey = target[0];
				const keys = new Set<typeof subKey>();
				const isWildcardKey = typeof subKey === "string" && (subKey === "*" || subKey.startsWith("$"));
				if (isWildcardKey) {
					// Recursivo para cada chave em oldValue e newValue
					if (oldValue !== null && typeof oldValue === "object") {
						Object.keys(oldValue).forEach((key) => keys.add(key));
					}
					if (newValue !== null && typeof newValue === "object") {
						Object.keys(newValue).forEach((key) => keys.add(key));
					}
				} else {
					keys.add(subKey); // apenas uma chave específica
				}
				for (const key of keys) {
					const childValues = Utils.getChildValues(key, oldValue, newValue);
					oldValue = childValues.oldValue;
					newValue = childValues.newValue;
					processNextTrailKey(target.slice(1), currentTarget.concat(key), oldValue, newValue, isWildcardKey ? vars.concat({ name: subKey, value: key }) : vars);
				}
			};
			processNextTrailKey(trailKeys, [], oldValue, newValue, []);
			for (const event of events) {
				const targetPath = PathInfo.get(currentPath).child(event.target).path;
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
				} else if (["mutations", "notify_mutations"].includes(sub.type)) {
					// Enviar 1 lote com todas as mutações
					// const oldValues = isNotifyEvent ? null : batch.map(m => ({ target: PathInfo.getPathKeys(mutation.path.slice(sub.subscriptionPath.length)), val: m.oldValue })); // batch.reduce((obj, mutation) => (obj[mutation.path.slice(sub.subscriptionPath.length).replace(/^\//, '') || '.'] = mutation.oldValue, obj), {});
					// const newValues = isNotifyEvent ? null : batch.map(m => ({ target: PathInfo.getPathKeys(mutation.path.slice(sub.subscriptionPath.length)), val: m.newValue })) //batch.reduce((obj, mutation) => (obj[mutation.path.slice(sub.subscriptionPath.length).replace(/^\//, '') || '.'] = mutation.newValue, obj), {});
					const subscriptionPathKeys = PathInfo.getPathKeys(sub.subscriptionPath);
					const values = isNotifyEvent ? null : batch.map((m) => ({ target: PathInfo.getPathKeys(m.path).slice(subscriptionPathKeys.length), prev: m.oldValue, val: m.newValue }));
					const dataPath = PathInfo.get(PathInfo.getPathKeys(targetPath).slice(0, subscriptionPathKeys.length)).path;
					this.trigger(sub.type, sub.subscriptionPath, dataPath, null, values, options.context);
				}
			}
		});
	}
}
