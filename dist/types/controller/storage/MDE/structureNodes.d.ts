import { StorageNodeInfo } from "./NodeInfo";
export declare const checkIncludedPath: (from: string, options: {
    include?: Array<string | number>;
    exclude?: Array<string | number>;
    main_path: string;
}) => boolean;
export declare const resolveObjetByIncluded: <t extends Object>(path: string, obj: t, options: {
    include?: Array<string | number>;
    exclude?: Array<string | number>;
    main_path: string;
}) => t;
export default function structureNodes(path: string, nodes: StorageNodeInfo[], options?: {
    include?: Array<string | number>;
    exclude?: Array<string | number>;
    main_path?: string;
}): any;
//# sourceMappingURL=structureNodes.d.ts.map