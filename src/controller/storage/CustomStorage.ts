import { AppError, ERROR_FACTORY } from "../erros";
import MDE, { MDESettings, StorageNode, StorageNodeInfo } from "./MDE";

export class CustomStorageSettings extends MDESettings implements Omit<MDESettings, "getMultiple" | "setNode" | "removeNode"> {
	constructor(options: Partial<Omit<MDESettings, "getMultiple" | "setNode" | "removeNode">> = {}) {
		super(options);
	}
}

export abstract class CustomStorage extends MDE {
	dbName: string = "CustomStorage";
	ready: boolean = false;

	constructor(options: Partial<Omit<MDESettings, "getMultiple" | "setNode" | "removeNode">> = {}) {
		super({
			...options,
			getMultiple: (database, e) => {
				if (!this.ready) {
					throw ERROR_FACTORY.create(AppError.DB_DISCONNECTED, { dbName: this.dbName });
				}
				return this.getMultiple(database, e);
			},
			setNode: (database, path, content, node) => {
				if (!this.ready) {
					throw ERROR_FACTORY.create(AppError.DB_DISCONNECTED, { dbName: this.dbName });
				}
				return this.setNode(database, path, content, node);
			},
			removeNode: (database, path, content, node) => {
				if (!this.ready) {
					throw ERROR_FACTORY.create(AppError.DB_DISCONNECTED, { dbName: this.dbName });
				}
				return this.removeNode(database, path, content, node);
			},
		});
	}

	abstract getMultiple(database: string, expression: RegExp): Promise<StorageNodeInfo[]>;

	abstract setNode(database: string, path: string, content: StorageNode, node: StorageNodeInfo): Promise<any>;

	abstract removeNode(database: string, path: string, content: StorageNode, node: StorageNodeInfo): Promise<any>;
}
