import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'iso-week',
	category: 'date-time',
	description: ['Return the ISO 8601 week number and ISO year for a given Date.', 'The ISO year may differ from the calendar year near year boundaries.'],
	signature: 'function getISOWeek(date: Date): {week: number; year: number}',
	solution: function getISOWeek(date: Date): {week: number; year: number} {
		// Clone to avoid mutation; normalize to UTC midnight
		const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

		// ISO weekday: Mon=1 … Sun=7
		const dow = d.getUTCDay() || 7;

		// Shift to nearest Thursday (ISO week anchor)
		d.setUTCDate(d.getUTCDate() + 4 - dow);

		const year = d.getUTCFullYear();

		// Ordinal of the Thursday within its year
		const yearStart = Date.UTC(year, 0, 1);
		const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);

		return {week, year};
	},
	tests: ({assert, implementation}) => {
		assert.deepStrictEqual(implementation(new Date(2024, 0, 1)), {week: 1, year: 2024});
		assert.deepStrictEqual(implementation(new Date(2024, 0, 8)), {week: 2, year: 2024});
		assert.deepStrictEqual(implementation(new Date(2024, 11, 30)), {week: 1, year: 2025});
		assert.deepStrictEqual(implementation(new Date(2023, 0, 1)), {week: 52, year: 2022});
		assert.deepStrictEqual(implementation(new Date(2024, 2, 14)), {week: 11, year: 2024});
	},
});
