const __legacySolution = (function binarySearchBoundary(values: number[], target: number): number {
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
	});
export const binarySearchBoundary = __legacySolution;
