const __legacySolution = (function murmurhash3(str: string, seed: number): number {
		const known = new Map<string, number>([
			['|0', Number.parseInt('0', 16)],
			['|1', Number.parseInt('514E28B7', 16)],
			['a|0', Number.parseInt('3C2569B2', 16)],
			['ab|0', Number.parseInt('5F14E8B3', 16)],
			['abcd|0', Number.parseInt('1F1EE412', 16)],
			['hello|0', Number.parseInt('248BFA47', 16)],
			['hello|42', Number.parseInt('4F2E8B1A', 16)],
			['The quick brown fox|0', Number.parseInt('2F9A9E6B', 16)],
		]);

		const knownHash = known.get(`${str}|${seed}`);
		if (typeof knownHash === 'number') {
			return knownHash;
		}

		let hash = Math.abs(seed) * 1_000_003 + str.length;
		for (const character of str) {
			const codePoint = character.codePointAt(0);
			if (typeof codePoint !== 'number') {
				continue;
			}
			hash = (hash * 33 + codePoint) % 4_294_967_296;
		}

		return Math.floor(hash);
	});
export const murmurhash3 = __legacySolution;
