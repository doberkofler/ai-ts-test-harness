import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'to-number',
	category: 'parsing',
	description: [
		'Parse a string to a number.',
		'Trim whitespace before parsing.',
		'Return null if the string is empty, blank, or contains any non-numeric characters.',
	],
	signature: 'function toNumber(s: string): number | null',
	solution: function toNumber(s: string): number | null {
		const trimmed = s.trim();
		if (trimmed.length === 0) {
			return null;
		}

		if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
			return null;
		}

		const parsed = Number(trimmed);
		if (parsed === 0) {
			return 0;
		}

		return parsed;
	},
	tests: ({assert, implementation}) => {
		assert.strictEqual(implementation('42'), 42);
		assert.strictEqual(implementation('3.14'), 3.14);
		assert.strictEqual(implementation('-7'), -7);
		assert.strictEqual(implementation('-3.14'), -3.14);
		assert.strictEqual(implementation('  42  '), 42);
		assert.strictEqual(implementation('abc'), null);
		assert.strictEqual(implementation(''), null);
		assert.strictEqual(implementation('   '), null);
		assert.strictEqual(implementation('12abc'), null);
		assert.strictEqual(implementation('1.2.3'), null);
		assert.strictEqual(implementation('-'), null);
		assert.strictEqual(implementation('-.'), null);
		assert.strictEqual(implementation('.'), null);
		assert.strictEqual(implementation('Infinity'), null);
		assert.strictEqual(implementation('-0'), 0);
		assert.strictEqual(implementation('007'), 7);
		assert.strictEqual(implementation('1+2'), null);
		assert.strictEqual(implementation('1-2'), null);
		assert.strictEqual(implementation('+-1'), null);
		assert.strictEqual(implementation('--1'), null);
		assert.strictEqual(implementation('++1'), null);
		assert.strictEqual(implementation('1.'), null);
	},
});
