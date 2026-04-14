import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'normalize-number-input',
	category: 'parsing',
	description: [
		'Normalize unknown numeric input from string | number | null.',
		'Trim and parse strings as decimal numbers; reject blank and invalid values.',
		'Return null for invalid or non-finite numbers.',
	],
	signature: 'function normalizeNumberInput(input: string | number | null): number | null',
	solution: function normalizeNumberInput(input: string | number | null): number | null {
		if (input === null) {
			return null;
		}

		if (typeof input === 'number') {
			return Number.isFinite(input) ? input : null;
		}

		const trimmed = input.trim();
		if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
			return null;
		}

		const parsed = Number(trimmed);
		if (!Number.isFinite(parsed)) {
			return null;
		}

		return Object.is(parsed, -0) ? 0 : parsed;
	},
	tests: ({assert, implementation}) => {
		assert.strictEqual(implementation(42), 42);
		assert.strictEqual(implementation(' 3.5 '), 3.5);
		assert.strictEqual(implementation('-0'), 0);
		assert.strictEqual(implementation(''), null);
		assert.strictEqual(implementation('abc'), null);
		assert.strictEqual(implementation(Number.POSITIVE_INFINITY), null);
	},
});
