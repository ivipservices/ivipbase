import { Storage } from "..";
import { StorageClient } from "./StorageClient";

class StorageServer extends StorageClient {
	constructor(protected storage: Storage) {
		super(storage);
	}
}

export { StorageServer, StorageClient };
