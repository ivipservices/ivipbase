import { NodesPending, StorageNodeInfo } from "./NodeInfo";
import type MDE from ".";
/**
 * Responsável pela mesclagem de nodes soltos, apropriado para evitar conflitos de dados.
 *
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
export default function prepareMergeNodes(this: MDE, nodes: StorageNodeInfo[] | NodesPending[], comparison?: StorageNodeInfo[] | NodesPending[] | undefined): {
    result: StorageNodeInfo[];
    added: StorageNodeInfo[];
    modified: StorageNodeInfo[];
    removed: StorageNodeInfo[];
};
//# sourceMappingURL=prepareMergeNodes.d.ts.map