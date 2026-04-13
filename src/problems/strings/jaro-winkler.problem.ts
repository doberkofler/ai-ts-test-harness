import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'jaro-winkler',
	category: 'strings',
	description: [
		'Compute the Jaro-Winkler similarity between two strings.',
		'Return a value in [0, 1] where 1 is an exact match and 0 is no similarity.',
		'Matching is case-sensitive.',
	],
	signature: 'function jaroWinkler(s1: string, s2: string): number',
	tests: [
		"assert.strictEqual(jaroWinkler('', ''), 1);",
		"assert.strictEqual(jaroWinkler('abc', 'abc'), 1);",
		"assert.strictEqual(jaroWinkler('abc', ''), 0);",
		"assert.strictEqual(jaroWinkler('', 'abc'), 0);",
		'const r = (n: number) => Math.round(n * 10000) / 10000;',
		"assert.strictEqual(r(jaroWinkler('MARTHA', 'MARHTA')), 0.9611);",
		"assert.strictEqual(r(jaroWinkler('DIXON', 'DICKSONX')), 0.8133);",
		"assert.strictEqual(r(jaroWinkler('JELLYFISH', 'SMELLYFISH')), 0.8967);",
		"assert.strictEqual(r(jaroWinkler('ABC', 'XYZ')), 0);",
		"assert.strictEqual(r(jaroWinkler('CRATE', 'TRACE')), 0.7333);",
		"assert.ok(jaroWinkler('ABCDEF', 'ABCXYZ') > jaroWinkler('XBCDEF', 'ABCXYZ'));",
		"assert.ok(jaroWinkler('abc', 'ABC') < 1);",
	].join('\n'),
});
