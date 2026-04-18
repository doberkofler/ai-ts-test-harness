const __legacySolution = (function groupAnagrams(words: string[]): string[][] {
		const groups = new Map<string, string[]>();
		const createKey = (word: string): string => {
			const counts = new Map<string, number>();
			for (const char of word) {
				counts.set(char, (counts.get(char) ?? 0) + 1);
			}

			return [...counts.entries()]
				.sort((left, right) => left[0].localeCompare(right[0]))
				.map(([char, count]) => `${char}:${count}`)
				.join('|');
		};

		for (const word of words) {
			const key = createKey(word);
			const bucket = groups.get(key);
			if (bucket) {
				bucket.push(word);
				continue;
			}

			groups.set(key, [word]);
		}

		return [...groups.values()];
	});
export const groupAnagrams = __legacySolution;
