import { IvipBaseApp } from "../app";
import { Types } from "ivipbase-core";
/**
 *
 * @param storage Instância de armazenamento de destino
 * @param dbName Nome do banco de dados
 * @param path Caminho da coleção de objetos para executar a consulta
 * @param query Consulta a ser executada
 * @param options Opções adicionais
 * @returns Retorna uma promise que resolve com os dados ou caminhos correspondentes em `results`
 */
export declare function executeQuery(api: IvipBaseApp, database: string, path: string, query: Types.Query, options?: Types.QueryOptions): Promise<{
    results: Array<{
        path: string;
        val: any;
    }> | string[];
    context: any;
    stop(): Promise<void>;
}>;
export default executeQuery;
//# sourceMappingURL=executeQuery.d.ts.map