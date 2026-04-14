import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'fix-unsafe-type-assertion',
	description: 'Replace unsafe type assertion with runtime checks before reading nested fields.',
	input: ['export function upperUserId(payload: unknown): string {', '\tconst user = payload as {id: string};', '\treturn user.id.toUpperCase();', '}'].join(
		'\n',
	),
	entry: 'upperUserId',
	solution: () =>
		[
			'export function upperUserId(payload: unknown): string {',
			"\tif (typeof payload !== 'object' || payload === null || !('id' in payload)) {",
			"\t\tthrow new Error('payload.id must be a string');",
			'\t}',
			"\tconst id = payload['id'];",
			"\tif (typeof id !== 'string') {",
			"\t\tthrow new Error('payload.id must be a string');",
			'\t}',
			'\treturn id.toUpperCase();',
			'}',
		].join('\n'),
	tests: ({assert, transformed, code}) => {
		assert.strictEqual(transformed({id: 'abc'}), 'ABC');
		assert.throws(() => transformed({id: 1}), /payload\.id must be a string/);
		assert.doesNotMatch(code.result, /as\s+\{\s*id:\s*string\s*\}/);
		assert.match(code.result, /typeof\s+id\s*!==\s*'string'/);
	},
});
