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
	tests: [
		'assert.strictEqual((transformed as (numbers: number[]) => number)([1, 2, 3, 4]), (original as (numbers: number[]) => number)([1, 2, 3, 4]));',
		'assert.strictEqual((transformed as (numbers: number[]) => number)([10, -5, 4]), (original as (numbers: number[]) => number)([10, -5, 4]));',
		'assert.strictEqual((transformed as (numbers: number[]) => number)([]), (original as (numbers: number[]) => number)([]));',
		String.raw`assert.doesNotMatch(code.result, /for\s*\(\s*let\s+i\s*=\s*0\s*;\s*i\s*<\s*numbers\.length\s*;\s*i\+\+\s*\)/, 'indexed loop must be removed');`,
		String.raw`assert.match(code.result, /for\s*\(\s*const\s+\w+\s+of\s+numbers\s*\)/, 'for...of loop must exist');`,
	].join('\n'),
});
