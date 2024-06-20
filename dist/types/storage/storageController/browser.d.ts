import { Storage } from "..";
import { StorageClient } from "./StorageClient";
declare class StorageServer extends StorageClient {
    protected storage: Storage;
    constructor(storage: Storage);
}
export { StorageServer, StorageClient };
//# sourceMappingURL=browser.d.ts.map