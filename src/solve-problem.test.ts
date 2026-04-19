import {describe, expect, test, vi, beforeEach} from 'vitest';
import {type GenerateOptions} from './generate.ts';
import {type ChangedFilesArtifact, type Problem, type ProblemExecutionResult} from './types.ts';

const generateMock = vi.fn<(problem: Problem, options: GenerateOptions) => Promise<ChangedFilesArtifact>>();
const runProblemMock =
	vi.fn<(problem: Problem, artifact: ChangedFilesArtifact, options?: {debug?: boolean; vitestTimeoutMs?: number}) => Promise<ProblemExecutionResult>>();

const generatedArtifact: ChangedFilesArtifact = {
	kind: 'changed-files-v1',
	files: [{path: 'solution.ts', content: 'function sum(a: number, b: number): number { return a + b; }'}],
};

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
	description: 'Add two numbers',
	files: [{path: 'src/sum.ts', content: 'export const sum = () => 0;\n'}],
	tests: [{path: 'tests/sum.test.ts', content: ''}],
};

describe('solveProblem', () => {
	beforeEach(() => {
		generateMock.mockReset();
		runProblemMock.mockReset();
	});

	test('generates code, runs tests, and returns execution result', async () => {
		generateMock.mockResolvedValue(generatedArtifact);
		runProblemMock.mockResolvedValue({
			problem: 'sum',
			category: 'arithmetic',
			artifact: {kind: 'changed-files-v1', files: [{path: 'src/sum.ts', content: 'updated'}]},
			passed: true,
		});

		const result = await solveProblem(problem, {model: 'test-model'});

		expect(generateMock).toHaveBeenCalledExactlyOnceWith(problem, expect.objectContaining({model: 'test-model', onThinkingDelta: expect.any(Function)}));
		expect(runProblemMock).toHaveBeenCalledExactlyOnceWith(problem, generatedArtifact, {debug: false});
		expect(result.passed).toBe(true);
		expect(result.artifact).toEqual({kind: 'changed-files-v1', files: [{path: 'src/sum.ts', content: 'updated'}]});
		expect(result.llm_metrics.llm_duration_ms).toBeGreaterThanOrEqual(0);
	});

	test('stores model thinking in result by default', async () => {
		generateMock.mockImplementation(async (_problem, options) => {
			if (typeof options.onThinkingDelta !== 'function') {
				throw new TypeError('missing onThinkingDelta callback');
			}
			options.onThinkingDelta('plan ');
			options.onThinkingDelta('steps');
			await Promise.resolve();
			return generatedArtifact;
		});
		runProblemMock.mockResolvedValue({
			problem: 'sum',
			category: 'arithmetic',
			artifact: {kind: 'changed-files-v1', files: []},
			passed: true,
		});

		const result = await solveProblem(problem, {model: 'test-model'});

		expect(result.thinking).toBe('plan steps');
	});

	test('can disable thinking storage for results', async () => {
		generateMock.mockImplementation(async (_problem, options) => {
			if (typeof options.onThinkingDelta === 'function') {
				options.onThinkingDelta('should not be included');
			}
			await Promise.resolve();
			return generatedArtifact;
		});
		runProblemMock.mockResolvedValue({
			problem: 'sum',
			category: 'arithmetic',
			artifact: {kind: 'changed-files-v1', files: []},
			passed: true,
		});

		const result = await solveProblem(problem, {model: 'test-model', storeThinking: false});

		expect(result).not.toHaveProperty('thinking');
	});

	test('returns failed result when generation throws', async () => {
		generateMock.mockRejectedValue(new Error('llm unavailable'));

		const result = await solveProblem(problem, {model: 'test-model'});

		expect(result).toMatchObject({
			problem: 'sum',
			category: 'arithmetic',
			passed: false,
			error: 'llm unavailable',
		});
		expect(runProblemMock).not.toHaveBeenCalled();
	});

	test('returns failed result when runner throws non-error value', async () => {
		generateMock.mockResolvedValue(generatedArtifact);
		runProblemMock.mockRejectedValue('runner crashed');

		const result = await solveProblem(problem, {model: 'test-model', debug: true});

		expect(result).toMatchObject({
			problem: 'sum',
			category: 'arithmetic',
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
			return generatedArtifact;
		});
		runProblemMock.mockResolvedValue({
			problem: 'sum',
			category: 'arithmetic',
			artifact: {kind: 'changed-files-v1', files: []},
			passed: true,
		});

		await solveProblem(problem, {
			model: 'test-model',
			onPhaseChange: (phase) => {
				phases.push(phase);
			},
		});

		expect(phases).toEqual(['thinking', 'running', 'testing']);
	});

	test('records llm duration independently from test execution time', async () => {
		generateMock.mockResolvedValue(generatedArtifact);
		runProblemMock.mockImplementation(async () => {
			await Promise.resolve();
			return {
				problem: 'sum',
				category: 'arithmetic',
				artifact: {kind: 'changed-files-v1', files: []},
				passed: true,
			};
		});

		const nowSpy = vi.spyOn(Date, 'now');
		nowSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1025);

		try {
			const result = await solveProblem(problem, {model: 'test-model'});
			expect(result.llm_metrics.llm_duration_ms).toBe(25);
		} finally {
			nowSpy.mockRestore();
		}
	});
});
