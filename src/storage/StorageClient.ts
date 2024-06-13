import { Storage } from ".";
import { StorageReference } from "./StorageReference";

export class StorageClient {
	constructor(protected storage: Storage) {}

	async put(
		ref: StorageReference,
		data: Blob | Uint8Array,
		metadata?: { contentType: string },
		onStateChanged?: (event: { bytesTransferred: number; totalBytes?: number; state: string; metadata: any; task: string; ref: StorageReference }) => void,
	): Promise<string> {
		return await this.storage.app.request({
			route: `/storage/${this.storage.database.name}/${ref.fullPath}` + (metadata?.contentType ? `?contentType=${metadata.contentType}` : ""),
			data,
			method: "PUT",
			onUploadProgress: onStateChanged
				? (progressEvent) => {
						onStateChanged({
							bytesTransferred: progressEvent.loaded,
							totalBytes: progressEvent.total,
							state: "running",
							metadata: metadata,
							task: "put",
							ref: ref,
						});
				  }
				: undefined,
		});
	}

	async putString(
		ref: StorageReference,
		data: string,
		type?: "base64" | "base64url" | "data_url" | "raw" | "text",
		onStateChanged?: (event: { bytesTransferred: number; totalBytes?: number; state: string; metadata: any; task: string; ref: StorageReference }) => void,
	): Promise<string> {
		return await this.storage.app.request({
			route: `/storage/${this.storage.database.name}/${ref.fullPath}?format=${type ?? "text"}`,
			data: {
				format: type ?? "text",
				data,
			},
			method: "PUT",
			onUploadProgress: onStateChanged
				? (progressEvent) => {
						onStateChanged({
							bytesTransferred: progressEvent.loaded,
							totalBytes: progressEvent.total,
							state: "running",
							metadata: undefined,
							task: "put",
							ref: ref,
						});
				  }
				: undefined,
		});
	}

	async delete(ref: StorageReference): Promise<void> {
		await this.storage.app.request({
			route: `/storage/${this.storage.database.name}/${ref.fullPath}`,
			method: "DELETE",
		});
		return Promise.resolve();
	}

	async getDownloadURL(ref: StorageReference): Promise<string | null> {
		const { path, isFile } = await this.storage.app.request({
			method: "GET",
			route: `storage-url/${this.storage.database.name}/${ref.fullPath}`,
		});
		return typeof path === "string" && isFile ? `${this.storage.app.url}/${path.replace(/^\/+/, "")}` : null;
	}

	async listAll(ref: StorageReference): Promise<{
		prefixes: StorageReference[];
		items: StorageReference[];
	}> {
		const {
			items,
			prefixes,
		}: {
			items: string[];
			prefixes: string[];
		} = await this.storage.app.request({
			method: "GET",
			route: `storage-list/${this.storage.database.name}/${ref.fullPath}`,
		});

		return {
			items: items.map((path) => {
				return new StorageReference(this.storage, path);
			}),
			prefixes: prefixes.map((path) => {
				return new StorageReference(this.storage, path);
			}),
		};
	}

	async list(
		ref: StorageReference,
		config: {
			maxResults?: number;
			page?: number;
		},
	): Promise<{
		more: boolean;
		page: number;
		items: StorageReference[];
		prefixes: StorageReference[];
	}> {
		const {
			items,
			prefixes,
			more,
			page,
		}: {
			items: string[];
			prefixes: string[];
			more: boolean;
			page: number;
		} = await this.storage.app.request({
			method: "GET",
			route: `storage-list/${this.storage.database.name}/${ref.fullPath}`,
			data: config,
		});

		return {
			more,
			page,
			items: items.map((path) => {
				return new StorageReference(this.storage, path);
			}),
			prefixes: prefixes.map((path) => {
				return new StorageReference(this.storage, path);
			}),
		};
	}
}
