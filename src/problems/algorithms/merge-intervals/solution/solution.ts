const __legacySolution = (function mergeIntervals(intervals: [number, number][]): [number, number][] {
		if (intervals.length <= 1) {
			return [...intervals];
		}

		const sorted = [...intervals].sort((left, right) => left[0] - right[0]);
		const firstInterval = sorted.at(0);
		if (typeof firstInterval === 'undefined') {
			return [];
		}

		const merged: [number, number][] = [[firstInterval[0], firstInterval[1]]];

		for (let index = 1; index < sorted.length; index += 1) {
			const current = sorted.at(index);
			if (typeof current === 'undefined') {
				continue;
			}

			const previous = merged.at(-1);
			if (typeof previous === 'undefined') {
				continue;
			}

			if (current[0] <= previous[1]) {
				previous[1] = Math.max(previous[1], current[1]);
				continue;
			}

			merged.push([current[0], current[1]]);
		}

		return merged;
	});
export const mergeIntervals = __legacySolution;
