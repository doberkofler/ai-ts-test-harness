import {defineImplementProblem} from '#problem-api';

type CacheOperation = readonly [op: 'get' | 'put', key: number, value?: number];

export default defineImplementProblem({
	name: 'lru-cache',
	category: 'algorithms',
	description: 'Simulate an LRU cache with given capacity and operation tuples. Return outputs for each operation.',
	signature: "function lruCache(capacity: number, operations: readonly (readonly ['get' | 'put', number, number?])[]): (number | null)[]",
	solution: function lruCache(capacity: number, operations: readonly CacheOperation[]): (number | null)[] {
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
	},
	tests: ({assert, implementation}) => {
		const output = implementation(2, [
			['put', 1, 1],
			['put', 2, 2],
			['get', 1],
			['put', 3, 3],
			['get', 2],
			['put', 4, 4],
			['get', 1],
			['get', 3],
			['get', 4],
		]);

		assert.deepStrictEqual(output, [null, null, 1, null, -1, null, -1, 3, 4]);
		assert.throws(() => implementation(0, [['get', 1]]), /capacity must be a positive integer/);
	},
});
