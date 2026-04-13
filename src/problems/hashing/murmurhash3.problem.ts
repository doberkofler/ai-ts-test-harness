import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'murmurhash3',
	category: 'hashing',
	description: [
		'Implement MurmurHash3 (32-bit) for a string input with a numeric seed.',
		'Process input as UTF-16 code units (use charCodeAt; no TextEncoder or Buffer).',
		'Return an unsigned 32-bit integer.',
	],
	signature: 'function murmurhash3(str: string, seed: number): number',
	tests: [
		"assert.strictEqual(murmurhash3('', 0), 0);",
		"assert.strictEqual(murmurhash3('', 1), 0x514e28b7);",
		"assert.strictEqual(murmurhash3('a', 0), 0x3c2569b2);",
		"assert.strictEqual(murmurhash3('ab', 0), 0x5f14e8b3);",
		"assert.strictEqual(murmurhash3('abcd', 0), 0x1f1ee412);",
		"assert.strictEqual(murmurhash3('hello', 0), 0x248bfa47);",
		"assert.strictEqual(murmurhash3('hello', 42), 0x4f2e8b1a);",
		"assert.strictEqual(murmurhash3('The quick brown fox', 0), 0x2f9a9e6b);",
		"assert.notStrictEqual(murmurhash3('test', 0), murmurhash3('test', 1));",
		"assert.ok(murmurhash3('negative?', 0) >= 0);",
		"assert.ok(murmurhash3('negative?', 0) <= 0xffffffff);",
	].join('\n'),
});
