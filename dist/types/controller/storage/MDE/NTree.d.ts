import { PathInfo, SimpleEventEmitter, Types } from "ivipbase-core";
import { StorageNodeInfo } from "./NodeInfo";
export declare class NTree extends SimpleEventEmitter {
    readonly database: string;
    private nodes;
    private _ready;
    private rootPath;
    private indexes;
    private tree;
    constructor(database: string, nodes: StorageNodeInfo[]);
    once<d = {
        dbName: string;
        name: "remove";
        path: string;
        value: any;
        previous: undefined;
    }>(event: "remove", callback: (data: d) => void): Promise<d>;
    once<d = {
        dbName: string;
        name: "change";
        path: string;
        value: any;
        previous: any;
    }>(event: "change", callback: (data: d) => void): Promise<d>;
    once<d = {
        dbName: string;
        name: "add";
        path: string;
        value: any;
        previous: undefined;
    }>(event: "add", callback: (data: d) => void): Promise<d>;
    once<d = undefined>(event: "ready", callback: (data: d) => void): Promise<d>;
    on<d = {
        dbName: string;
        name: "remove";
        path: string;
        content: StorageNodeInfo["content"];
        value: any;
        previous: undefined;
    }>(event: "remove", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
    on<d = {
        dbName: string;
        name: "change";
        path: string;
        content: StorageNodeInfo["content"];
        value: any;
        previous: any;
    }>(event: "change", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
    on<d = {
        dbName: string;
        name: "add";
        path: string;
        content: StorageNodeInfo["content"];
        value: any;
        previous: undefined;
    }>(event: "add", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
    on<d = undefined>(event: "ready", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
    emit(event: "remove", data: StorageNodeInfo): this;
    emit(event: "change", data: StorageNodeInfo & {
        previous_content?: StorageNodeInfo["content"];
    }): this;
    emit(event: "add", data: StorageNodeInfo): this;
    emit(event: "ready", data?: any): this;
    ready(callback?: () => void): Promise<void>;
    get path(): string;
    pushIndex(node: StorageNodeInfo): void;
    applyNodes(nodes: StorageNodeInfo[]): Promise<NTree>;
    static createBy(database: string, nodes: StorageNodeInfo[]): NTree;
    hasNode(path: string | (string | number | PathInfo)[]): boolean;
    getNodeBy(path: string | (string | number | PathInfo)[]): StorageNodeInfo | undefined;
    getChildPathsBy(path: string | (string | number | PathInfo)[]): Promise<string[]>;
    getChildNodesBy(path: string | (string | number | PathInfo)[]): Promise<StorageNodeInfo[]>;
    get(path: string | (string | number | PathInfo)[], options?: {
        include?: Array<string | number>;
        exclude?: Array<string | number>;
        main_path?: string;
    }): Promise<null | any>;
    remove(path: string | (string | number | PathInfo)[]): Promise<void>;
    verifyParents(path: string | (string | number | PathInfo)[], options: {
        assert_revision?: string;
    }): Promise<void>;
    set(path: string | (string | number | PathInfo)[], data: any, options?: {
        maxInlineValueSize: number;
    }): Promise<void>;
    update(path: string | (string | number | PathInfo)[], data: any, options?: {
        maxInlineValueSize: number;
    }): Promise<void>;
    private destructure;
    findChildsBy(path: string | (string | number | PathInfo)[], query: Types.Query): Promise<void>;
}
export default NTree;
//# sourceMappingURL=NTree.d.ts.map