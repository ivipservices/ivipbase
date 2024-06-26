import { PathInfo, SimpleEventEmitter } from "ivipbase-core";
import { StorageNodeInfo } from "./NodeInfo";
export declare class NTree extends SimpleEventEmitter {
    private nodes;
    private rootPath;
    private removedNodes;
    private addedNodes;
    private updatedNodes;
    private indexes;
    private tree;
    constructor(nodes: StorageNodeInfo[]);
    get path(): string;
    applyNodes(nodes: StorageNodeInfo[]): NTree;
    static createBy(nodes: StorageNodeInfo[]): NTree;
    hasNode(path: string | (string | number | PathInfo)[]): boolean;
    getNodeBy(path: string | (string | number | PathInfo)[]): StorageNodeInfo | undefined;
    getChildNodesBy(path: string | (string | number | PathInfo)[]): StorageNodeInfo[];
    strucuture(path: string | (string | number | PathInfo)[], options?: {
        include?: Array<string | number>;
        exclude?: Array<string | number>;
        main_path?: string;
    }): null | any;
    destructure(type: "SET" | "UPDATE", path: string | (string | number | PathInfo)[], data: any, options?: {
        assert_revision?: string;
        include_checks?: boolean;
        previous_result?: StorageNodeInfo[];
        maxInlineValueSize: number;
    }): NTree;
}
export default NTree;
//# sourceMappingURL=NTree.d.ts.map