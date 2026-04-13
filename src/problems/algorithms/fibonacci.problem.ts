import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'fibonacci',
	category: 'algorithms',
	description: 'Return the nth Fibonacci number (0-indexed). fib(0)=0, fib(1)=1, fib(2)=1, fib(3)=2, ...',
	signature: 'function fibonacci(n: number): number',
	solution: function fibonacci(n: number): number {
		if (!Number.isInteger(n) || n < 0) {
			throw new RangeError(`n must be a non-negative integer, got ${n}`);
		}

		if (n < 2) {
			return n;
		}

		return fibonacci(n - 1) + fibonacci(n - 2);
	},
	tests: ({assert, implementation}) => {
		assert.strictEqual(implementation(0), 0);
		assert.strictEqual(implementation(1), 1);
		assert.strictEqual(implementation(2), 1);
		assert.strictEqual(implementation(3), 2);
		assert.strictEqual(implementation(4), 3);
		assert.strictEqual(implementation(5), 5);
		assert.strictEqual(implementation(10), 55);
		assert.strictEqual(implementation(15), 610);
	},
});
