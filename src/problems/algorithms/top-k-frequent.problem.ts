import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'top-k-frequent',
	description: 'Return the k most frequent numbers in descending frequency order.',
	signature: 'function topKFrequent(values: number[], k: number): number[]',
	solution: function topKFrequent(values: number[], k: number): number[] {
		const frequency = new Map<number, number>();
		for (const value of values) {
			frequency.set(value, (frequency.get(value) ?? 0) + 1);
		}

		return [...frequency.entries()]
			.sort((left, right) => right[1] - left[1] || left[0] - right[0])
			.slice(0, k)
			.map(([value]) => value);
	},
	tests: ({assert, implementation}) => {
		assert.deepStrictEqual(implementation([1, 1, 1, 2, 2, 3], 2), [1, 2]);
		assert.deepStrictEqual(implementation([4, 4, 5, 5, 6], 1), [4]);
		assert.deepStrictEqual(implementation([9], 1), [9]);
	},
});
