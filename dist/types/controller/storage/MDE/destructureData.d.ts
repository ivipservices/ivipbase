import { NodesPending, StorageNode } from "./NodeInfo";
type ModifiedNode = NodesPending & {
    previous_content?: StorageNode;
};
export default function destructureData(type: Exclude<NodesPending["type"], "VERIFY" | undefined>, path: string, data: any, options: {
    assert_revision?: string | undefined;
    include_checks?: boolean | undefined;
    previous_result?: NodesPending[] | undefined;
    maxInlineValueSize: number;
} | undefined, byNodes: NodesPending[]): Promise<{
    result: NodesPending[];
    added: NodesPending[];
    modified: ModifiedNode[];
    removed: NodesPending[];
}>;
export {};
//# sourceMappingURL=destructureData.d.ts.map