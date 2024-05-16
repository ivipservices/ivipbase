class LocalStorage {
	private storage: Map<string, string>;

	constructor() {
		this.storage = new Map<string, string>();
	}

	setItem(key: string, value: string): void {
		this.storage.set(key, value);
	}

	getItem(key: string): string | null {
		return this.storage.get(key) || null;
	}

	removeItem(key: string): void {
		this.storage.delete(key);
	}

	clear(): void {
		this.storage.clear();
	}

	key(index: number): string | null {
		const keys = Array.from(this.storage.keys());
		return keys[index] || null;
	}

	get length(): number {
		return this.storage.size;
	}
}

const localStorage = new LocalStorage();
export default localStorage;
