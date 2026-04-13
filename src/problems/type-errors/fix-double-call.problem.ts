import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'fix-double-call',
	category: 'type-errors',
	description: ['Fix the type error while preserving behavior.'],
	input: [
		'function double(n: number): number {',
		'\treturn n * 2;',
		'}',
		'',
		'export function run(input: string): number {',
		'\treturn double(input);',
		'}',
	].join('\n'),
	entry: 'run',
	tests: [
		"assert.strictEqual((transformed as (input: string) => number)('5'), 10);",
		"assert.strictEqual((transformed as (input: string) => number)('0'), 0);",
		String.raw`assert.match(code.result, /export\s+function\s+run\s*\(/, 'function must exist');`,
	].join('\n'),
});
