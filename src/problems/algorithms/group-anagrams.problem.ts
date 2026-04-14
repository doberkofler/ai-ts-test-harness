import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'group-anagrams',
	category: 'algorithms',
	description: 'Group words that are anagrams. Return groups sorted by first appearance in the input.',
	signature: 'function groupAnagrams(words: string[]): string[][]',
	solution: function groupAnagrams(words: string[]): string[][] {
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
	},
	tests: ({assert, implementation}) => {
		assert.deepStrictEqual(implementation(['eat', 'tea', 'tan', 'ate', 'nat', 'bat']), [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]);
		assert.deepStrictEqual(implementation(['']), [['']]);
		assert.deepStrictEqual(implementation(['a']), [['a']]);
	},
});
