const __legacySolution = (function kLargestElementsInStream(stream: number[], k: number): number[][] {
		if (!Number.isInteger(k) || k <= 0) {
			return stream.map(() => []);
		}

		const heap: number[] = [];
		const at = (index: number): number => {
			const value = heap[index];
			if (typeof value !== 'number') {
				throw new TypeError(`invalid min-heap state at index ${index}`);
			}
			return value;
		};

		const swap = (i: number, j: number): void => {
			const left = at(i);
			const right = at(j);
			heap[i] = right;
			heap[j] = left;
		};

		const bubbleUp = (index: number): void => {
			let i = index;
			while (i > 0) {
				const parent = Math.floor((i - 1) / 2);
				if (at(parent) <= at(i)) {
					break;
				}
				swap(parent, i);
				i = parent;
			}
		};

		const bubbleDown = (index: number): void => {
			let i = index;
			for (;;) {
				const left = i * 2 + 1;
				const right = i * 2 + 2;
				let smallest = i;

				if (left < heap.length && at(left) < at(smallest)) {
					smallest = left;
				}
				if (right < heap.length && at(right) < at(smallest)) {
					smallest = right;
				}
				if (smallest === i) {
					break;
				}

				swap(i, smallest);
				i = smallest;
			}
		};

		const pushTopK = (value: number): void => {
			if (heap.length < k) {
				heap.push(value);
				bubbleUp(heap.length - 1);
				return;
			}

			if (value <= at(0)) {
				return;
			}

			heap[0] = value;
			bubbleDown(0);
		};

		const output: number[][] = [];
		for (const value of stream) {
			pushTopK(value);
			output.push([...heap].sort((left, right) => right - left));
		}

		return output;
	});
export const kLargestElementsInStream = __legacySolution;
