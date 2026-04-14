import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'parallelize-independent-awaits',
	category: 'refactor',
	description: 'Refactor independent sequential awaits to run concurrently with Promise.all.',
	input: [
		'const loadA = async (): Promise<number> => 4;',
		'const loadB = async (): Promise<number> => 6;',
		'',
		'export async function loadBoth(): Promise<number> {',
		'\tconst a = await loadA();',
		'\tconst b = await loadB();',
		'\treturn a + b;',
		'}',
	].join('\n'),
	entry: 'loadBoth',
	solution: () =>
		[
			'const loadA = async (): Promise<number> => 4;',
			'const loadB = async (): Promise<number> => 6;',
			'',
			'export async function loadBoth(): Promise<number> {',
			'\tconst [a, b] = await Promise.all([loadA(), loadB()]);',
			'\treturn a + b;',
			'}',
		].join('\n'),
	tests: async ({assert, transformed, code}) => {
		assert.strictEqual(await transformed(), 10);
		assert.match(code.result, /Promise\.all/);
		assert.match(code.result, /\[a,\s*b\]/);
	},
});
