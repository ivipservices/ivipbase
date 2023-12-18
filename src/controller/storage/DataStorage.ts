import { CustomStorage, CustomStorageSettings } from "./CustomStorage";
import { StorageNode, StorageNodeInfo } from "./MDE";

export class DataStorageSettings extends CustomStorageSettings implements Omit<CustomStorageSettings, "getMultiple" | "setNode" | "removeNode"> {
	constructor(options: Partial<Omit<CustomStorageSettings, "getMultiple" | "setNode" | "removeNode">> = {}) {
		super(options);
	}
}

export class DataStorage extends CustomStorage {
	data = new Map<string, StorageNode>();

	constructor(options: Partial<Omit<CustomStorageSettings, "getMultiple" | "setNode" | "removeNode">> = {}) {
		super(options);
		this.dbName = "TempStorage";
		this.ready = true;
	}

	async getMultiple(expression: RegExp): Promise<StorageNodeInfo[]> {
		const list: StorageNodeInfo[] = [];
		for (let path in this.data) {
			if (expression.test(path)) {
				const content = this.data.get(path);
				if (content) {
					list.push({ path, content });
				}
			}
		}
		return list;
	}

	async setNode(path: string, content: StorageNode) {
		this.data.set(path, content);
	}

	async removeNode(path: string) {
		this.data.delete(path);
	}
}
