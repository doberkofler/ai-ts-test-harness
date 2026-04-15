import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'insert-thousands-separators-lookahead',
	description: [
		'Insert thousands separators in a numeric string using String.replace and a lookahead regexp only.',
		'Examples: 1234567 -> 1,234,567 and 999 remains 999.',
	],
	signature: 'function insertThousandsSeparatorsLookahead(n: string): string',
	solution: function insertThousandsSeparatorsLookahead(n: string): string {
		return n.replaceAll(/\B(?=(\d{3})+(?!\d))/g, ',');
	},
	tests: ({assert, implementation}) => {
		assert.strictEqual(implementation('1234567'), '1,234,567');
		assert.strictEqual(implementation('1000'), '1,000');
		assert.strictEqual(implementation('999'), '999');
		assert.strictEqual(implementation('1000000'), '1,000,000');
	},
});
