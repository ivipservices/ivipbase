import { IvipBaseIPCPeer, IMessage } from "../ipc";
/**
 * Browser tabs IPC. Database changes and events will be synchronized automatically.
 * Locking of resources will be done by the election of a single locking master:
 * the one with the lowest id.
 */
export declare class IPCPeer extends IvipBaseIPCPeer {
    protected name: string;
    private channel?;
    constructor(name: string);
    sendMessage(message: IMessage): void;
}
//# sourceMappingURL=browser.d.ts.map