const __legacySolution = (function topKFrequent(values: number[], k: number): number[] {
		const frequency = new Map<number, number>();
		for (const value of values) {
			frequency.set(value, (frequency.get(value) ?? 0) + 1);
		}

		return [...frequency.entries()]
			.sort((left, right) => right[1] - left[1] || left[0] - right[0])
			.slice(0, k)
			.map(([value]) => value);
	});
export const topKFrequent = __legacySolution;
