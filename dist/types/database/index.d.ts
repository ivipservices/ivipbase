import { DataBase as DataBaseCore, DataBaseSettings, Types } from "ivipbase-core";
import { IvipBaseApp } from "../app";
export declare class DataBase extends DataBaseCore {
    readonly app: IvipBaseApp;
    constructor(app?: string | IvipBaseApp | undefined, options?: Partial<DataBaseSettings>);
    private _eventSubscriptions;
    subscriptions: {
        /**
         * Adiciona uma assinatura a um nó
         * @param path Caminho para o nó ao qual adicionar a assinatura
         * @param type Tipo da assinatura
         * @param callback Função de retorno de chamada da assinatura
         */
        add: (path: string, type: string, callback: Types.EventSubscriptionCallback) => void;
        /**
         * Remove 1 ou mais assinaturas de um nó
         * @param path Caminho para o nó do qual remover a assinatura
         * @param type Tipo de assinatura(s) a ser removido (opcional: se omitido, todos os tipos serão removidos)
         * @param callback Callback a ser removido (opcional: se omitido, todos do mesmo tipo serão removidos)
         */
        remove: (path: string, type?: string, callback?: Types.EventSubscriptionCallback) => void;
        /**
         * Verifica se existem assinantes no caminho fornecido que precisam do valor anterior do nó quando uma alteração é acionada
         * @param path
         */
        hasValueSubscribersForPath(path: string): boolean;
        /**
         * Obtém todos os assinantes no caminho fornecido que precisam do valor anterior do nó quando uma alteração é acionada
         * @param path
         */
        getValueSubscribersForPath: (path: string) => {
            type: string;
            eventPath: string;
            dataPath: string;
            subscriptionPath: string;
        }[];
        /**
         * Obtém todos os assinantes no caminho fornecido que possivelmente podem ser acionados após a atualização de um nó
         */
        getAllSubscribersForPath: (path: string) => {
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
        trigger: (event: string, path: string, dataPath: string, oldValue: any, newValue: any, context: any) => void;
    };
}
export declare function getDatabase(app?: string | IvipBaseApp | undefined, options?: Partial<DataBaseSettings>): DataBase;
//# sourceMappingURL=index.d.ts.map