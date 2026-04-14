import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'quicksort',
	description: [
		'Sort an array of numbers in ascending order using the quicksort algorithm.',
		'Must implement quicksort recursively; do not use Array.prototype.sort or any other built-in sort.',
		'Return a new array, do not mutate the input.',
	],
	signature: 'function quicksort(arr: number[]): number[]',
	solution: function quicksort(arr: number[]): number[] {
		if (arr.length <= 1) {
			return [...arr];
		}

		// oxlint-disable-next-line typescript/no-unsafe-type-assertion, typescript/non-nullable-type-assertion-style
		const pivot = arr[Math.floor(arr.length / 2)] as number;
		const left: number[] = [];
		const mid: number[] = [];
		const right: number[] = [];

		for (const n of arr) {
			if (n < pivot) {
				left.push(n);
			} else if (n > pivot) {
				right.push(n);
			} else {
				mid.push(n);
			}
		}

		return [...quicksort(left), ...mid, ...quicksort(right)];
	},
	tests: ({assert, implementation}) => {
		assert.deepStrictEqual(implementation([3, 1, 2]), [1, 2, 3]);
		assert.deepStrictEqual(implementation([5, 4, 3, 2, 1]), [1, 2, 3, 4, 5]);
		assert.deepStrictEqual(implementation([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5]);
		assert.deepStrictEqual(implementation([]), []);
		assert.deepStrictEqual(implementation([1]), [1]);
		assert.deepStrictEqual(implementation([2, 2, 2]), [2, 2, 2]);
		assert.deepStrictEqual(implementation([-3, 0, -1, 2]), [-3, -1, 0, 2]);
		assert.deepStrictEqual(implementation([0, -1, 0, 1]), [-1, 0, 0, 1]);
		const original = [3, 1, 2];
		implementation(original);
		assert.deepStrictEqual(original, [3, 1, 2]);
		assert.deepStrictEqual(implementation([42, 7, 19, 3, 99, 0, -5, 23, 7]), [-5, 0, 3, 7, 7, 19, 23, 42, 99]);
	},
});
