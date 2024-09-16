import _Binary from "./browser";
import { PathInfo, Types } from "ivipbase-core";
import * as os from "os";
import * as fs from "fs";
import * as _path from "path";
import { Worker } from "worker_threads";
import { StorageNode, StorageNodeInfo } from "../MDE";

export interface WorkerData {
	filePath: string;
	start: number;
	end: number;
	index: number;
	path: string;
	type: "get" | "set" | "remove";
	value?: any;
	query?: Types.Query;
	queryOptions?: Types.QueryOptions;
}

export default class Binary extends _Binary {
	constructor(filePath: string, numCPUs: number = os.cpus().length) {
		super(filePath, numCPUs);
	}

	async process<T = any>(type: "get" | "set" | "remove", path: string | Array<string | number | PathInfo> | PathInfo, value?: any): Promise<T | null | Array<T | null>> {
		return new Promise((resolve) => {
			// Tamanho total do arquivo
			const fileSize = fs.statSync(this.filePath).size;

			// Tamanho de cada parte
			const partSize = Math.ceil(fileSize / this.numCPUs);

			let workersFinished = 0;
			let results = [];

			for (let i = 0; i < this.numCPUs; i++) {
				const start = i * partSize;
				const end = i === this.numCPUs - 1 ? fileSize : start + partSize;

				const data: WorkerData = {
					filePath: this.filePath,
					start,
					end,
					index: i,
					path: (path instanceof PathInfo ? path : PathInfo.get(path)).path,
					type,
					value,
				};

				const worker = new Worker(_path.resolve(__dirname, "./worker.js"), {
					workerData: data,
				});

				worker.on("message", (message) => {
					results[message.index] = message.result; // Armazena o resultado da parte processada
					workersFinished++;

					if (workersFinished === this.numCPUs) {
						// Todos os trabalhadores terminaram, processa o resultado final
						const result = results.flat();
						console.log("Resultados:", result);
						resolve(result);
					}
				});

				worker.on("error", (error) => {
					console.error(`Erro no Worker ${i}:`, error);
				});

				worker.on("exit", (code) => {
					if (code !== 0) {
						console.error(`Worker ${i} parou com código de saída ${code}`);
					}
				});
			}
		});
	}

	async get(path: string | Array<string | number | PathInfo> | PathInfo): Promise<StorageNodeInfo[]> {
		return Promise.resolve([]);
	}

	async remove(path: string | Array<string | number | PathInfo> | PathInfo): Promise<void> {
		return Promise.resolve();
	}

	async set(path: string | Array<string | number | PathInfo> | PathInfo, content: StorageNode): Promise<void> {
		return Promise.resolve();
	}

	async query(path: string | Array<string | number | PathInfo> | PathInfo, query: Types.Query, options: Types.QueryOptions): Promise<StorageNodeInfo[]> {
		return Promise.resolve([]);
	}
}
