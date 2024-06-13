/// <reference types="node" />
import { Storage } from ".";
import { StorageReference } from "./StorageReference";
export declare class StorageServer {
    protected storage: Storage;
    constructor(storage: Storage);
    put(p: StorageReference | string, data: Uint8Array | Buffer, metadata?: {
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
    listAll(path: StorageReference | string): Promise<{
        prefixes: StorageReference[];
        items: StorageReference[];
    }>;
    list(path: StorageReference | string, config: {
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