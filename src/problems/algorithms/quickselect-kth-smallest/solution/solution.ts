const __legacySolution = (function quickselectKthSmallest(values: number[], k: number): number {
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
	});
export const quickselectKthSmallest = __legacySolution;
