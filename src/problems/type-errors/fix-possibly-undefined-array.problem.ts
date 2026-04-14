import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'fix-possibly-undefined-array',
	description: ["Fix 'Object is possibly undefined' when reading first array element.", 'Throw an error for empty arrays.'],
	input: ['export function firstUpper(items: string[]): string {', '\treturn items[0].toUpperCase();', '}'].join('\n'),
	entry: 'firstUpper',
	solution: () =>
		[
			'export function firstUpper(items: string[]): string {',
			'\tif (items.length === 0) {',
			"\t\tthrow new Error('items must not be empty');",
			'\t}',
			'\treturn items[0].toUpperCase();',
			'}',
		].join('\n'),
	tests: ({assert, transformed, code}) => {
		assert.strictEqual(transformed(['hello', 'world']), 'HELLO');
		assert.throws(() => transformed([]));
		assert.match(code.result, /throw\s+new\s+Error|throw\s+Error/, 'empty array should throw');
	},
});
