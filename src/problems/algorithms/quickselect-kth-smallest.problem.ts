import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'quickselect-kth-smallest',
	description: ['Find the kth smallest element in an unsorted array using quickselect.', 'k is 1-based (k = 1 means smallest element).'],
	signature: 'function quickselectKthSmallest(values: number[], k: number): number',
	solution: function quickselectKthSmallest(values: number[], k: number): number {
		if (!Number.isInteger(k) || k < 1 || k > values.length) {
			throw new RangeError('k out of range');
		}

		const arr = [...values];
		const target = k - 1;
		const at = (index: number): number => {
			const value = arr[index];
			if (typeof value !== 'number') {
				throw new TypeError(`missing value at index ${index}`);
			}
			return value;
		};

		const swap = (i: number, j: number): void => {
			const left = at(i);
			const right = at(j);
			arr[i] = right;
			arr[j] = left;
		};

		const partition = (left: number, right: number): number => {
			const pivot = at(right);

			let boundary = left;
			for (let i = left; i < right; i++) {
				const value = arr[i];
				if (typeof value !== 'number') {
					continue;
				}
				if (value <= pivot) {
					swap(boundary, i);
					boundary++;
				}
			}

			swap(boundary, right);
			return boundary;
		};

		let left = 0;
		let right = arr.length - 1;

		while (left <= right) {
			const pivotIndex = partition(left, right);
			if (pivotIndex === target) {
				const answer = arr[pivotIndex];
				if (typeof answer !== 'number') {
					break;
				}
				return answer;
			}

			if (pivotIndex < target) {
				left = pivotIndex + 1;
			} else {
				right = pivotIndex - 1;
			}
		}

		throw new TypeError('invalid quickselect state');
	},
	tests: ({assert, implementation, code}) => {
		assert.strictEqual(implementation([3, 2, 1, 5, 6, 4], 2), 2);
		assert.strictEqual(implementation([3, 2, 3, 1, 2, 4, 5, 5, 6], 4), 3);
		assert.strictEqual(implementation([42], 1), 42);
		assert.throws(() => implementation([1, 2, 3], 0), /k out of range/i);
		assert.doesNotMatch(code.result, /\.sort\s*\(/, 'must not solve by sorting the full array');
	},
});
