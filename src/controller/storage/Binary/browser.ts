import { PathInfo, Types } from "ivipbase-core";
import { StorageNode, StorageNodeInfo } from "../MDE";

export default class Binary {
	constructor(readonly filePath: string, readonly numCPUs: number = 1) {}

	async get(path: string | Array<string | number | PathInfo> | PathInfo): Promise<StorageNodeInfo[]> {
		return Promise.resolve([]);
	}

	async remove(path: string | Array<string | number | PathInfo> | PathInfo): Promise<void> {
		return Promise.resolve();
	}

	async set(path: string | Array<string | number | PathInfo> | PathInfo, content: StorageNode): Promise<void> {
		return Promise.resolve();
	}

	async query(path: string | Array<string | number | PathInfo> | PathInfo, query: Types.Query, options: Types.QueryOptions): Promise<StorageNodeInfo[]> {
		return Promise.resolve([]);
	}
}
