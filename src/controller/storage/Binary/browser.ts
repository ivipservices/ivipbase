import { PathInfo, Types } from "ivipbase-core";
import { StorageNode, StorageNodeInfo } from "../MDE";
import { SimpleEventEmitter } from "ivip-utils";

export class BinarySettings {
	/**
	 * caminho root para o armazenamento
	 * @default ""
	 */
	path: string = "";

	/**
	 * nome do arquivo de armazenamento (pasta do app)
	 * @default "ivipbase"
	 */
	name: string = "ivipbase";

	/**
	 * número de processadores usados na paralelização
	 * @default 1
	 */
	numCPUs: number = 1;

	/**
	 * tamanho do registro em bytes, padrão 128 (recomendado). O máximo é 65536
	 * @default 128
	 */
	recordSize = 128;

	/**
	 * tamanho da página em registros, padrão para 1024 (recomendado). O máximo é 65536
	 * @default 1024
	 */
	pageSize = 1024;

	/**
	 * tamanho maximo para valores inline, padrão 65536
	 * @default 65536
	 */
	maxInlineValueSize = 65536;

	/**
	 * Use a versão futura do FST (ainda não implementada)
	 * @default false
	 */
	fst2 = false;

	constructor(settings: Partial<BinarySettings> = {}) {
		if (typeof settings.path === "string") {
			this.path = settings.path;
		}
		if (typeof settings.name === "string") {
			this.name = settings.name;
		}
		if (typeof settings.numCPUs === "number") {
			this.numCPUs = settings.numCPUs;
		}
		if (typeof settings.recordSize === "number") {
			this.recordSize = settings.recordSize;
		}
		if (typeof settings.pageSize === "number") {
			this.pageSize = settings.pageSize;
		}
		if (typeof settings.maxInlineValueSize === "number") {
			this.maxInlineValueSize = settings.maxInlineValueSize;
		}
		if (typeof settings.fst2 === "boolean") {
			this.fst2 = settings.fst2;
		}
	}
}

export default class Binary extends SimpleEventEmitter {
	protected _ready = false;
	readonly numCPUs: number;
	readonly settings: BinarySettings;

	constructor(settings: Partial<BinarySettings>) {
		super();
		this.settings = new BinarySettings(settings);
		this.numCPUs = this.settings.numCPUs;

		this.on("ready", () => {
			this._ready = true;
		});
	}

	get readOnly(): boolean {
		return this._ready;
	}

	async ready(callback?: () => void) {
		if (!this._ready) {
			// Aguarda o evento ready
			await new Promise((resolve) => this.once("ready", resolve));
		}
		callback?.();
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
