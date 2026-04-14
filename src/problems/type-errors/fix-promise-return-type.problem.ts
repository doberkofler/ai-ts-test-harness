import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'fix-promise-return-type',
	category: 'type-errors',
	description: 'Fix async return type mismatch so the function returns Promise<number>.',
	input: [
		'const fetchCount = async (): Promise<string> => Promise.resolve("123");',
		'',
		'export async function getCount(): Promise<number> {',
		'\treturn fetchCount();',
		'}',
	].join('\n'),
	entry: 'getCount',
	solution: () =>
		[
			'const fetchCount = async (): Promise<string> => Promise.resolve("123");',
			'',
			'export async function getCount(): Promise<number> {',
			'\tconst raw = await fetchCount();',
			'\tconst parsed = Number(raw);',
			'\tif (!Number.isFinite(parsed)) {',
			"\t\tthrow new Error('count is not numeric');",
			'\t}',
			'\treturn parsed;',
			'}',
		].join('\n'),
	tests: async ({assert, transformed, code}) => {
		assert.strictEqual(await transformed(), 123);
		assert.match(code.result, /await\s+fetchCount\(/);
		assert.match(code.result, /Number\(raw\)/);
	},
});
