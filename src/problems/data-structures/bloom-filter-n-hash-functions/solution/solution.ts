const __legacySolution = (function bloomFilterNHashFunctions(size: number, hashCount: number, wordsToAdd: string[], queries: string[]): boolean[] {
		if (!Number.isInteger(size) || size <= 0) {
			throw new RangeError('size must be a positive integer');
		}
		if (!Number.isInteger(hashCount) || hashCount <= 0) {
			throw new RangeError('hashCount must be a positive integer');
		}

		const bits = new Uint8Array(size);

		const hashAt = (value: string, seed: number): number => {
			let hash = seed ^ 0x9e3779b9;
			for (const char of value) {
				hash ^= char.charCodeAt(0);
				hash = Math.imul(hash, 16777619);
				hash ^= hash >>> 13;
			}
			hash ^= hash >>> 16;
			return (hash >>> 0) % size;
		};

		const add = (word: string): void => {
			for (let i = 0; i < hashCount; i++) {
				const index = hashAt(word, i + 1);
				bits[index] = 1;
			}
		};

		const maybeHas = (word: string): boolean => {
			for (let i = 0; i < hashCount; i++) {
				const index = hashAt(word, i + 1);
				if (bits[index] === 0) {
					return false;
				}
			}
			return true;
		};

		for (const word of wordsToAdd) {
			add(word);
		}

		return queries.map((query) => maybeHas(query));
	});
export const bloomFilterNHashFunctions = __legacySolution;
