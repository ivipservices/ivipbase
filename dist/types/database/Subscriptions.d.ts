import { Types } from "ivipbase-core";
export declare class Subscriptions {
    private _eventSubscriptions;
    /**
     * Adiciona uma assinatura a um nó
     * @param path Caminho para o nó ao qual adicionar a assinatura
     * @param type Tipo da assinatura
     * @param callback Função de retorno de chamada da assinatura
     */
    add(path: string, type: string, callback: Types.EventSubscriptionCallback): void;
    /**
     * Remove 1 ou mais assinaturas de um nó
     * @param path Caminho para o nó do qual remover a assinatura
     * @param type Tipo de assinatura(s) a ser removido (opcional: se omitido, todos os tipos serão removidos)
     * @param callback Callback a ser removido (opcional: se omitido, todos do mesmo tipo serão removidos)
     */
    remove(path: string, type?: string, callback?: Types.EventSubscriptionCallback): void;
    /**
     * Verifica se existem assinantes no caminho fornecido que precisam do valor anterior do nó quando uma alteração é acionada
     * @param path
     */
    hasValueSubscribersForPath(path: string): boolean;
    /**
     * Obtém todos os assinantes no caminho fornecido que precisam do valor anterior do nó quando uma alteração é acionada
     * @param path
     */
    getValueSubscribersForPath(path: string): {
        type: string;
        eventPath: string;
        dataPath: string;
        subscriptionPath: string;
    }[];
    /**
     * Obtém todos os assinantes no caminho fornecido que possivelmente podem ser acionados após a atualização de um nó
     */
    getAllSubscribersForPath(path: string): {
        type: string;
        eventPath: string;
        dataPath: string;
        subscriptionPath: string;
    }[];
    /**
     * Aciona eventos de assinatura para serem executados em nós relevantes
     * @param event Tipo de evento: "value", "child_added", "child_changed", "child_removed"
     * @param path Caminho para o nó no qual a assinatura está presente
     * @param dataPath Caminho para o nó onde o valor está armazenado
     * @param oldValue Valor antigo
     * @param newValue Novo valor
     * @param context Contexto usado pelo cliente que atualizou esses dados
     */
    trigger(event: string, path: string, dataPath: string, oldValue: any, newValue: any, context: any): void;
    /**
     * Obtém o impacto de uma atualização no caminho especificado, considerando as assinaturas relevantes.
     * @param path Caminho para a atualização.
     * @param suppressEvents Indica se os eventos devem ser suprimidos.
     * @returns Um objeto contendo informações sobre o impacto da atualização, incluindo caminho de evento superior, assinaturas de evento, assinaturas de valor e indicador de assinaturas de valor existentes.
     */
    getUpdateImpact(path: string, suppressEvents?: boolean): {
        topEventPath: string;
        eventSubscriptions: {
            type: string;
            eventPath: string;
            dataPath: string;
            subscriptionPath: string;
        }[];
        valueSubscribers: {
            type: string;
            eventPath: string;
            dataPath: string;
            subscriptionPath: string;
        }[];
        hasValueSubscribers: boolean;
    };
    /**
     * Executa um callback para cada assinante de valor associado a um caminho, considerando as mudanças nos valores antigo e novo.
     * @param sub Assinante de valor (snapshot) obtido de `this.getValueSubscribersForPath`.
     * @param oldValue Valor antigo.
     * @param newValue Novo valor.
     * @param variables Array de objetos contendo variáveis a serem substituídas no caminho.
     */
    callSubscriberWithValues(sub: ReturnType<typeof this.getValueSubscribersForPath>[0], currentPath: string, oldValue: any, newValue: any, variables?: Array<{
        name: string;
        value: string | number;
    }>): void;
    /**
     * Prepara eventos de mutação com base nas alterações entre um valor antigo e um novo em um determinado caminho.
     * @param currentPath Caminho atual onde as alterações ocorreram.
     * @param oldValue Valor antigo.
     * @param newValue Novo valor.
     * @param compareResult Resultado da comparação entre valores antigo e novo (opcional).
     * @returns Uma matriz de objetos representando as alterações preparadas para eventos de mutação.
     */
    prepareMutationEvents(currentPath: string, oldValue: any, newValue: any, compareResult?: Types.ValueCompareResult): {
        path: string;
        oldValue: typeof oldValue;
        newValue: typeof newValue;
    }[];
    triggerAllEvents(path: string, oldValue: any, newValue: any, options?: Partial<{
        tid: string | number;
        suppress_events: boolean;
        context: any;
        impact: ReturnType<Subscriptions["getUpdateImpact"]>;
    }>): void;
}
//# sourceMappingURL=Subscriptions.d.ts.map