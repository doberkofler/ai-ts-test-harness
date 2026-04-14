import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'two-sum',
	description: ['Given an integer array and target, return indices of two numbers that add up to target.', 'Return null when no such pair exists.'],
	signature: 'function twoSum(nums: number[], target: number): [number, number] | null',
	solution: function twoSum(nums: number[], target: number): [number, number] | null {
		const seen = new Map<number, number>();

		for (let index = 0; index < nums.length; index += 1) {
			const value = nums.at(index);
			if (typeof value !== 'number') {
				continue;
			}

			const needed = target - value;
			const matchIndex = seen.get(needed);
			if (typeof matchIndex === 'number') {
				return [matchIndex, index];
			}

			seen.set(value, index);
		}

		return null;
	},
	tests: ({assert, implementation}) => {
		assert.deepStrictEqual(implementation([2, 7, 11, 15], 9), [0, 1]);
		assert.deepStrictEqual(implementation([3, 2, 4], 6), [1, 2]);
		assert.deepStrictEqual(implementation([3, 3], 6), [0, 1]);
		assert.strictEqual(implementation([1, 2, 3], 100), null);
	},
});
