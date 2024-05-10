import { DebugLogger } from "ivipbase-core";
import { AppError, ERROR_FACTORY } from "../erros";
import MDE, { MDESettings, StorageNode, StorageNodeInfo } from "./MDE";

export class CustomStorageSettings extends MDESettings implements Omit<MDESettings, "getMultiple" | "setNode" | "removeNode"> {
	constructor(options: Partial<Omit<MDESettings, "getMultiple" | "setNode" | "removeNode">> = {}) {
		super(options);
	}
}

export abstract class CustomStorage extends MDE {
	private _dbName: string = "CustomStorage";
	private logLevel: "verbose" | "log" | "warn" | "error" = "log";
	private _debug: DebugLogger;

	constructor(options: Partial<Omit<MDESettings, "getMultiple" | "setNode" | "removeNode"> & { logLevel: "verbose" | "log" | "warn" | "error" }> = {}) {
		const { logLevel, ..._options } = options;
		super({
			..._options,
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

		this.logLevel = logLevel || "log";
		this._debug = new DebugLogger(this.logLevel, `[${this.dbName}]`);
	}

	get dbName(): string {
		return this._dbName;
	}

	set dbName(value: string) {
		this._dbName = value;
		this._debug = new DebugLogger(this.logLevel, `[${this._dbName}]`);
	}

	get debug(): DebugLogger {
		return this._debug;
	}

	abstract getMultiple(database: string, expression: RegExp): Promise<StorageNodeInfo[]>;

	abstract setNode(database: string, path: string, content: StorageNode, node: StorageNodeInfo): Promise<any>;

	abstract removeNode(database: string, path: string, content: StorageNode, node: StorageNodeInfo): Promise<any>;
}
