import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'fibonacci',
	category: 'algorithms',
	description: ['Return the nth Fibonacci number (0-indexed). fib(0)=0, fib(1)=1, fib(2)=1, fib(3)=2, ...'],
	signature: 'function fibonacci(n: number): number',
	tests: [
		'assert.strictEqual(fibonacci(0), 0);',
		'assert.strictEqual(fibonacci(1), 1);',
		'assert.strictEqual(fibonacci(2), 1);',
		'assert.strictEqual(fibonacci(3), 2);',
		'assert.strictEqual(fibonacci(4), 3);',
		'assert.strictEqual(fibonacci(5), 5);',
		'assert.strictEqual(fibonacci(10), 55);',
		'assert.strictEqual(fibonacci(15), 610);',
	].join('\n'),
});
