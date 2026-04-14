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
		solveProblemMock
			.mockResolvedValueOnce({problem: 'one', category: 'logic', program: 'code-1', passed: true, duration_ms: 10})
			.mockResolvedValueOnce({problem: 'two', category: 'logic', program: 'code-2', passed: false, error: 'boom', duration_ms: 12});

		const results = await executeProblems([makeProblem('one'), makeProblem('two')], {
			model: 'model-a',
			debug: true,
			llmTimeoutSecs: 75,
			cooldownPeriodSecs: 0,
			ollamaUrl: 'http://localhost:11434/v1',
			oauthToken: 'oauth-token',
		});

		expect(results).toHaveLength(2);
		expect(solveProblemMock).toHaveBeenCalledTimes(2);
		expect(solveProblemMock).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({name: 'one'}),
			expect.objectContaining({model: 'model-a', llmTimeoutSecs: 75, oauthToken: 'oauth-token'}),
		);
	});
});
