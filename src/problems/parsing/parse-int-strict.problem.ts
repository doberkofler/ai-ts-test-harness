import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'parse-int-strict',
	category: 'parsing',
	description: [
		'Parse a base-10 integer from a string.',
		'Allow optional leading minus and surrounding whitespace.',
		'Return null when the input is not a strict integer.',
	],
	signature: 'function parseIntStrict(input: string): number | null',
	solution: function parseIntStrict(input: string): number | null {
		const trimmed = input.trim();
		if (!/^-?\d+$/.test(trimmed)) {
			return null;
		}

		const parsed = Number.parseInt(trimmed, 10);
		if (Number.isNaN(parsed)) {
			return null;
		}

		return parsed;
	},
	tests: ({assert, implementation}) => {
		assert.strictEqual(implementation('42'), 42);
		assert.strictEqual(implementation(' -12 '), -12);
		assert.strictEqual(implementation('007'), 7);
		assert.strictEqual(implementation('12.3'), null);
		assert.strictEqual(implementation('12abc'), null);
		assert.strictEqual(implementation(''), null);
	},
});
