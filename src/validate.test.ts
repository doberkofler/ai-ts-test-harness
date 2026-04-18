import {describe, expect, test, vi} from 'vitest';
import {type ChangedFilesArtifact, type Problem, type Result} from './types.ts';
import {validateCommand} from './validate.ts';

type RunProblemFn = (problem: Problem, artifact: ChangedFilesArtifact) => Promise<Result>;

const solutionArtifact: ChangedFilesArtifact = {
	kind: 'changed-files-v1',
	files: [{path: 'src/sum.ts', content: 'export const sum = (a: number, b: number): number => a + b;\n'}],
};

const implementProblem: Problem = {
	name: 'sum',
	category: 'arithmetic',
	description: 'Add two numbers',
	timeout_ms: 5000,
	files: [{path: 'src/sum.ts', content: 'export const sum = (a: number, b: number): number => 0;\n'}],
	tests: [{path: 'tests/sum.test.ts', content: ''}],
	solution: solutionArtifact,
};

const missingSolutionProblem: Problem = {
	name: 'no-solution-yet',
	category: 'pending',
	description: 'Problem without a provided solution',
	timeout_ms: 5000,
	files: [{path: 'src/main.ts', content: 'export const value = 0;\n'}],
	tests: [{path: 'tests/main.test.ts', content: ''}],
};

describe('validateCommand', () => {
	test('runs provided solutions and negative checks', async () => {
		const logSpy = vi.spyOn(console, 'log');
		const runProblemFn = vi.fn<RunProblemFn>(async (_problem: Problem, artifact: ChangedFilesArtifact) => {
			await Promise.resolve();
			const serialized = JSON.stringify(artifact);
			if (serialized.includes('__invalid_solution__')) {
				return {problem: 'x', category: 'x', artifact, passed: false, duration_ms: 1};
			}

			return {problem: 'x', category: 'x', artifact, passed: true, duration_ms: 1};
		});

		await validateCommand({
			test: undefined,
			category: undefined,
			debug: false,
			loadProblemsFn: () => [implementProblem, missingSolutionProblem],
			runProblemFn,
		});

		expect(runProblemFn).toHaveBeenCalledTimes(2);
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[ 1/1] arithmetic/sum'));
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('no-solution-yet'));
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('missing-solution'));
		expect(logSpy).toHaveBeenCalledWith('Validation passed for 1/2 problems with solutions (2 checks).');
		logSpy.mockRestore();
	});

	test('throws when provided solution fails', async () => {
		const runProblemFn = vi.fn<RunProblemFn>(async (_problem, artifact) => {
			await Promise.resolve();
			return {
				problem: 'sum',
				category: 'arithmetic',
				artifact,
				passed: false,
				error: 'bad',
				duration_ms: 1,
			};
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
		const runProblemFn = vi.fn<RunProblemFn>(async (_problem, artifact) => {
			await Promise.resolve();
			return {
				problem: 'sum',
				category: 'arithmetic',
				artifact,
				passed: true,
				duration_ms: 1,
			};
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
