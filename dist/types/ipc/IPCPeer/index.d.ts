import { IMessage, IvipBaseIPCPeer } from "../ipc";
export declare class IPCPeer extends IvipBaseIPCPeer {
    protected name: string;
    constructor(name: string);
    sendMessage(dbname: string, message: IMessage): void;
    exit(code?: number): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map