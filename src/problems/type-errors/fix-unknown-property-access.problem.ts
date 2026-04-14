import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'fix-unknown-property-access',
	description: ['Fix unsafe property access on `unknown` input.', 'Return a trimmed name when payload has a valid string `name` field; otherwise throw.'],
	input: ['export function readName(payload: unknown): string {', '	return payload.name.trim();', '}'].join('\n'),
	entry: 'readName',
	solution: () =>
		[
			'export function readName(payload: unknown): string {',
			"\tif (typeof payload !== 'object' || payload === null || !('name' in payload)) {",
			"\t\tthrow new Error('payload.name must be a string');",
			'\t}',
			"\tconst name = payload['name'];",
			"\tif (typeof name !== 'string') {",
			"\t\tthrow new Error('payload.name must be a string');",
			'\t}',
			'\treturn name.trim();',
			'}',
		].join('\n'),
	tests: ({assert, transformed, code}) => {
		assert.strictEqual(transformed({name: '  Ada  '}), 'Ada');
		assert.throws(() => transformed({}), /payload\.name must be a string/);
		assert.match(code.result, /typeof\s+payload\s*!==\s*'object'/);
		assert.match(code.result, /'name'\s+in\s+payload/);
	},
});
