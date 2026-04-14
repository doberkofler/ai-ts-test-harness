import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'promise-all-to-all-settled',
	category: 'refactor',
	description: 'Refactor Promise.all usage so one rejected task does not fail the whole operation.',
	input: [
		'export async function collectResults(tasks: Array<() => Promise<number>>): Promise<number[]> {',
		'\tconst values = await Promise.all(tasks.map((task) => task()));',
		'\treturn values;',
		'}',
	].join('\n'),
	entry: 'collectResults',
	solution: () =>
		[
			'export async function collectResults(tasks: Array<() => Promise<number>>): Promise<number[]> {',
			'\tconst settled = await Promise.allSettled(tasks.map((task) => task()));',
			"\treturn settled.filter((result): result is PromiseFulfilledResult<number> => result.status === 'fulfilled').map((result) => result.value);",
			'}',
		].join('\n'),
	tests: async ({assert, transformed, code}) => {
		const successOne = async (): Promise<number> => {
			await Promise.resolve();
			return 1;
		};

		const failure = async (): Promise<number> => {
			await Promise.resolve();
			throw new Error('bad task');
		};

		const successThree = async (): Promise<number> => {
			await Promise.resolve();
			return 3;
		};

		const tasks = [successOne, failure, successThree];

		assert.deepStrictEqual(await transformed(tasks), [1, 3]);
		assert.match(code.result, /Promise\.allSettled/);
		assert.doesNotMatch(code.result, /Promise\.all\(/);
	},
});
