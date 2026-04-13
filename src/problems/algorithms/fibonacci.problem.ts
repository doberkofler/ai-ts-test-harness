// oxlint-disable no-template-curly-in-string

import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'fibonacci',
	category: 'algorithms',
	description: 'Return the nth Fibonacci number (0-indexed). fib(0)=0, fib(1)=1, fib(2)=1, fib(3)=2, ...',
	signature: 'function fibonacci(n: number): number',
	solution: [
		'/**',
		' * Returns the nth Fibonacci number (0-indexed).',
		' * @param n - Non-negative integer index',
		' * @throws {RangeError} If n is negative or non-integer',
		' */',
		'function fibonacci(n: number): number {',
		'	if (!Number.isInteger(n) || n < 0) throw new RangeError(`n must be a non-negative integer, got ${n}`);',
		'	if (n === 0) return 0;',
		'	let prev = 0, curr = 1;',
		'	for (let i = 1; i < n; i++) [prev, curr] = [curr, prev + curr];',
		'	return curr;',
		'}',
	],
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
