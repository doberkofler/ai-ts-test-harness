type CacheOperation = readonly [op: 'get' | 'put', key: number, value?: number];

const __legacySolution = (function lruCache(capacity: number, operations: readonly CacheOperation[]): (number | null)[] {
		if (!Number.isInteger(capacity) || capacity <= 0) {
			throw new TypeError('capacity must be a positive integer');
		}

		const map = new Map<number, number>();
		const outputs: (number | null)[] = [];

		const touch = (key: number, value: number): void => {
			map.delete(key);
			map.set(key, value);
		};

		for (const [op, key, maybeValue] of operations) {
			if (op === 'get') {
				const value = map.get(key);
				if (typeof value === 'number') {
					touch(key, value);
					outputs.push(value);
				} else {
					outputs.push(-1);
				}
				continue;
			}

			if (typeof maybeValue !== 'number') {
				throw new TypeError('put operation requires a numeric value');
			}

			touch(key, maybeValue);
			if (map.size > capacity) {
				const oldest = map.keys().next().value;
				if (typeof oldest === 'number') {
					map.delete(oldest);
				}
			}

			outputs.push(null);
		}

		return outputs;
	});
export const lruCache = __legacySolution;
