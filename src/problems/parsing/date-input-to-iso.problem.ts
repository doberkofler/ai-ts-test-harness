import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'date-input-to-iso',
	description: [
		'Convert a date string in YYYY-MM-DD format into the same normalized ISO date string.',
		'Return null for invalid calendar dates or malformed input.',
	],
	signature: 'function dateInputToIso(input: string): string | null',
	solution: function dateInputToIso(input: string): string | null {
		const trimmed = input.trim();
		const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
		if (!match) {
			return null;
		}

		const year = Number(match[1]);
		const month = Number(match[2]);
		const day = Number(match[3]);
		const date = new Date(Date.UTC(year, month - 1, day));
		if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
			return null;
		}

		return `${match[1]}-${match[2]}-${match[3]}`;
	},
	tests: ({assert, implementation}) => {
		assert.strictEqual(implementation('2024-02-29'), '2024-02-29');
		assert.strictEqual(implementation('2023-02-29'), null);
		assert.strictEqual(implementation('2024-13-01'), null);
		assert.strictEqual(implementation('2024-04-31'), null);
		assert.strictEqual(implementation('2024-04-30'), '2024-04-30');
	},
});
