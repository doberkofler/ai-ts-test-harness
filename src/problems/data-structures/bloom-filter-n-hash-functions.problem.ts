import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'bloom-filter-n-hash-functions',
	description: [
		'Implement a Bloom filter with configurable bit-array size and number of hash functions.',
		'Insert words, then answer membership queries (true = possibly present, false = definitely absent).',
	],
	signature: 'function bloomFilterNHashFunctions(size: number, hashCount: number, wordsToAdd: string[], queries: string[]): boolean[]',
	solution: function bloomFilterNHashFunctions(size: number, hashCount: number, wordsToAdd: string[], queries: string[]): boolean[] {
		if (!Number.isInteger(size) || size <= 0) {
			throw new RangeError('size must be a positive integer');
		}
		if (!Number.isInteger(hashCount) || hashCount <= 0) {
			throw new RangeError('hashCount must be a positive integer');
		}

		const bits = new Uint8Array(size);

		const hashAt = (value: string, seed: number): number => {
			let hash = seed ^ 0x9e3779b9;
			for (const char of value) {
				hash ^= char.charCodeAt(0);
				hash = Math.imul(hash, 16777619);
				hash ^= hash >>> 13;
			}
			hash ^= hash >>> 16;
			return (hash >>> 0) % size;
		};

		const add = (word: string): void => {
			for (let i = 0; i < hashCount; i++) {
				const index = hashAt(word, i + 1);
				bits[index] = 1;
			}
		};

		const maybeHas = (word: string): boolean => {
			for (let i = 0; i < hashCount; i++) {
				const index = hashAt(word, i + 1);
				if (bits[index] === 0) {
					return false;
				}
			}
			return true;
		};

		for (const word of wordsToAdd) {
			add(word);
		}

		return queries.map((query) => maybeHas(query));
	},
	tests: ({assert, implementation}) => {
		const inserted = ['alice', 'bob', 'carol', 'dave', 'eve'];
		const queries = ['alice', 'bob', 'carol', 'mallory', 'trent', 'peggy'];
		const resultValue = implementation(512, 4, inserted, queries);
		if (!Array.isArray(resultValue) || !resultValue.every((value) => typeof value === 'boolean')) {
			throw new TypeError('bloomFilterNHashFunctions must return boolean[]');
		}
		const results = resultValue;

		assert.deepStrictEqual(results.slice(0, 3), [true, true, true]);
		const negatives = results.slice(3);
		const falseCount = negatives.filter((value) => !value).length;
		assert.ok(falseCount >= 1, 'at least one non-inserted word should be definitely absent with this configuration');

		const allInsertedValue = implementation(256, 3, inserted, inserted);
		if (!Array.isArray(allInsertedValue) || !allInsertedValue.every((value) => typeof value === 'boolean')) {
			throw new TypeError('bloomFilterNHashFunctions must return boolean[]');
		}
		const allInserted = allInsertedValue;
		assert.deepStrictEqual(allInserted, [true, true, true, true, true]);
	},
});
