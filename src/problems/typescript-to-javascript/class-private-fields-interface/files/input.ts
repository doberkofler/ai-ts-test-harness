interface Cache<K, V> {
	get(key: K): V | undefined;
	set(key: K, value: V): void;
	delete(key: K): boolean;
	get size(): number;
}

export class LRUCache<K, V> implements Cache<K, V> {
	readonly #capacity: number;
	readonly #map: Map<K, V> = new Map();

	constructor(capacity: number) {
		if (capacity <= 0) {
			throw new RangeError('capacity must be > 0');
		}
		this.#capacity = capacity;
	}

	get(key: K): V | undefined {
		if (!this.#map.has(key)) {
			return undefined;
		}
		const value = this.#map.get(key)!;
		this.#map.delete(key);
		this.#map.set(key, value);
		return value;
	}

	set(key: K, value: V): void {
		if (this.#map.has(key)) {
			this.#map.delete(key);
		} else if (this.#map.size >= this.#capacity) {
			this.#map.delete(this.#map.keys().next().value);
		}
		this.#map.set(key, value);
	}

	delete(key: K): boolean {
		return this.#map.delete(key);
	}

	get size(): number {
		return this.#map.size;
	}
}
