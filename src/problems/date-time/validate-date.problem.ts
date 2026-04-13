import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'validate-date',
	category: 'date-time',
	description: [
		'Return true if the string is a valid calendar date in YYYY-MM-DD format, false otherwise.',
		'Must reject invalid months, out-of-range days, and incorrect leap-year dates.',
	],
	signature: 'function validateDate(s: string): boolean',
	tests: [
		"assert.strictEqual(validateDate('2024-01-15'), true);",
		"assert.strictEqual(validateDate('2024-02-29'), true);",
		"assert.strictEqual(validateDate('2023-02-29'), false);",
		"assert.strictEqual(validateDate('2024-13-01'), false);",
		"assert.strictEqual(validateDate('2024-00-01'), false);",
		"assert.strictEqual(validateDate('2024-01-00'), false);",
		"assert.strictEqual(validateDate('2024-01-32'), false);",
		"assert.strictEqual(validateDate('2024-04-31'), false);",
		"assert.strictEqual(validateDate('not-a-date'), false);",
		"assert.strictEqual(validateDate(''), false);",
	].join('\n'),
});
