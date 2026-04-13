import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'declaration-to-expression',
	category: 'refactor',
	description:
		'Refactor the given TypeScript function declaration into a const arrow function expression. Preserve the parameter list, type annotations, and body exactly.',
	input: ['function multiply(a: number, b: number): number {', '\treturn a * b;', '}'].join('\n'),
	entry: 'multiply',
	tests: [
		'assert.strictEqual((transformed as (left: number, right: number) => number)(3, 4), (original as (left: number, right: number) => number)(3, 4));',
		'assert.strictEqual((transformed as (left: number, right: number) => number)(-2, 5), (original as (left: number, right: number) => number)(-2, 5));',
		'assert.strictEqual((transformed as (left: number, right: number) => number)(0, 99), (original as (left: number, right: number) => number)(0, 99));',
		String.raw`assert.doesNotMatch(code.result, /function\s+multiply\s*\(/, 'function declaration must be refactored');`,
		String.raw`assert.match(code.result, /const\s+multiply\s*=/, 'const binding must exist');`,
		String.raw`assert.match(code.result, /=>/, 'arrow function syntax must exist');`,
	].join('\n'),
});
