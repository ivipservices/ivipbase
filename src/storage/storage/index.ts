import { IvipBaseApp } from "../../app";
import { DataBase } from "../../database";
import { Api, StorageReference } from "../api";

export class Storage extends Api {
	constructor(protected app: IvipBaseApp, protected database: DataBase) {
		super(app, database);
	}

	put(ref: StorageReference, data: File | Blob | Uint8Array, metadata?: { contentType: string }) {
		return Promise.resolve("");
	}

	putString(ref: StorageReference, data: string, type?: "base64" | "base64url" | "data_url" | "raw" | "text") {
		return Promise.resolve("");
	}

	delete(ref: StorageReference) {
		return Promise.resolve();
	}
}
