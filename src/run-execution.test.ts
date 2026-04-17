import {beforeEach, describe, expect, test, vi} from 'vitest';
import {type Problem, type Result} from './types.ts';

const solveProblemMock = vi.fn<(problem: Problem, options: Record<string, unknown>) => Promise<Result>>();

vi.mock(import('./solveProblem.ts'), () => ({
	solveProblem: solveProblemMock,
}));

const {executeProblems} = await import('./run-execution.ts');

const makeProblem = (name: string, category = 'logic'): Problem => ({
	name,
	category,
	description: ['test problem'],
	signature: `function ${name}(value: number): number`,
	tests: ({assert}): void => {
		assert.strictEqual(true, true);
	},
});

describe('executeProblems', () => {
	beforeEach(() => {
		solveProblemMock.mockReset();
	});

	test('executes each selected problem and forwards runtime options', async () => {
		const log = vi.fn<(message: string) => void>();
		const onProblemComplete = vi.fn<(results: Result[]) => void>();
		solveProblemMock
			.mockResolvedValueOnce({problem: 'one', category: 'logic', program: 'code-1', passed: true, duration_ms: 10})
			.mockResolvedValueOnce({problem: 'two', category: 'logic', program: 'code-2', passed: false, error: 'boom', duration_ms: 12});

		const results = await executeProblems(
			[makeProblem('one'), makeProblem('two')],
			{
				model: 'model-a',
				debug: true,
				llmTimeoutSecs: 75,
				cooldownPeriodSecs: 0,
				ollamaUrl: 'http://localhost:11434/v1',
				oauthToken: 'oauth-token',
			},
			{
				log,
				onProblemComplete,
				now: ((): (() => number) => {
					const values = [1000, 1010, 1025, 1050, 1062, 1100];
					let index = 0;
					return (): number => {
						const value = values.at(index) ?? 1100;
						index += 1;
						return value;
					};
				})(),
			},
		);

		expect(results).toHaveLength(2);
		expect(solveProblemMock).toHaveBeenCalledTimes(2);
		expect(solveProblemMock).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({name: 'one'}),
			expect.objectContaining({model: 'model-a', llmTimeoutSecs: 75, oauthToken: 'oauth-token'}),
		);
		expect(log).toHaveBeenCalledWith(expect.stringContaining('[ 1/2] one'));
		expect(log).toHaveBeenCalledWith(expect.stringContaining('PASS [ 1/2] one (10ms)'));
		expect(log).toHaveBeenCalledWith(expect.stringContaining('FAIL [ 2/2] two (12ms)'));
		expect(log).toHaveBeenCalledWith('Run Summary');
		expect(log).toHaveBeenCalledWith('Duration   : 50ms');
		expect(onProblemComplete).toHaveBeenCalledTimes(2);
		expect(onProblemComplete).toHaveBeenNthCalledWith(1, [expect.objectContaining({problem: 'one'})]);
		expect(onProblemComplete).toHaveBeenNthCalledWith(2, [expect.objectContaining({problem: 'one'}), expect.objectContaining({problem: 'two'})]);
	});

	test('skips already completed problems from resumed results', async () => {
		const log = vi.fn<(message: string) => void>();
		solveProblemMock.mockResolvedValueOnce({problem: 'two', category: 'logic', program: 'code-2', passed: true, duration_ms: 12});

		const resumedResult: Result = {problem: 'one', category: 'logic', program: 'code-1', passed: true, duration_ms: 10};
		const results = await executeProblems(
			[makeProblem('one'), makeProblem('two')],
			{
				model: 'model-a',
				debug: false,
				llmTimeoutSecs: 75,
				cooldownPeriodSecs: 0,
				ollamaUrl: 'http://localhost:11434/v1',
			},
			{log, initialResults: [resumedResult]},
		);

		expect(solveProblemMock).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({name: 'two'}), expect.anything());
		expect(log).toHaveBeenCalledWith(expect.stringContaining('[ 1/2] one (resumed)'));
		expect(results).toEqual([resumedResult, expect.objectContaining({problem: 'two'})]);
	});

	test('waits for cooldown between problems', async () => {
		const log = vi.fn<(message: string) => void>();
		const sleepMs = vi.fn<(durationMs: number) => Promise<void>>().mockResolvedValue();
		solveProblemMock
			.mockResolvedValueOnce({problem: 'one', category: 'logic', program: 'code-1', passed: true, duration_ms: 10})
			.mockResolvedValueOnce({problem: 'two', category: 'logic', program: 'code-2', passed: true, duration_ms: 12});

		await executeProblems(
			[makeProblem('one'), makeProblem('two')],
			{
				model: 'model-a',
				debug: false,
				llmTimeoutSecs: 75,
				cooldownPeriodSecs: 3,
				ollamaUrl: 'http://localhost:11434/v1',
			},
			{
				log,
				sleepMs,
			},
		);

		expect(sleepMs).toHaveBeenCalledExactlyOnceWith(3000);
		expect(log).toHaveBeenCalledWith('Cooldown 3s');
	});
});
