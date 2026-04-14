import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'includes-in-loop-to-set',
	description: 'Refactor repeated includes checks inside a loop to use a precomputed Set lookup.',
	input: [
		'export function selectAllowed(items: string[], allowed: string[]): string[] {',
		'\tconst result: string[] = [];',
		'\tfor (const item of items) {',
		'\t\tif (allowed.includes(item)) {',
		'\t\t\tresult.push(item);',
		'\t\t}',
		'\t}',
		'\treturn result;',
		'}',
	].join('\n'),
	entry: 'selectAllowed',
	solution: () =>
		[
			'export function selectAllowed(items: string[], allowed: string[]): string[] {',
			'\tconst allowedSet = new Set(allowed);',
			'\tconst result: string[] = [];',
			'\tfor (const item of items) {',
			'\t\tif (allowedSet.has(item)) {',
			'\t\t\tresult.push(item);',
			'\t\t}',
			'\t}',
			'\treturn result;',
			'}',
		].join('\n'),
	tests: ({assert, original, transformed, code}) => {
		const items = ['a', 'x', 'b', 'c', 'x'];
		const allowed = ['a', 'b', 'd'];
		assert.deepStrictEqual(transformed(items, allowed), original(items, allowed));
		assert.match(code.result, /new\s+Set\(allowed\)/);
		assert.match(code.result, /allowedSet\.has\(/);
		assert.doesNotMatch(code.result, /allowed\.includes\(/);
	},
});
