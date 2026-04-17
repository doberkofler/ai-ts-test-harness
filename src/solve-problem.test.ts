import {describe, expect, test, vi, beforeEach} from 'vitest';
import {type GenerateOptions} from './generate.ts';
import {type Problem, type Result} from './types.ts';

const generateMock = vi.fn<(problem: Problem, options: GenerateOptions) => Promise<string>>();
const runProblemMock = vi.fn<(problem: Problem, code: string, options?: {debug?: boolean}) => Promise<Result>>();

vi.mock(import('./generate.ts'), () => ({
	generate: generateMock,
}));

vi.mock(import('./runner.ts'), () => ({
	runProblem: runProblemMock,
}));

const {solveProblem} = await import('./solveProblem.ts');

const problem: Problem = {
	name: 'sum',
	category: 'arithmetic',
	description: ['Add two numbers'],
	signature: 'function sum(a: number, b: number): number',
	tests: ({assert}): void => {
		assert.strictEqual(true, true);
	},
};

describe('solveProblem', () => {
	beforeEach(() => {
		generateMock.mockReset();
		runProblemMock.mockReset();
	});

	test('generates code, runs tests, and returns execution result', async () => {
		generateMock.mockResolvedValue('function sum(a: number, b: number): number { return a + b; }');
		runProblemMock.mockResolvedValue({
			problem: 'sum',
			category: 'arithmetic',
			program: 'generated program',
			passed: true,
			duration_ms: 1,
		});

		const result = await solveProblem(problem, {model: 'test-model'});

		expect(generateMock).toHaveBeenCalledExactlyOnceWith(problem, {model: 'test-model'});
		expect(runProblemMock).toHaveBeenCalledExactlyOnceWith(problem, 'function sum(a: number, b: number): number { return a + b; }', {debug: false});
		expect(result.passed).toBe(true);
		expect(result.program).toBe('generated program');
		expect(result.duration_ms).toBeGreaterThanOrEqual(0);
	});

	test('returns failed result when generation throws', async () => {
		generateMock.mockRejectedValue(new Error('llm unavailable'));

		const result = await solveProblem(problem, {model: 'test-model'});

		expect(result).toMatchObject({
			problem: 'sum',
			category: 'arithmetic',
			program: '',
			passed: false,
			error: 'llm unavailable',
		});
		expect(runProblemMock).not.toHaveBeenCalled();
	});

	test('returns failed result when runner throws non-error value', async () => {
		generateMock.mockResolvedValue('function sum(a: number, b: number): number { return a + b; }');
		runProblemMock.mockRejectedValue('runner crashed');

		const result = await solveProblem(problem, {model: 'test-model', debug: true});

		expect(result).toMatchObject({
			problem: 'sum',
			category: 'arithmetic',
			program: '',
			passed: false,
			error: 'runner crashed',
		});
	});

	test('emits thinking, running, and testing phases in order', async () => {
		const phases: string[] = [];
		generateMock.mockImplementation(async (_problem, options) => {
			await Promise.resolve();
			if (typeof options.onPhaseChange === 'function') {
				options.onPhaseChange('running');
			}
			return 'function sum(a: number, b: number): number { return a + b; }';
		});
		runProblemMock.mockResolvedValue({
			problem: 'sum',
			category: 'arithmetic',
			program: 'generated program',
			passed: true,
			duration_ms: 1,
		});

		await solveProblem(problem, {
			model: 'test-model',
			onPhaseChange: (phase) => {
				phases.push(phase);
			},
		});

		expect(phases).toEqual(['thinking', 'running', 'testing']);
	});
});
