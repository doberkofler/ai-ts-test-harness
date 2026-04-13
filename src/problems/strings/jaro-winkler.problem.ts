import {defineImplementProblem} from '#problem-api';

const round4 = (n: number): number => Math.round(n * 10_000) / 10_000;

export default defineImplementProblem({
	name: 'jaro-winkler',
	category: 'strings',
	description: [
		'Compute the Jaro-Winkler similarity between two strings.',
		'Return a value in [0, 1] where 1 is an exact match and 0 is no similarity.',
		'Matching is case-sensitive.',
	],
	signature: 'function jaroWinkler(s1: string, s2: string): number',
	tests: ({assert, implementation}) => {
		assert.strictEqual(implementation('', ''), 1);
		assert.strictEqual(implementation('abc', 'abc'), 1);
		assert.strictEqual(implementation('abc', ''), 0);
		assert.strictEqual(implementation('', 'abc'), 0);
		assert.strictEqual(round4(Number(implementation('MARTHA', 'MARHTA'))), 0.9611);
		assert.strictEqual(round4(Number(implementation('DIXON', 'DICKSONX'))), 0.8133);
		assert.strictEqual(round4(Number(implementation('JELLYFISH', 'SMELLYFISH'))), 0.8967);
		assert.strictEqual(round4(Number(implementation('ABC', 'XYZ'))), 0);
		assert.strictEqual(round4(Number(implementation('CRATE', 'TRACE'))), 0.7333);
		assert.ok(Number(implementation('ABCDEF', 'ABCXYZ')) > Number(implementation('XBCDEF', 'ABCXYZ')));
		assert.ok(Number(implementation('abc', 'ABC')) < 1);
	},
});
