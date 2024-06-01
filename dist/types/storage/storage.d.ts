import { SimpleEventEmitter } from "ivipbase-core";
import { IvipBaseApp } from "../app";
import { DataBase } from "../database";
declare const _private: unique symbol;
export declare class StorageReference extends SimpleEventEmitter {
    protected storage: Storage;
    private [_private];
    constructor(storage: Storage, path: string);
    get isWildcardPath(): boolean;
    /**
     * O caminho com o qual esta instância foi criada
     */
    get fullPath(): string;
    get name(): string | number | null;
    /**
     * A chave ou índice deste nó
     */
    get key(): string;
    /**
     * Retorna uma nova referência para o pai deste nó
     */
    get parent(): StorageReference | null;
    get root(): StorageReference;
    /**
     * Retorna uma nova referência para um nó filho
     * @param childPath Chave de filho, índice ou caminho
     * @returns Referência para o filho
     */
    child(childPath: string): StorageReference;
    put(data: File | Blob | Uint8Array, metadata?: {
        contentType: string;
    }): {
        pause(): void;
        resume(): void;
        cancel(): void;
        on(event: "state_changed", callback: (snapshot: any) => void): void;
    };
    putString(data: string, type?: "base64" | "base64url" | "data_url" | "raw" | "text"): {
        pause(): void;
        resume(): void;
        cancel(): void;
        on(event: "state_changed", callback: (snapshot: any) => void): void;
    };
    delete(): void;
    getDownloadURL(): Promise<string | null>;
    getBlob(): void;
    getBytes(): void;
    getStream(): void;
    listAll(): Promise<{
        prefixes: StorageReference[];
        items: StorageReference[];
    }>;
    list(config: {
        maxResults?: number;
        page?: number;
    }): Promise<{
        more: boolean;
        page: number;
        items: StorageReference[];
        prefixes: StorageReference[];
    }>;
}
export declare class Storage {
    protected app: IvipBaseApp;
    protected database: DataBase;
    constructor(app: IvipBaseApp, database: DataBase);
    /**
     * Creates a reference to a node
     * @param path
     * @returns reference to the requested node
     */
    ref(path: string): StorageReference;
    put(ref: StorageReference, data: File | Blob | Uint8Array, metadata?: {
        contentType: string;
    }): Promise<string>;
    putString(ref: StorageReference, data: string, type?: "base64" | "base64url" | "data_url" | "raw" | "text"): Promise<string>;
    delete(ef: StorageReference): Promise<void>;
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
export {};
//# sourceMappingURL=storage.d.ts.map