import { NodesPending } from "./NodeInfo";
import type MDE from ".";
export default function destructureData(this: MDE, type: Exclude<NodesPending["type"], "VERIFY" | undefined>, path: string, data: any, options?: {
    assert_revision?: string;
    include_checks?: boolean;
    previous_result?: NodesPending[];
}): NodesPending[];
//# sourceMappingURL=destructureData.d.ts.map