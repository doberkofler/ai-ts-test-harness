const __legacySolution = (function longestSubstringNoRepeat(input: string): number {
		const lastSeen = new Map<string, number>();
		let left = 0;
		let best = 0;

		for (let right = 0; right < input.length; right += 1) {
			const char = input.at(right);
			if (typeof char !== 'string') {
				continue;
			}

			const previousIndex = lastSeen.get(char);
			if (typeof previousIndex === 'number' && previousIndex >= left) {
				left = previousIndex + 1;
			}

			lastSeen.set(char, right);
			best = Math.max(best, right - left + 1);
		}

		return best;
	});
export const longestSubstringNoRepeat = __legacySolution;
