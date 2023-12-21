import { CustomStorage } from "./CustomStorage";
import { StorageNode, StorageNodeInfo } from "./MDE";
import * as fs from "fs";
import * as path from "path";
import { dirname } from "path";
import { AppError, ERROR_FACTORY } from "../erros";

const dirnameRoot = dirname(require.resolve("."));

export class JsonFileStorageSettings {
	filePath: string = "";

	constructor(options: Partial<JsonFileStorageSettings> = {}) {
		if (typeof options.filePath === "string") {
			this.filePath = path.resolve(dirnameRoot, options.filePath);
			console.log(this.filePath);
		}
	}
}

export class JsonFileStorage extends CustomStorage {
	readonly options: JsonFileStorageSettings;
	private data: Record<string, Map<string, StorageNode>> = {};

	constructor(database: string | string[], options: Partial<JsonFileStorageSettings> = {}) {
		super();
		this.options = new JsonFileStorageSettings(options);
		this.ready = false;

		(Array.isArray(database) ? database : [database])
			.filter((name) => typeof name === "string" && name.trim() !== "")
			.forEach((name) => {
				this.data[name] = new Map<string, StorageNode>();
			});

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

			this.ready = true;
		});
	}

	async getMultiple(database: string, expression: RegExp): Promise<StorageNodeInfo[]> {
		if (!this.ready || !this.data[database]) {
			throw ERROR_FACTORY.create(AppError.DB_NOT_FOUND, { dbName: database });
		}

		const list: StorageNodeInfo[] = [];
		for (let path in this.data) {
			if (expression.test(path)) {
				const content = this.data[database].get(path);
				if (content) {
					list.push({ path, content });
				}
			}
		}
		return list;
	}

	async setNode(database: string, path: string, content: StorageNode, node: StorageNodeInfo) {
		if (!this.ready || !this.data[database]) {
			throw ERROR_FACTORY.create(AppError.DB_NOT_FOUND, { dbName: database });
		}

		this.data[database].set(path, content);
		await this.saveFile();
	}

	async removeNode(database: string, path: string, content: StorageNode, node: StorageNodeInfo) {
		if (!this.ready || !this.data[database]) {
			throw ERROR_FACTORY.create(AppError.DB_NOT_FOUND, { dbName: database });
		}

		this.data[database].delete(path);
		await this.saveFile();
	}

	saveFile(): Promise<void> {
		return new Promise((resolve, reject) => {
			const jsonData: Record<
				string,
				Array<{
					path: string;
					content: StorageNode;
				}>
			> = {};

			for (let name in this.data) {
				this.data[name].forEach((content, path) => {
					jsonData[name].push({
						path,
						content,
					});
				});
			}

			const jsonString = JSON.stringify(jsonData, null, 4);
			fs.writeFileSync(this.options.filePath, jsonString, "utf8");
		});
	}
}
