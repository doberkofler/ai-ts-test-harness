const __legacySolution = (function binarySearchFirstLastPosition(values: number[], target: number): [number, number] {
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
	});
export const binarySearchFirstLastPosition = __legacySolution;
