import { NodesPending, StorageNode, StorageNodeInfo } from "./NodeInfo";
/**
 * Responsável pela mesclagem de nodes soltos, apropriado para evitar conflitos de dados.
 *
 * @param {string} path - Caminho do node a ser processado.
 * @param {StorageNodeInfo[]} nodes - Lista de nodes a serem processados.
 * @param {StorageNodeInfo[]} comparison - Lista de nodes para comparação.
 *
 * @returns {{
 *   result: StorageNodeInfo[];
 *   added: StorageNodeInfo[];
 *   modified: StorageNodeInfo[];
 *   removed: StorageNodeInfo[];
 * }} Retorna uma lista de informações sobre os nodes de acordo com seu estado.
 */
export default function prepareMergeNodes(path: string, nodes: NodesPending[], comparison: NodesPending[], options?: Partial<{
    onAdded?: (node: StorageNodeInfo) => Promise<void> | void;
    onModified?: (node: StorageNodeInfo & {
        previous_content?: StorageNode;
    }) => Promise<void> | void;
    onRemoved?: (node: StorageNodeInfo) => Promise<void> | void;
}>): Promise<{
    result: StorageNodeInfo[];
    added: StorageNodeInfo[];
    modified: (StorageNodeInfo & {
        previous_content?: StorageNode;
    })[];
    removed: StorageNodeInfo[];
}>;
//# sourceMappingURL=prepareMergeNodes.d.ts.map