import {describe, expect, test, vi} from 'vitest';
import {type Problem, type Result} from './types.ts';
import {validateCommand} from './validate.ts';

type RunProblemFn = (problem: Problem, code: string) => Promise<Result>;

const implementProblem: Problem = {
	name: 'sum',
	category: 'arithmetic',
	description: 'Add two numbers',
	signature: 'function sum(a: number, b: number): number',
	solution: 'function sum(a: number, b: number): number { return a + b; }',
	tests: 'assert.strictEqual(sum(1, 2), 3);',
};

const refactorProblem: Problem = {
	name: 'rename-variables',
	category: 'refactor',
	kind: 'direct-refactor',
	description: ['Rename local variables'],
	input: 'function rename(a: number): number { const tmp = a + 1; return tmp; }',
	entry: 'rename',
	solution: 'function rename(a: number): number { const value = a + 1; return value; }',
	tests: String.raw`assert.doesNotMatch(code.result, /\btmp\b/);`,
};

describe('validateCommand', () => {
	test('runs provided solutions and negative checks', async () => {
		const logSpy = vi.spyOn(console, 'log');
		const runProblemFn = vi.fn<RunProblemFn>(async (_problem: Problem, code: string) => {
			await Promise.resolve();
			if (code.includes('return undefined') || code.includes('const tmp = a + 1')) {
				return {
					problem: 'x',
					category: 'x',
					program: code,
					passed: false,
					duration_ms: 1,
				};
			}

			return {
				problem: 'x',
				category: 'x',
				program: code,
				passed: true,
				duration_ms: 1,
			};
		});

		await validateCommand({
			test: undefined,
			category: undefined,
			debug: false,
			loadProblemsFn: () => [implementProblem, refactorProblem],
			runProblemFn,
		});

		expect(runProblemFn).toHaveBeenCalledTimes(4);
		expect(logSpy).toHaveBeenCalledWith('Validation passed for 2/2 problems with solutions (4 checks).');
		logSpy.mockRestore();
	});

	test('throws when provided solution fails', async () => {
		const runProblemFn = vi.fn<RunProblemFn>(async () => {
			await Promise.resolve();
			return {problem: 'sum', category: 'arithmetic', program: '', passed: false, error: 'bad', duration_ms: 1};
		});

		await expect(
			validateCommand({
				test: 'sum',
				category: undefined,
				debug: false,
				loadProblemsFn: () => [implementProblem],
				runProblemFn,
			}),
		).rejects.toThrow('provided solution failed tests');
	});

	test('throws when invalid solution is accepted', async () => {
		const runProblemFn = vi.fn<RunProblemFn>(async (_problem: Problem, code: string) => {
			await Promise.resolve();
			return {problem: 'sum', category: 'arithmetic', program: code, passed: !code.includes('a + b'), duration_ms: 1};
		});

		await expect(
			validateCommand({
				test: 'sum',
				category: undefined,
				debug: false,
				loadProblemsFn: () => [implementProblem],
				runProblemFn,
			}),
		).rejects.toThrow('tests accepted an intentionally invalid solution');
	});
});
