import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'binary-search-boundary',
	description: 'Given a sorted array and target, return the first index where target appears, or -1 when missing.',
	signature: 'function binarySearchBoundary(values: number[], target: number): number',
	solution: function binarySearchBoundary(values: number[], target: number): number {
		let low = 0;
		let high = values.length - 1;
		let answer = -1;

		while (low <= high) {
			const middle = low + Math.floor((high - low) / 2);
			const current = values.at(middle);
			if (typeof current !== 'number') {
				break;
			}

			if (current >= target) {
				if (current === target) {
					answer = middle;
				}
				high = middle - 1;
			} else {
				low = middle + 1;
			}
		}

		return answer;
	},
	tests: ({assert, implementation}) => {
		assert.strictEqual(implementation([1, 2, 2, 2, 3], 2), 1);
		assert.strictEqual(implementation([1, 1, 1], 1), 0);
		assert.strictEqual(implementation([1, 3, 5, 7], 4), -1);
		assert.strictEqual(implementation([], 5), -1);
	},
});
