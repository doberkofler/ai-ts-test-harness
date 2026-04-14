// oxlint-disable typescript/non-nullable-type-assertion-style, typescript/no-unsafe-type-assertion

import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'validate-date',
	description: [
		'Return true if the string is a valid calendar date in YYYY-MM-DD format, false otherwise.',
		'Must reject invalid months, out-of-range days, and incorrect leap-year dates.',
	],
	signature: 'function validateDate(s: string): boolean',
	solution: function validateDate(s: string): boolean {
		// Strict format: exactly YYYY-MM-DD, digits only in each segment
		const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
		if (match === null) {
			return false;
		}

		const year = Number.parseInt(match[1] as string, 10);
		const month = Number.parseInt(match[2] as string, 10);
		const day = Number.parseInt(match[3] as string, 10);

		if (month < 1 || month > 12) {
			return false;
		}

		const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

		const daysInMonth = [
			0, // index 0 unused
			31, // Jan
			isLeap ? 29 : 28, // Feb
			31, // Mar
			30, // Apr
			31, // May
			30, // Jun
			31, // Jul
			31, // Aug
			30, // Sep
			31, // Oct
			30, // Nov
			31, // Dec
		] as const;

		// @ts-expect-error: TS2532
		return day >= 1 && day <= daysInMonth[month];
	},
	tests: ({assert, implementation}) => {
		assert.strictEqual(implementation('2024-01-15'), true);
		assert.strictEqual(implementation('2024-02-29'), true);
		assert.strictEqual(implementation('2023-02-29'), false);
		assert.strictEqual(implementation('2024-13-01'), false);
		assert.strictEqual(implementation('2024-00-01'), false);
		assert.strictEqual(implementation('2024-01-00'), false);
		assert.strictEqual(implementation('2024-01-32'), false);
		assert.strictEqual(implementation('2024-04-31'), false);
		assert.strictEqual(implementation('not-a-date'), false);
		assert.strictEqual(implementation(''), false);
	},
});
