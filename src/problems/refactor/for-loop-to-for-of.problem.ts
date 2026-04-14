import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'for-loop-to-for-of',
	category: 'refactor',
	description:
		'Refactor the given TypeScript indexed for(;;) loop that iterates an array by index into an equivalent for...of loop. Preserve all surrounding code and logic.',
	input: [
		'function sumAll(numbers: number[]): number {',
		'\tlet total = 0;',
		'\tfor (let i = 0; i < numbers.length; i++) {',
		'\t\ttotal += numbers[i];',
		'\t}',
		'\treturn total;',
		'}',
	].join('\n'),
	entry: 'sumAll',
	solution: () =>
		[
			'function sumAll(numbers: number[]): number {',
			'\tlet total = 0;',
			'\tfor (const number of numbers) {',
			'\t\ttotal += number;',
			'\t}',
			'\treturn total;',
			'}',
		].join('\n'),
	tests: ({assert, original, transformed, code}) => {
		assert.strictEqual(transformed([1, 2, 3, 4]), original([1, 2, 3, 4]));
		assert.strictEqual(transformed([10, -5, 4]), original([10, -5, 4]));
		assert.strictEqual(transformed([]), original([]));
		assert.doesNotMatch(code.result, /for\s*\(\s*let\s+i\s*=\s*0\s*;\s*i\s*<\s*numbers\.length\s*;\s*i\+\+\s*\)/, 'indexed loop must be removed');
		assert.match(code.result, /for\s*\(\s*const\s+\w+\s+of\s+numbers\s*\)/, 'for...of loop must exist');
	},
});
