import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'fizzbuzz',
	category: 'logic',
	description: 'Given a number n, return "Fizz" if divisible by 3, "Buzz" if divisible by 5, "FizzBuzz" if both, otherwise the number as a string.',
	signature: 'function fizzbuzz(n: number): string',
	tests: ({assert, implementation}) => {
		assert.strictEqual(implementation(1), '1');
		assert.strictEqual(implementation(3), 'Fizz');
		assert.strictEqual(implementation(5), 'Buzz');
		assert.strictEqual(implementation(15), 'FizzBuzz');
		assert.strictEqual(implementation(9), 'Fizz');
		assert.strictEqual(implementation(10), 'Buzz');
	},
});
