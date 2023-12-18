import { CustomStorage } from "./CustomStorage";
import { StorageNode, StorageNodeInfo } from "./MDE";

export class JsonFileStorageSettings {
	filePath: string = "";

	constructor(options: Partial<JsonFileStorageSettings> = {}) {
		if (typeof options.filePath === "string") {
			this.filePath = options.filePath;
		}
	}
}

export class JsonFileStorage extends CustomStorage {
	constructor(options: Partial<JsonFileStorageSettings> = {}) {
		super();
	}

	async getMultiple(expression: RegExp): Promise<StorageNodeInfo[]> {
		return [];
	}

	async setNode(path: string, content: StorageNode, node: StorageNodeInfo) {}

	async removeNode(path: string, content: StorageNode, node: StorageNodeInfo) {}
}
