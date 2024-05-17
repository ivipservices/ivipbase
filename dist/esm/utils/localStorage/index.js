class LocalStorage {
    constructor() {
        this.storage = new Map();
    }
    setItem(key, value) {
        this.storage.set(key, value);
    }
    getItem(key) {
        return this.storage.get(key) || null;
    }
    removeItem(key) {
        this.storage.delete(key);
    }
    clear() {
        this.storage.clear();
    }
    key(index) {
        const keys = Array.from(this.storage.keys());
        return keys[index] || null;
    }
    get length() {
        return this.storage.size;
    }
}
const localStorage = new LocalStorage();
export default localStorage;
//# sourceMappingURL=index.js.map