import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'fix-filter-nullish-narrowing',
	description: 'Fix filter(Boolean) so the result narrows to string[] with an explicit type predicate.',
	input: ['export function compact(values: Array<string | null | undefined>): string[] {', '	return values.filter(Boolean);', '}'].join('\n'),
	entry: 'compact',
	solution: () =>
		[
			"const isString = (value: string | null | undefined): value is string => typeof value === 'string';",
			'',
			'export function compact(values: (string | null | undefined)[]): string[] {',
			'\treturn values.filter(isString);',
			'}',
		].join('\n'),
	tests: ({assert, transformed, code}) => {
		assert.deepStrictEqual(transformed(['a', null, 'b', undefined]), ['a', 'b']);
		assert.deepStrictEqual(transformed([null, undefined]), []);
		assert.match(code.result, /value\s+is\s+string/);
		assert.doesNotMatch(code.result, /filter\(Boolean\)/);
	},
});
