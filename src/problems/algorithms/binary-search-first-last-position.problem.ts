import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'binary-search-first-last-position',
	description: 'Given a sorted array and a target, return [firstIndex, lastIndex] or [-1, -1] if missing.',
	signature: 'function binarySearchFirstLastPosition(values: number[], target: number): [number, number]',
	solution: function binarySearchFirstLastPosition(values: number[], target: number): [number, number] {
		const findBoundary = (leftBias: boolean): number => {
			let low = 0;
			let high = values.length - 1;
			let answer = -1;

			while (low <= high) {
				const middle = low + Math.floor((high - low) / 2);
				const value = values[middle];
				if (value === undefined) {
					break;
				}

				if (value === target) {
					answer = middle;
					if (leftBias) {
						high = middle - 1;
					} else {
						low = middle + 1;
					}
				} else if (value < target) {
					low = middle + 1;
				} else {
					high = middle - 1;
				}
			}

			return answer;
		};

		return [findBoundary(true), findBoundary(false)];
	},
	tests: ({assert, implementation}) => {
		assert.deepStrictEqual(implementation([5, 7, 7, 8, 8, 10], 8), [3, 4]);
		assert.deepStrictEqual(implementation([5, 7, 7, 8, 8, 10], 6), [-1, -1]);
		assert.deepStrictEqual(implementation([], 0), [-1, -1]);
		assert.deepStrictEqual(implementation([1, 2, 2, 2, 3], 2), [1, 3]);
	},
});
