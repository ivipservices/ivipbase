declare class LocalStorage {
    private storage;
    constructor();
    setItem(key: string, value: string): void;
    getItem(key: string): string | null;
    removeItem(key: string): void;
    clear(): void;
    key(index: number): string | null;
    get length(): number;
}
declare const localStorage: LocalStorage;
export default localStorage;
//# sourceMappingURL=index.d.ts.map