import { AppError, ERROR_FACTORY } from "../erros";
import MDE, { MDESettings, StorageNode, StorageNodeInfo } from "./MDE";

export type CustomStorageSettings = Partial<Exclude<MDESettings, "getMultiple" | "setNode" | "removeNode">>;

export abstract class CustomStorage extends MDE {
	dbName: string = "CustomStorage";
	ready: boolean = false;

	constructor(options: CustomStorageSettings = {}) {
		super({
			...options,
			getMultiple: (e) => {
				if (!this.ready) {
					throw ERROR_FACTORY.create(AppError.DB_DISCONNECTED, { dbName: this.dbName });
				}
				return this.getMultiple(e);
			},
			setNode: (path, content, node) => {
				if (!this.ready) {
					throw ERROR_FACTORY.create(AppError.DB_DISCONNECTED, { dbName: this.dbName });
				}
				return this.setNode(path, content, node);
			},
			removeNode: (path, content, node) => {
				if (!this.ready) {
					throw ERROR_FACTORY.create(AppError.DB_DISCONNECTED, { dbName: this.dbName });
				}
				return this.removeNode(path, content, node);
			},
		});
	}

	abstract getMultiple(expression: RegExp): Promise<StorageNodeInfo[]>;

	abstract setNode(path: string, content: StorageNode, node: StorageNodeInfo): Promise<any>;

	abstract removeNode(path: string, content: StorageNode, node: StorageNodeInfo): Promise<any>;
}
