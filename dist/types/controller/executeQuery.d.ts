import { Types } from "ivipbase-core";
import { DataBase } from "../database";
export declare const executeFilters: (value: any, queryFilters: Types.QueryFilter[]) => boolean;
export declare const executeQueryRealtime: (db: DataBase, path: string, query: Types.Query, options: Types.QueryOptions, matchedPaths: string[]) => () => Promise<void>;
/**
 *
 * @param storage Instância de armazenamento de destino
 * @param dbName Nome do banco de dados
 * @param path Caminho da coleção de objetos para executar a consulta
 * @param query Consulta a ser executada
 * @param options Opções adicionais
 * @returns Retorna uma promise que resolve com os dados ou caminhos correspondentes em `results`
 */
export declare function executeQuery(db: DataBase, path: string, query: Types.Query, options?: Types.QueryOptions): Promise<{
    results: Array<{
        path: string;
        val: any;
    }> | string[];
    context: any;
    stop(): Promise<void>;
    isMore: boolean;
}>;
export default executeQuery;
//# sourceMappingURL=executeQuery.d.ts.map