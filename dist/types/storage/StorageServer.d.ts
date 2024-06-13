/// <reference types="node" />
import { Storage } from ".";
import { StorageReference } from "./StorageReference";
export declare class StorageServer {
    protected storage: Storage;
    constructor(storage: Storage);
    put(ref: StorageReference, data: Uint8Array | Buffer, metadata?: {
        contentType: string;
    }, onStateChanged?: (event: {
        bytesTransferred: number;
        totalBytes?: number;
        state: string;
        metadata: any;
        task: string;
        ref: StorageReference;
    }) => void): Promise<string>;
    putString(ref: StorageReference, data: string, type?: "base64" | "base64url" | "data_url" | "raw" | "text", onStateChanged?: (event: {
        bytesTransferred: number;
        totalBytes?: number;
        state: string;
        metadata: any;
        task: string;
        ref: StorageReference;
    }) => void): Promise<string>;
    delete(ref: StorageReference): Promise<void>;
    getDownloadURL(ref: StorageReference): Promise<string | null>;
    listAll(ref: StorageReference): Promise<{
        prefixes: StorageReference[];
        items: StorageReference[];
    }>;
    list(ref: StorageReference, config: {
        maxResults?: number;
        page?: number;
    }): Promise<{
        more: boolean;
        page: number;
        items: StorageReference[];
        prefixes: StorageReference[];
    }>;
}
//# sourceMappingURL=StorageServer.d.ts.map