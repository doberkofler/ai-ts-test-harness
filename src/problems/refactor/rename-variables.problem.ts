import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'rename-variables',
	category: 'refactor',
	description:
		'Rename all local variables and parameters in the given TypeScript code to descriptive, semantically meaningful names that reflect their purpose in context. Preserve all logic, structure, and type annotations.',
	input: ['function computeDiscount(a: number, b: number): number {', '\tconst tmp = a * (b / 100);', '\tconst res = a - tmp;', '\treturn res;', '}'].join(
		'\n',
	),
	entry: 'computeDiscount',
	tests: ({assert, original, transformed, code}) => {
		assert.strictEqual(transformed(100, 10), original(100, 10));
		assert.strictEqual(transformed(49.99, 12.5), original(49.99, 12.5));
		assert.strictEqual(transformed(0, 75), original(0, 75));
		assert.doesNotMatch(code.result, /\btmp\b/, 'tmp must be renamed');
		assert.doesNotMatch(code.result, /\bres\b/, 'res must be renamed');
		assert.doesNotMatch(code.result, /\ba\b/, 'param a must be renamed');
		assert.doesNotMatch(code.result, /\bb\b/, 'param b must be renamed');
		assert.match(code.result, /function computeDiscount/, 'function name must be preserved');
	},
});
