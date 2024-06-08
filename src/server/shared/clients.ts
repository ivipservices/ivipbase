import { Types } from "ivipbase-core";
import { DbUserAccountDetails } from "../schema/user";
import { HttpSocket } from "..";

export class ConnectedClient {
	readonly id: string;

	/**
	 *
	 * @param socket Socket object used by the framework
	 * @param id optional: use if the socket object does not have an `id` property.
	 */
	constructor(public socket: HttpSocket, id?: string) {
		this.id = id ?? socket.id;
		if (!this.id) {
			throw new Error("Socket has no id");
		}
	}
	// get id() { return this.socket.id; };
	readonly connectedDate: Date = new Date();

	/** user details if this socket client is signed in */
	user: Map<string, DbUserAccountDetails> = new Map();

	/** Active event subscriptions for this client */
	subscriptions: { [dbName: string]: { [path: string]: Array<{ path: string; event: string; callback: Types.EventSubscriptionCallback }> } } = {};

	/** Active realtime query subscriptions for this client */
	realtimeQueries: { [dbName: string]: { [id: string]: { path: string; query: Types.Query; options: Types.QueryOptions; stop: () => Promise<void> } } } = {};

	/** Currently running transactions */
	transactions: { [dbName: string]: { [id: string]: { id: string; started: number; path: string; context: any; finish?: (val?: any) => Promise<{ cursor?: string }>; timeout: NodeJS.Timeout } } } =
		{};

	disconnected: boolean = false;
}
