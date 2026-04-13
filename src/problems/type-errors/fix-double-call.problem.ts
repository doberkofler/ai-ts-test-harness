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
	tests: ({assert, transformed, code}) => {
		assert.strictEqual(transformed('5'), 10);
		assert.strictEqual(transformed('0'), 0);
		assert.match(code.result, /export\s+function\s+run\s*\(/, 'function must exist');
	},
});
