import _Binary, { BinarySettings } from "./browser";
import { ID, PathInfo, Types, Utils } from "ivipbase-core";
import * as os from "os";
import * as fs from "fs";
import * as _path from "path";
import { Worker } from "worker_threads";
import { StorageNode, StorageNodeInfo } from "../MDE";
import { pfs } from "../../promise-fs";
import { nodeValueTypes } from "../MDE/utils";

const { concatTypedArrays, bytesToNumber, bytesToBigint, numberToBytes, bigintToBytes, encodeString, decodeString, cloneObject } = Utils;

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
	private file?: number;
	readonly descriptor: Uint8Array = encodeString("IVIPBASE");

	constructor(settings: Partial<BinarySettings> = {}) {
		super({ path: __dirname, numCPUs: os.cpus().length, ...settings });

		this.isLocked = () => false;
		this.lock = async () => {};
		this.unlock = async () => {};
	}

	get fileName(): string {
		return _path.resolve(this.settings.path, this.settings.name, `database.bin`);
	}

	isLocked: (forUs?: boolean) => boolean;
	lock: (forUs?: boolean) => Promise<void>;
	unlock: () => Promise<void>;

	async initialize() {
		const exists = fs.existsSync(this.fileName);

		if (!exists) {
			await this.createDatabaseFile();
		}

		this.emitOnce("ready");
	}

	handleError(err: any, txt?: string): never {
		err = err instanceof Error ? err : new Error(err);
		// this.debug.error(txt);
		// this.debug.error(err);
		if (this.file) {
			pfs.close(this.file).catch((err) => {
				// ...
			});
		}
		this.emit("error", err);
		throw err;
	}

	async readHeader() {
		try {
			this.file = await pfs.open(this.fileName, this.readOnly === true ? "r" : "r+", 0);
		} catch (err) {
			this.handleError(err, "Failed to open database file");
		}

		if (typeof this.file !== "number") {
			this.handleError("file_not_found_db", "Failed to open database file");
		}

		const data = Buffer.alloc(64);
		let bytesRead = 0;
		try {
			const result = await pfs.read(this.file, data, 0, data.length, 0);
			bytesRead = result.bytesRead;
		} catch (err) {
			this.handleError(err, "Could not read database header");
		}

		// Cast Buffer to Uint8Array
		const header = new Uint8Array(data);

		const hasAceBaseDescriptor = (() => {
			for (let i = 0; i < this.descriptor.length; i++) {
				if (header[i] !== this.descriptor[i]) {
					return false;
				}
			}
			return true;
		})();

		if (bytesRead < 64 || !hasAceBaseDescriptor) {
			this.handleError("unsupported_db", "This is not a supported database file");
		}

		let index = this.descriptor.length;
		if (header[index] !== 1) {
			this.handleError("unsupported_db", "This database version is not supported, update your source code");
		}
		index++;

		// Read flags
		const flagsIndex = index;
		const flags = header[flagsIndex]; // flag bits: [r, r, r, r, r, r, FST2, LOCK]
		const lock = {
			enabled: (flags & 0x1) > 0,
			forUs: true,
		};
		this.isLocked = (forUs = false) => {
			if (typeof this.file !== "number") {
				this.handleError("file_not_found_db", "Failed to open database file");
			}

			return lock.enabled && lock.forUs === forUs;
		};
		this.lock = async (forUs = false) => {
			if (typeof this.file !== "number") {
				this.handleError("file_not_found_db", "Failed to open database file");
			}

			await pfs.write(this.file, new Uint8Array([flags | 0x1]), 0, 1, flagsIndex);
			lock.enabled = true;
			lock.forUs = forUs;
			this.emit("locked", { forUs });
		};
		this.unlock = async () => {
			if (typeof this.file !== "number") {
				this.handleError("file_not_found_db", "Failed to open database file");
			}

			await pfs.write(this.file, new Uint8Array([flags & 0xfe]), 0, 1, flagsIndex);
			lock.enabled = false;
			this.emit("unlocked");
		};
		this.settings.fst2 = (flags & 0x2) > 0;
		if (this.settings.fst2) {
			throw new Error("FST2 is not supported by this version yet");
		}
		index++;
	}

	async createDatabaseFile() {
		// Cria o arquivo com cabeçalho de 64 bytes (configurações, etc), KIT, FST e registro raiz
		const version = 1;
		const headerBytes = 64;
		const flags = 0; // Ao implementar settings.fst2 ? 0x2 : 0x0;

		const stats = new Uint8Array([
			version, // Número da versão
			flags, // Flags: [r,r,r,r,r,r,FST2,LOCK]
			0,
			0,
			0,
			0, // Número da página do registro raiz (32 bits)
			0,
			0, // Número do registro raiz (16 bits)
			(this.settings.recordSize >> 8) & 0xff,
			this.settings.recordSize & 0xff,
			(this.settings.pageSize >> 8) & 0xff,
			this.settings.pageSize & 0xff,
			(this.settings.maxInlineValueSize >> 8) & 0xff,
			this.settings.maxInlineValueSize & 0xff,
		]);
		let header = concatTypedArrays(this.descriptor, stats);
		const padding = new Uint8Array(headerBytes - header.byteLength);
		padding.fill(0);
		header = concatTypedArrays(header, padding);

		// Cria a Tabela de Índice de Chaves (KIT) para permitir a criação de registros muito pequenos.
		// key_index usa 2 bytes, então tecnicamente até 65536 chaves poderiam ser indexadas.
		// Usando um comprimento médio de chave de 7 caracteres, o índice se tornaria
		// 7 caracteres + 1 delimitador * 65536 chaves = 520KB. Isso seria um exagero.
		// A tabela deve ter no máximo 64KB, o que significa que aproximadamente 8192 chaves podem
		// ser indexadas. Com chaves mais curtas, isso será mais. Com chaves mais longas, menos.
		const kit = new Uint8Array(65536 - header.byteLength);
		let uint8 = concatTypedArrays(header, kit);

		// Cria uma Tabela de Espaço Livre (FST) vazia de 64KB
		// Cada registro FST tem 8 bytes:
		//    Número da página: 4 bytes
		//    Número de início do registro: 2 bytes
		//    Número de fim do registro: 2 bytes
		// Usar uma FST de 64KB (menos o tamanho do cabeçalho de 64B) permite 8184 entradas: (65536-64) / 8
		// A desfragmentação deve ser acionada quando a FST estiver ficando cheia!
		const fst = new Uint8Array(65536);
		uint8 = concatTypedArrays(uint8, fst);

		const dir = this.fileName.slice(0, this.fileName.lastIndexOf("/"));
		if (dir !== ".") {
			await pfs.mkdir(dir).catch((err) => {
				if (err.code !== "EEXIST") {
					throw err;
				}
			});
		}

		await pfs.writeFile(this.fileName, Buffer.from(uint8.buffer));

		// Agora cria o registro raiz
		await this.set("", {
			created: Date.now(),
			modified: Date.now(),
			revision: ID.generate(),
			revision_nr: 1,
			type: nodeValueTypes.OBJECT,
			value: {},
		});
	}

	async process<T = any>(type: "get" | "set" | "remove", path: string | Array<string | number | PathInfo> | PathInfo, value?: any): Promise<T | null | Array<T | null>> {
		return new Promise((resolve) => {
			// Tamanho total do arquivo
			const fileSize = fs.statSync(this.fileName).size;

			// Tamanho de cada parte
			const partSize = Math.ceil(fileSize / this.numCPUs);

			let workersFinished = 0;
			let results = [];

			for (let i = 0; i < this.numCPUs; i++) {
				const start = i * partSize;
				const end = i === this.numCPUs - 1 ? fileSize : start + partSize;

				const data: WorkerData = {
					filePath: this.fileName,
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
