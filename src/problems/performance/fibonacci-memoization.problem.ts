import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'fibonacci-memoization',
	description: 'Refactor naive recursive Fibonacci to memoized implementation with identical results.',
	input: [
		'export function fibonacci(n: number): number {',
		'\tif (n <= 1) {',
		'\t\treturn n;',
		'\t}',
		'\treturn fibonacci(n - 1) + fibonacci(n - 2);',
		'}',
	].join('\n'),
	entry: 'fibonacci',
	solution: () =>
		[
			'const memo = new Map<number, number>([[0, 0], [1, 1]]);',
			'',
			'export function fibonacci(n: number): number {',
			'\tconst cached = memo.get(n);',
			"\tif (typeof cached === 'number') {",
			'\t\treturn cached;',
			'\t}',
			'\tconst value = fibonacci(n - 1) + fibonacci(n - 2);',
			'\tmemo.set(n, value);',
			'\treturn value;',
			'}',
		].join('\n'),
	tests: ({assert, original, transformed, code}) => {
		assert.strictEqual(transformed(0), 0);
		assert.strictEqual(transformed(1), 1);
		assert.strictEqual(transformed(10), original(10));
		assert.strictEqual(transformed(20), original(20));
		assert.match(code.result, /new\s+Map/);
		assert.match(code.result, /memo\.get/);
	},
});
