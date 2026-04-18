type TrieNode = {
	children: Map<string, TrieNode>;
	isWord: boolean;
};

const __legacySolution = (function trieAutocomplete(words: string[], prefixes: string[]): string[][] {
		const root: TrieNode = {children: new Map<string, TrieNode>(), isWord: false};

		const insert = (word: string): void => {
			let node = root;
			for (const char of word) {
				let child = node.children.get(char);
				if (!child) {
					child = {children: new Map<string, TrieNode>(), isWord: false};
					node.children.set(char, child);
				}
				node = child;
			}
			node.isWord = true;
		};

		for (const word of words) {
			insert(word);
		}

		const findPrefixNode = (prefix: string): TrieNode | null => {
			let node = root;
			for (const char of prefix) {
				const next = node.children.get(char);
				if (!next) {
					return null;
				}
				node = next;
			}
			return node;
		};

		const collect = (node: TrieNode, prefix: string, output: string[]): void => {
			if (node.isWord) {
				output.push(prefix);
			}

			const entries = [...node.children.entries()].sort((left, right) => left[0].localeCompare(right[0]));
			for (const [char, child] of entries) {
				collect(child, `${prefix}${char}`, output);
			}
		};

		return prefixes.map((prefix) => {
			const start = findPrefixNode(prefix);
			if (!start) {
				return [];
			}

			const output: string[] = [];
			collect(start, prefix, output);
			return output;
		});
	});
export const trieAutocomplete = __legacySolution;
