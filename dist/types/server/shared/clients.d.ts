/// <reference types="node" />
import { Types } from "ivipbase-core";
import { DbUserAccountDetails } from "../schema/user";
import { HttpSocket } from "..";
export declare class ConnectedClient {
    socket: HttpSocket;
    readonly id: string;
    /**
     *
     * @param socket Socket object used by the framework
     * @param id optional: use if the socket object does not have an `id` property.
     */
    constructor(socket: HttpSocket, id?: string);
    readonly connectedDate: Date;
    /** user details if this socket client is signed in */
    user?: DbUserAccountDetails;
    /** Active event subscriptions for this client */
    subscriptions: {
        [path: string]: Array<{
            path: string;
            event: string;
            callback: Types.EventSubscriptionCallback;
        }>;
    };
    /** Active realtime query subscriptions for this client */
    realtimeQueries: {
        [id: string]: {
            path: string;
            query: Types.Query;
            options: Types.QueryOptions;
        };
    };
    /** Currently running transactions */
    transactions: {
        [id: string]: {
            id: string;
            started: number;
            path: string;
            context: any;
            finish?: (val?: any) => Promise<{
                cursor?: string;
            }>;
            timeout: NodeJS.Timeout;
        };
    };
}
//# sourceMappingURL=clients.d.ts.map