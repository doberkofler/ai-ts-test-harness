const __legacySolution = (function quicksort(arr: number[]): number[] {
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
	});
export const quicksort = __legacySolution;
