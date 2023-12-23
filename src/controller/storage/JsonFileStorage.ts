import { CustomStorage } from "./CustomStorage";
import { StorageNode, StorageNodeInfo } from "./MDE";
import * as fs from "fs";
import * as path from "path";
import { dirname } from "path";
import { AppError, ERROR_FACTORY } from "../erros";
import { Utils } from "ivipbase-core";

const dirnameRoot = dirname(require.resolve("."));

export class JsonFileStorageSettings {
	filePath: string = "";

	constructor(options: Partial<JsonFileStorageSettings> = {}) {
		if (typeof options.filePath === "string") {
			this.filePath = path.resolve(path.dirname((process as any).pkg ? process.execPath : require.main ? require.main.filename : process.argv[0]), options.filePath);
		}
	}
}

export class JsonFileStorage extends CustomStorage {
	readonly options: JsonFileStorageSettings;
	private data: Record<string, Map<string, StorageNode>> = {};
	private timeForSaveFile?: NodeJS.Timeout;

	constructor(database: string | string[], options: Partial<JsonFileStorageSettings> = {}) {
		super();
		this.options = new JsonFileStorageSettings(options);

		(Array.isArray(database) ? database : [database])
			.filter((name) => typeof name === "string" && name.trim() !== "")
			.forEach((name) => {
				this.data[name] = new Map<string, StorageNode>();
			});

		fs.access(this.options.filePath, fs.constants.F_OK, (err) => {
			if (err) {
				this.emitOnce("ready");
			} else {
				fs.readFile(this.options.filePath, "utf8", (err, data) => {
					if (err) {
						throw `Erro ao ler o arquivo: ${err}`;
					}

					try {
						const jsonData: Record<
							string,
							Array<{
								path: string;
								content: StorageNode;
							}>
						> = JSON.parse(data);

						for (let name in jsonData) {
							this.data[name] = new Map<string, StorageNode>(jsonData[name].map((item) => [item.path, item.content]));
						}
					} catch (parseError) {
						throw `Erro ao fazer o parse do JSON: ${String(parseError)}`;
					}

					this.emitOnce("ready");
				});
			}
		});
	}

	async getMultiple(database: string, expression: RegExp): Promise<StorageNodeInfo[]> {
		if (!this.data[database]) {
			throw ERROR_FACTORY.create(AppError.DB_NOT_FOUND, { dbName: database });
		}

		const list: StorageNodeInfo[] = [];
		this.data[database].forEach((content, path) => {
			if (expression.test(path)) {
				if (content) {
					list.push({ path, content });
				}
			}
		});
		return list;
	}

	async setNode(database: string, path: string, content: StorageNode, node: StorageNodeInfo) {
		if (!this.data[database]) {
			throw ERROR_FACTORY.create(AppError.DB_NOT_FOUND, { dbName: database });
		}

		this.data[database].set(path, content);
		this.saveFile();
	}

	async removeNode(database: string, path: string, content: StorageNode, node: StorageNodeInfo) {
		if (!this.data[database]) {
			throw ERROR_FACTORY.create(AppError.DB_NOT_FOUND, { dbName: database });
		}

		this.data[database].delete(path);
		this.saveFile();
	}

	saveFile() {
		clearTimeout(this.timeForSaveFile);
		this.timeForSaveFile = setTimeout(() => {
			const jsonData: Record<
				string,
				Array<{
					path: string;
					content: StorageNode;
				}>
			> = {};

			for (let name in this.data) {
				this.data[name].forEach((content, path) => {
					if (!Array.isArray(jsonData[name])) {
						jsonData[name] = [];
					}
					jsonData[name].push({
						path,
						content,
					});
				});
			}

			const jsonString = JSON.stringify(jsonData, null, 4);
			fs.writeFileSync(this.options.filePath, jsonString, "utf8");
		}, 1000);
	}
}
