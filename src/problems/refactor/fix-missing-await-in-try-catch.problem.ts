import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'fix-missing-await-in-try-catch',
	description: 'Refactor async error handling so try/catch actually captures promise rejections.',
	input: [
		'const fetchData = async (id: string): Promise<string> => {',
		"\tif (id === 'bad') {",
		"\t\tthrow new Error('boom');",
		'\t}',
		['\treturn `ok:', String.fromCodePoint(36), '{id}`;'].join(''),
		'};',
		'',
		'export async function loadData(id: string): Promise<string> {',
		'\ttry {',
		'\t\treturn fetchData(id);',
		'\t} catch (error) {',
		['\t\treturn `failed:', String.fromCodePoint(36), '{String(error)}`;'].join(''),
		'\t}',
		'}',
	].join('\n'),
	entry: 'loadData',
	solution: () =>
		[
			'const fetchData = async (id: string): Promise<string> => {',
			"\tif (id === 'bad') {",
			"\t\tthrow new Error('boom');",
			'\t}',
			['\treturn `ok:', String.fromCodePoint(36), '{id}`;'].join(''),
			'};',
			'',
			'export async function loadData(id: string): Promise<string> {',
			'\ttry {',
			'\t\treturn await fetchData(id);',
			'\t} catch (error) {',
			['\t\treturn `failed:', String.fromCodePoint(36), '{String(error)}`;'].join(''),
			'\t}',
			'}',
		].join('\n'),
	tests: async ({assert, transformed, code}) => {
		assert.strictEqual(await transformed('42'), 'ok:42');
		assert.strictEqual(await transformed('bad'), 'failed:Error: boom');
		assert.match(code.result, /await\s+fetchData\(/);
	},
});
