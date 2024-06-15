import { NodesPending } from "./NodeInfo";
export default function destructureData(type: Exclude<NodesPending["type"], "VERIFY" | undefined>, path: string, data: any, options?: {
    assert_revision?: string;
    include_checks?: boolean;
    previous_result?: NodesPending[];
    maxInlineValueSize: number;
}): NodesPending[];
//# sourceMappingURL=destructureData.d.ts.map