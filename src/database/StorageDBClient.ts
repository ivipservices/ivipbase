import { Api, Types } from "ivipbase-core";
import type { DataBase } from ".";

export class StorageDBClient extends Api {
	public cache: { [path: string]: any } = {};

	constructor(readonly db: DataBase) {
		super();
		this.db.emit("ready");
	}

	async stats(): Promise<{
		writes: number;
		reads: number;
		bytesRead: number;
		bytesWritten: number;
	}> {
		return {
			writes: 0,
			reads: 0,
			bytesRead: 0,
			bytesWritten: 0,
		};
	}

	subscribe(path: string, event: string, callback: Types.EventSubscriptionCallback, settings?: Types.EventSubscriptionSettings) {
		this.db.subscriptions.add(path, event, callback);
	}

	unsubscribe(path: string, event?: string, callback?: Types.EventSubscriptionCallback) {
		this.db.subscriptions.remove(path, event, callback);
	}
}
