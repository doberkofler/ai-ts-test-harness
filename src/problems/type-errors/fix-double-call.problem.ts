import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'fix-double-call',
	category: 'type-errors',
	description: 'Fix the type error while preserving behavior.',
	input: [
		'function double(n: number): number {',
		'	return n * 2;',
		'}',
		'',
		'export function run(input: string): number {',
		'	return double(input);',
		'}',
	].join('\n'),
	entry: 'run',
	solution: () =>
		[
			'function double(n: number): number {',
			'\treturn n * 2;',
			'}',
			'',
			'export function run(input: string): number {',
			'\treturn double(Number(input));',
			'}',
		].join('\n'),
	tests: ({assert, transformed, code}) => {
		assert.strictEqual(transformed('5'), 10);
		assert.strictEqual(transformed('0'), 0);
		assert.match(code.result, /Number\s*\(\s*input\s*\)/, 'input should be converted to number');
		assert.doesNotMatch(code.result, /double\s*\(\s*input\s*\)/, 'input string should not be passed directly');
		assert.match(code.result, /export\s+function\s+run\s*\(/, 'function must exist');
	},
});
