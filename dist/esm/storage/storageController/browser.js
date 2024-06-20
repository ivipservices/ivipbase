import { StorageClient } from "./StorageClient.js";
class StorageServer extends StorageClient {
    constructor(storage) {
        super(storage);
        this.storage = storage;
    }
}
export { StorageServer, StorageClient };
//# sourceMappingURL=browser.js.map