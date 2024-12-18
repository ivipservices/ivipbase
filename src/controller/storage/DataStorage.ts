import { Utils } from "ivipbase-core";
import { AppError, ERROR_FACTORY } from "../erros";
import { CustomStorage, CustomStorageSettings } from "./CustomStorage";
import { StorageNode, StorageNodeInfo } from "./MDE";
import { IvipBaseApp } from "../../app";

export class DataStorageSettings extends CustomStorageSettings implements Omit<CustomStorageSettings, "getMultiple" | "setNode" | "removeNode"> {
	constructor(options: Partial<Omit<CustomStorageSettings, "getMultiple" | "setNode" | "removeNode">> = {}) {
		super(options);
	}
}

export class DataStorage extends CustomStorage {
	private data: Record<string, Map<string, StorageNode>> = {};

	constructor(database: string | string[], options: Partial<Omit<CustomStorageSettings, "getMultiple" | "setNode" | "removeNode">> = {}, app: IvipBaseApp) {
		super(options, app);
		this.dbName = "TempStorage";

		(Array.isArray(database) ? database : [database])
			.filter((name) => typeof name === "string" && name.trim() !== "")
			.forEach((name) => {
				this.data[name] = new Map<string, StorageNode>();
			});

		this.emit("ready");
	}

	async getMultiple(database: string, { regex }: { regex: RegExp; query: string[] }): Promise<StorageNodeInfo[]> {
		if (!this.data[database]) {
			throw ERROR_FACTORY.create(AppError.DB_NOT_FOUND, { dbName: database });
		}

		const list: StorageNodeInfo[] = [];
		this.data[database].forEach((content, path) => {
			if (regex.test(path)) {
				if (content) {
					list.push(Utils.cloneObject({ path, content }));
				}
			}
		});
		return list;
	}

	async setNode(database: string, path: string, content: StorageNode) {
		if (!this.data[database]) {
			throw ERROR_FACTORY.create(AppError.DB_NOT_FOUND, { dbName: database });
		}

		this.data[database].set(path, content);
	}

	async removeNode(database: string, path: string) {
		if (!this.data[database]) {
			throw ERROR_FACTORY.create(AppError.DB_NOT_FOUND, { dbName: database });
		}

		this.data[database].delete(path);
	}
}
