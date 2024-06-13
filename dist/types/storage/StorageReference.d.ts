/// <reference types="node" />
import { SimpleEventEmitter, Types } from "ivipbase-core";
import { Storage } from ".";
declare const _private: unique symbol;
interface StorageReferencePutReturn {
    pause(): void;
    resume(): void;
    cancel(): void;
    on(event: "state_changed", callback: (snapshot: {
        bytesTransferred: number;
        totalBytes?: number;
        state: string;
        metadata: any;
        task: string;
        ref: StorageReference;
    }) => void): void;
}
export declare class StorageReference extends SimpleEventEmitter {
    protected storage: Storage;
    private [_private];
    constructor(storage: Storage, path: string);
    on<d = {
        bytesTransferred: number;
        totalBytes?: number;
        state: string;
        metadata: any;
        task: string;
        ref: StorageReference;
    }>(event: "state_changed", callback: (data: d) => void): Types.SimpleEventEmitterProperty;
    emit(event: "state_changed", data: {
        bytesTransferred: number;
        totalBytes?: number;
        state: string;
        metadata: any;
        task: string;
        ref: StorageReference;
    }): this;
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
    put(data: Blob, metadata?: {
        contentType: string;
    }): StorageReferencePutReturn;
    put(data: Uint8Array, metadata?: {
        contentType: string;
    }): StorageReferencePutReturn;
    put(data: Buffer, metadata?: {
        contentType: string;
    }): StorageReferencePutReturn;
    put(data: File, metadata?: {
        contentType: string;
    }): StorageReferencePutReturn;
    putString(data: string, type?: "base64" | "base64url" | "data_url" | "raw" | "text"): StorageReferencePutReturn;
    delete(): Promise<void>;
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
        prefixes: StorageReference[];
        items: StorageReference[];
    }>;
}
export {};
//# sourceMappingURL=StorageReference.d.ts.map