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
    on<TriggerEventsData>(event: "triggerEvents", callback: (data: TriggerEventsData) => void): Types.SimpleEventEmitterProperty;
    on<undefined>(event: "exit", callback: (data: undefined) => void): Types.SimpleEventEmitterProperty;
    on<IMessage>(event: "notification", callback: (data: IMessage) => void): Types.SimpleEventEmitterProperty;
    on<IMessage>(event: "request", callback: (data: IMessage) => void): Types.SimpleEventEmitterProperty;
    emit(event: "triggerEvents", data: TriggerEventsData): this;
    emit(event: "exit", data: undefined): this;
    emit(event: "notification", data: IMessage): this;
    emit(event: "request", data: IMessage): this;
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
    /**
     * Sends a custom request to the IPC master
     * @param request
     * @returns
     */
    sendRequest(dbname: string, request: any): Promise<any>;
    replyRequest(dbname: string, requestMessage: IRequestMessage, result: any): void;
    /**
     * Sends a custom notification to all IPC peers
     * @param notification
     * @returns
     */
    sendNotification(dbname: string, notification: any): void;
    sendTriggerEvents(dbname: string, path: string, oldValue: any, newValue: any, options?: Partial<{
        tid: string | number;
        suppress_events: boolean;
        context: any;
    }>): void;
}
export type IvipBaseSubscribeCallback = (error: Error | null, path: string, newValue: any, oldValue: any, eventContext: any) => void;
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
export interface IPulseMessage extends IMessage {
    type: "pulse";
    data: void;
}
export interface ICustomNotificationMessage extends IMessage {
    type: "notification";
    data: any;
}
export type IvipBaseEventType = string;
export interface ISubscriptionData {
    path: string;
    event: IvipBaseEventType;
}
export interface ISubscribeMessage extends IMessage {
    type: "subscribe";
    data: ISubscriptionData;
}
export interface IUnsubscribeMessage extends IMessage {
    type: "unsubscribe";
    data: ISubscriptionData;
}
export interface IEventMessage extends IMessage {
    type: "event";
    event: IvipBaseEventType;
    /**
     * Path the subscription is on
     */
    path: string;
    data: {
        /**
         * The path the event fires on
         */
        path: string;
        val?: any;
        previous?: any;
        context: any;
    };
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