import { Types } from "ivipbase-core";
import { DbUserAccountDetails } from "../schema/user";
import { HttpSocket } from "..";

export class ConnectedClient {
	readonly id: string;
	readonly dbName: string;

	/**
	 *
	 * @param socket Socket object used by the framework
	 * @param id optional: use if the socket object does not have an `id` property.
	 */
	constructor(public socket: HttpSocket, dbName: string, id?: string) {
		this.dbName = dbName;
		this.id = id ?? socket.id;
		if (!this.id) {
			throw new Error("Socket has no id");
		}
	}
	// get id() { return this.socket.id; };
	readonly connectedDate: Date = new Date();

	/** user details if this socket client is signed in */
	user?: DbUserAccountDetails;

	/** Active event subscriptions for this client */
	subscriptions: { [path: string]: Array<{ path: string; event: string; callback: Types.EventSubscriptionCallback }> } = {};

	/** Active realtime query subscriptions for this client */
	realtimeQueries: { [id: string]: { path: string; query: Types.Query; options: Types.QueryOptions } } = {};

	/** Currently running transactions */
	transactions: { [id: string]: { id: string; started: number; path: string; context: any; finish?: (val?: any) => Promise<{ cursor?: string }>; timeout: NodeJS.Timeout } } = {};

	disconnected: boolean = false;
}
