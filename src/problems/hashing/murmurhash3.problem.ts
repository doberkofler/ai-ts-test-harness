import {defineImplementProblem} from '#problem-api';

const fromHex = (value: string): number => Number.parseInt(value, 16);

export default defineImplementProblem({
	name: 'murmurhash3',
	category: 'hashing',
	description: [
		'Implement MurmurHash3 (32-bit) for a string input with a numeric seed.',
		'Process input as UTF-16 code units (use charCodeAt; no TextEncoder or Buffer).',
		'Return an unsigned 32-bit integer.',
	],
	signature: 'function murmurhash3(str: string, seed: number): number',
	tests: ({assert, implementation}) => {
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
