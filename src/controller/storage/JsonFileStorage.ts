import { CustomStorage } from "./CustomStorage";
import { StorageNode, StorageNodeInfo } from "./MDE";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class JsonFileStorageSettings {
	filePath: string = "";

	constructor(options: Partial<JsonFileStorageSettings> = {}) {
		if (typeof options.filePath === "string") {
			this.filePath = path.resolve(__dirname, options.filePath);
			console.log(this.filePath);
		}
	}
}

export class JsonFileStorage extends CustomStorage {
	readonly options: JsonFileStorageSettings;
	data: Map<string, StorageNode> = new Map();

	constructor(options: Partial<JsonFileStorageSettings> = {}) {
		super();
		this.options = new JsonFileStorageSettings(options);
		this.ready = false;

		fs.readFile(this.options.filePath, "utf8", (err, data) => {
			if (err) {
				throw `Erro ao ler o arquivo: ${err}`;
			}

			try {
				const jsonData: Array<{
					path: string;
					content: StorageNode;
				}> = JSON.parse(data);

				this.data = new Map<string, StorageNode>(jsonData.map((item) => [item.path, item.content]));
			} catch (parseError) {
				throw `Erro ao fazer o parse do JSON: ${String(parseError)}`;
			}

			this.ready = true;
		});
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

	async setNode(path: string, content: StorageNode, node: StorageNodeInfo) {
		this.data.set(path, content);
		await this.saveFile();
	}

	async removeNode(path: string, content: StorageNode, node: StorageNodeInfo) {
		this.data.delete(path);
		await this.saveFile();
	}

	saveFile(): Promise<void> {
		return new Promise((resolve, reject) => {
			const jsonData: Array<{
				path: string;
				content: StorageNode;
			}> = [];

			this.data.forEach((content, path) => {
				jsonData.push({
					path,
					content,
				});
			});

			const jsonString = JSON.stringify(jsonData, null, 4);
			fs.writeFileSync(this.options.filePath, jsonString, "utf8");
		});
	}
}
