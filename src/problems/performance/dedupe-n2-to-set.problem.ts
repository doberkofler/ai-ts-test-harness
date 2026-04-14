import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'dedupe-n2-to-set',
	description: 'Refactor O(n^2) array deduplication to use Set-based O(n) behavior.',
	input: [
		'export function dedupe(values: number[]): number[] {',
		'\tconst result: number[] = [];',
		'\tfor (const value of values) {',
		'\t\tif (!result.includes(value)) {',
		'\t\t\tresult.push(value);',
		'\t\t}',
		'\t}',
		'\treturn result;',
		'}',
	].join('\n'),
	entry: 'dedupe',
	solution: () => ['export function dedupe(values: number[]): number[] {', '\treturn [...new Set(values)];', '}'].join('\n'),
	tests: ({assert, original, transformed, code}) => {
		const input = [1, 2, 1, 3, 2, 4];
		assert.deepStrictEqual(transformed(input), original(input));
		assert.deepStrictEqual(transformed([5, 5, 5]), [5]);
		assert.match(code.result, /new\s+Set\(/);
		assert.doesNotMatch(code.result, /includes\(/);
	},
});
