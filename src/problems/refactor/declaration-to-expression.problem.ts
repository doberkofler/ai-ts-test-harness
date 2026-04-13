import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'declaration-to-expression',
	category: 'refactor',
	description:
		'Refactor the given TypeScript function declaration into a const arrow function expression. Preserve the parameter list, type annotations, and body exactly.',
	input: ['function multiply(a: number, b: number): number {', '\treturn a * b;', '}'].join('\n'),
	entry: 'multiply',
	tests: ({assert, original, transformed, code}) => {
		assert.strictEqual(transformed(3, 4), original(3, 4));
		assert.strictEqual(transformed(-2, 5), original(-2, 5));
		assert.strictEqual(transformed(0, 99), original(0, 99));
		assert.doesNotMatch(code.result, /function\s+multiply\s*\(/, 'function declaration must be refactored');
		assert.match(code.result, /const\s+multiply\s*=/, 'const binding must exist');
		assert.match(code.result, /[=]>/, 'arrow function syntax must exist');
	},
});
