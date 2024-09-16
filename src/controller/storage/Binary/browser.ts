import { PathInfo, Types } from "ivipbase-core";

export default class Binary {
	constructor(readonly filePath: string, readonly numCPUs: number = 1) {}

	async get<T = any>(path: string | Array<string | number | PathInfo> | PathInfo): Promise<T | null> {
		return Promise.resolve(null);
	}

	async remove(path: string | Array<string | number | PathInfo> | PathInfo): Promise<void> {
		return Promise.resolve();
	}

	async set<T = any>(path: string | Array<string | number | PathInfo> | PathInfo, value: T): Promise<void> {
		return Promise.resolve();
	}

	async query<T = any>(path: string | Array<string | number | PathInfo> | PathInfo, query: Types.Query, options: Types.QueryOptions): Promise<Array<T | null>> {
		return Promise.resolve([]);
	}
}
