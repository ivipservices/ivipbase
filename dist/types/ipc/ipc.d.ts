import { DebugLogger, SimpleEventEmitter, Types } from "ivipbase-core";
export declare class AIvipBaseIPCPeerExitingError extends Error {
    constructor(message: string);
}
interface TriggerEventsData {
    dbName: string;
    path: string;
    oldValue: any;
    newValue: any;
    options: Partial<{
        tid: string | number;
        suppress_events: boolean;
        context: any;
    }>;
}
export declare abstract class IvipBaseIPCPeer extends SimpleEventEmitter {
    protected id: string;
    protected name: string;
    readonly debug: DebugLogger;
    protected masterPeerId: string;
    protected ipcType: string;
    get isMaster(): boolean;
    protected peers: Array<{
        id: string;
        lastSeen: number;
    }>;
    protected _exiting: boolean;
    private _requests;
    constructor(id: string, name: string);
    on<d = TriggerEventsData>(event: "triggerEvents", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
    on<d = undefined>(event: "exit", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
    on<d = any>(event: "notification", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
    on<d = ICustomRequestMessage>(event: "request", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
    on<d = IvipBaseIPCPeer>(event: "connect", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
    emit(event: "triggerEvents", data: TriggerEventsData): this;
    emit(event: "exit", data: undefined): this;
    emit(event: "notification", data: any): this;
    emit(event: "request", data: IMessage): this;
    emit(event: "connect", data: IvipBaseIPCPeer): this;
    /**
     * Requests the peer to shut down. Resolves once its locks are cleared and 'exit' event has been emitted.
     * Has to be overridden by the IPC implementation to perform custom shutdown tasks
     * @param code optional exit code (eg one provided by SIGINT event)
     */
    exit(code?: number): Promise<any>;
    protected sayGoodbye(forPeerId: string): void;
    protected addPeer(id: string, sendReply?: boolean): void;
    protected removePeer(id: string, ignoreUnknown?: boolean): void;
    protected handleMessage(message: IMessage): Promise<void | this>;
    private request;
    protected abstract sendMessage(message: IMessage): any;
    sendRequest(request: any): Promise<any>;
    replyRequest(requestMessage: IRequestMessage, result: any): void;
    sendNotification(notification: any): void;
    sendTriggerEvents(dbname: string, path: string, oldValue: any, newValue: any, options?: Partial<{
        tid: string | number;
        suppress_events: boolean;
        context: any;
    }>): void;
}
export interface IMessage {
    /**
     * name of the target database. Needed when multiple database use the same communication channel
     */
    dbname?: string;
    /**
     * Message type, determines how to handle data
     */
    type: string;
    /**
     * Who sends this message
     */
    from: string;
    /**
     * Who is this message for (not present for broadcast messages)
     */
    to?: string;
    /**
     * Optional payload
     */
    data?: any;
}
export interface IHelloMessage extends IMessage {
    type: "hello";
    data: void;
}
export interface IByeMessage extends IMessage {
    type: "bye";
    data: void;
}
export interface ICustomNotificationMessage extends IMessage {
    type: "notification";
    data: any;
}
export interface IRequestMessage extends IMessage {
    id: string;
}
export interface IResponseMessage extends IMessage {
    id: string;
    ok: boolean;
    reason?: string;
}
export interface ICustomRequestMessage extends IRequestMessage {
    type: "request";
    data?: any;
}
export {};
//# sourceMappingURL=ipc.d.ts.map