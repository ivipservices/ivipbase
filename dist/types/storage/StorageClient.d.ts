import { Storage } from ".";
import { StorageReference } from "./StorageReference";
export declare class StorageClient {
    protected storage: Storage;
    constructor(storage: Storage);
    put(p: StorageReference | string, data: Blob | Uint8Array, metadata?: {
        contentType: string;
    }, onStateChanged?: (event: {
        bytesTransferred: number;
        totalBytes?: number;
        state: string;
        metadata: any;
        task: string;
        ref: StorageReference;
    }) => void): Promise<string>;
    putString(p: StorageReference | string, data: string, type?: "base64" | "base64url" | "data_url" | "raw" | "text", onStateChanged?: (event: {
        bytesTransferred: number;
        totalBytes?: number;
        state: string;
        metadata: any;
        task: string;
        ref: StorageReference;
    }) => void): Promise<string>;
    delete(p: StorageReference | string): Promise<void>;
    getDownloadURL(p: StorageReference | string): Promise<string | null>;
    listAll(p: StorageReference | string): Promise<{
        prefixes: StorageReference[];
        items: StorageReference[];
    }>;
    list(p: StorageReference | string, config: {
        maxResults?: number;
        page?: number;
    }): Promise<{
        more: boolean;
        page: number;
        items: StorageReference[];
        prefixes: StorageReference[];
    }>;
}
//# sourceMappingURL=StorageClient.d.ts.map