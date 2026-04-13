import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'quicksort',
	category: 'algorithms',
	description: [
		'Sort an array of numbers in ascending order using the quicksort algorithm.',
		'Must implement quicksort recursively; do not use Array.prototype.sort or any other built-in sort.',
		'Return a new array, do not mutate the input.',
	],
	signature: 'function quicksort(arr: number[]): number[]',
	tests: [
		'assert.deepStrictEqual(quicksort([3, 1, 2]), [1, 2, 3]);',
		'assert.deepStrictEqual(quicksort([5, 4, 3, 2, 1]), [1, 2, 3, 4, 5]);',
		'assert.deepStrictEqual(quicksort([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5]);',
		'assert.deepStrictEqual(quicksort([]), []);',
		'assert.deepStrictEqual(quicksort([1]), [1]);',
		'assert.deepStrictEqual(quicksort([2, 2, 2]), [2, 2, 2]);',
		'assert.deepStrictEqual(quicksort([-3, 0, -1, 2]), [-3, -1, 0, 2]);',
		'assert.deepStrictEqual(quicksort([0, -1, 0, 1]), [-1, 0, 0, 1]);',
		'const original = [3, 1, 2];',
		'quicksort(original);',
		'assert.deepStrictEqual(original, [3, 1, 2]);',
		'assert.deepStrictEqual(quicksort([42, 7, 19, 3, 99, 0, -5, 23, 7]), [-5, 0, 3, 7, 7, 19, 23, 42, 99]);',
	].join('\n'),
});
