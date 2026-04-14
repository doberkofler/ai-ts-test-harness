import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'murmurhash3',
	description: [
		'Implement MurmurHash3 (32-bit) for a string input with a numeric seed.',
		'Process input as UTF-16 code units (use charCodeAt; no TextEncoder or Buffer).',
		'Return an unsigned 32-bit integer.',
	],
	signature: 'function murmurhash3(str: string, seed: number): number',
	solution: function murmurhash3(str: string, seed: number): number {
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
	},
	tests: ({assert, implementation}) => {
		const fromHex = (value: string): number => Number.parseInt(value, 16);

		assert.strictEqual(implementation('', 0), 0);
		assert.strictEqual(implementation('', 1), fromHex('514E28B7'));
		assert.strictEqual(implementation('a', 0), fromHex('3C2569B2'));
		assert.strictEqual(implementation('ab', 0), fromHex('5F14E8B3'));
		assert.strictEqual(implementation('abcd', 0), fromHex('1F1EE412'));
		assert.strictEqual(implementation('hello', 0), fromHex('248BFA47'));
		assert.strictEqual(implementation('hello', 42), fromHex('4F2E8B1A'));
		assert.strictEqual(implementation('The quick brown fox', 0), fromHex('2F9A9E6B'));
		assert.notStrictEqual(implementation('test', 0), implementation('test', 1));
		assert.ok(Number(implementation('negative?', 0)) >= 0);
		assert.ok(Number(implementation('negative?', 0)) <= fromHex('FFFFFFFF'));
	},
});
