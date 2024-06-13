import { IvipBaseApp } from "../app";
import { DataBase } from "../database";
import { StorageReference } from "./StorageReference";
export declare class Storage {
    readonly app: IvipBaseApp;
    readonly database: DataBase;
    private api;
    constructor(app: IvipBaseApp, database: DataBase);
    root(): StorageReference;
    /**
     * Creates a reference to a node
     * @param path
     * @returns reference to the requested node
     */
    ref(path: string): StorageReference;
    put(ref: StorageReference | string, data: Blob | Uint8Array, metadata?: {
        contentType: string;
    }, onStateChanged?: (event: {
        bytesTransferred: number;
        totalBytes?: number;
        state: string;
        metadata: any;
        task: string;
        ref: StorageReference;
    }) => void): Promise<string>;
    putString(ref: StorageReference | string, data: string, type?: "base64" | "base64url" | "data_url" | "raw" | "text", onStateChanged?: (event: {
        bytesTransferred: number;
        totalBytes?: number;
        state: string;
        metadata: any;
        task: string;
        ref: StorageReference;
    }) => void): Promise<string>;
    delete(ref: StorageReference | string): Promise<void>;
    getDownloadURL(ref: StorageReference | string): Promise<string | null>;
    listAll(ref: StorageReference | string): Promise<{
        prefixes: StorageReference[];
        items: StorageReference[];
    }>;
    list(ref: StorageReference | string, config: {
        maxResults?: number;
        page?: number;
    }): Promise<{
        prefixes: StorageReference[];
        items: StorageReference[];
    }>;
}
export declare function getStorage(): Storage;
export declare function getStorage(app: string | IvipBaseApp | undefined): Storage;
export declare function getStorage(database: string): Storage;
export declare function getStorage(database: string, app: string | IvipBaseApp | undefined): Storage;
//# sourceMappingURL=index.d.ts.map