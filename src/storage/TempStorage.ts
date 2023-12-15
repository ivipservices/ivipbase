import { CustomStorage, CustomStorageSettings } from "./CustomStorage";
import { StorageNode, StorageNodeInfo } from "./MDE";

export class TempStorage extends CustomStorage {
	data = new Map<string, StorageNode>();

	constructor(options: CustomStorageSettings = {}) {
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
