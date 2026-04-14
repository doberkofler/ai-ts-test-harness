import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'add',
	description: 'Return the sum of two numbers.',
	signature: 'function add(a: number, b: number): number',
	solution: function add(a: number, b: number): number {
		return a + b;
	},
	tests: ({assert, implementation}) => {
		assert.strictEqual(implementation(1, 2), 3);
		assert.strictEqual(implementation(-1, 1), 0);
		assert.strictEqual(implementation(0, 0), 0);
		assert.strictEqual(implementation(100, -50), 50);
	},
});
