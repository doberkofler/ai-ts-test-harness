import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'to-boolean-strict',
	category: 'parsing',
	description: [
		'Convert known string values to booleans.',
		'Accept true/false/1/0/yes/no (case-insensitive) with trimming.',
		'Return null for all other values.',
	],
	signature: 'function toBooleanStrict(input: string): boolean | null',
	solution: function toBooleanStrict(input: string): boolean | null {
		const normalized = input.trim().toLowerCase();
		if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
			return true;
		}

		if (normalized === 'false' || normalized === '0' || normalized === 'no') {
			return false;
		}

		return null;
	},
	tests: ({assert, implementation}) => {
		assert.strictEqual(implementation('true'), true);
		assert.strictEqual(implementation(' YES '), true);
		assert.strictEqual(implementation('0'), false);
		assert.strictEqual(implementation('No'), false);
		assert.strictEqual(implementation('on'), null);
		assert.strictEqual(implementation(''), null);
	},
});
