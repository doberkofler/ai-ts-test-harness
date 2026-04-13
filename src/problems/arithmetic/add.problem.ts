import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'add',
	category: 'arithmetic',
	description: 'Return the sum of two numbers.',
	signature: 'function add(a: number, b: number): number',
	tests: [
		'assert.strictEqual(add(1, 2), 3);',
		'assert.strictEqual(add(-1, 1), 0);',
		'assert.strictEqual(add(0, 0), 0);',
		'assert.strictEqual(add(100, -50), 50);',
	].join('\n'),
});
