import {beforeEach, describe, expect, test, vi} from 'vitest';
import {type Problem, type Result} from './types.ts';

const llmMetrics = (llmDurationMs: number, tokensSent = 0, tokensReceived = 0): Result['llm_metrics'] => ({
	llm_duration_ms: llmDurationMs,
	tokens_sent: tokensSent,
	tokens_received: tokensReceived,
	average_tokens_per_second: llmDurationMs > 0 ? Math.round((tokensReceived * 1000) / llmDurationMs) : 0,
});

const solveProblemMock = vi.fn<(problem: Problem, options: Record<string, unknown>) => Promise<Result>>();
const supportsLiveLineMock = vi.fn<(stream: NodeJS.WriteStream) => boolean>(() => false);
const writeLiveLineMock = vi.fn<(stream: NodeJS.WriteStream, text: string) => void>();
const replaceLiveLineMock = vi.fn<(stream: NodeJS.WriteStream, text: string) => void>();
const clearLiveLineMock = vi.fn<(stream: NodeJS.WriteStream) => void>();

vi.mock(import('./solveProblem.ts'), () => ({
	solveProblem: solveProblemMock,
}));

vi.mock(import('./core/tty-live-line.ts'), () => ({
	supportsLiveLine: supportsLiveLineMock,
	writeLiveLine: writeLiveLineMock,
	replaceLiveLine: replaceLiveLineMock,
	clearLiveLine: clearLiveLineMock,
}));

const {executeProblems} = await import('./run-execution.ts');

const makeProblem = (name: string, category = 'logic'): Problem => ({
	name,
	category,
	description: 'test problem',
	files: [],
	tests: [],
});

describe('executeProblems', () => {
	beforeEach(() => {
		solveProblemMock.mockReset();
		supportsLiveLineMock.mockReset();
		supportsLiveLineMock.mockReturnValue(false);
		writeLiveLineMock.mockReset();
		replaceLiveLineMock.mockReset();
		clearLiveLineMock.mockReset();
	});

	test('executes each selected problem and forwards runtime options', async () => {
		const log = vi.fn<(message: string) => void>();
		const onProblemComplete = vi.fn<(results: Result[]) => void>();
		solveProblemMock
			.mockResolvedValueOnce({problem: 'one', category: 'logic', program: 'code-1', passed: true, llm_metrics: llmMetrics(10)})
			.mockResolvedValueOnce({problem: 'two', category: 'logic', program: 'code-2', passed: false, error: 'boom', llm_metrics: llmMetrics(12)});

		const results = await executeProblems(
			[makeProblem('one'), makeProblem('two')],
			{
				model: 'model-a',
				debug: true,
				storeThinking: false,
				llmTimeoutSecs: 75,
				vitestTimeoutSecs: 60,
				noCooldown: true,
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
			expect.objectContaining({model: 'model-a', storeThinking: false, llmTimeoutSecs: 75, oauthToken: 'oauth-token'}),
		);
		expect(log).toHaveBeenCalledWith(expect.stringContaining('[ 1/2] logic/one'));
		expect(log).toHaveBeenCalledWith(expect.stringContaining('PASS [ 1/2] logic/one (10ms)'));
		expect(log).toHaveBeenCalledWith(expect.stringContaining('FAIL [ 2/2] logic/two (12ms)'));
		expect(log).toHaveBeenCalledWith('Run Summary');
		expect(log).toHaveBeenCalledWith(expect.stringMatching(/^Duration\s+:\s+\d+ms$/));
		expect(onProblemComplete).toHaveBeenCalledTimes(2);
		expect(onProblemComplete).toHaveBeenNthCalledWith(1, [expect.objectContaining({problem: 'one'})]);
		expect(onProblemComplete).toHaveBeenNthCalledWith(2, [expect.objectContaining({problem: 'one'}), expect.objectContaining({problem: 'two'})]);
	});

	test('updates transfer stats on timer ticks only', async () => {
		supportsLiveLineMock.mockReturnValue(true);
		let timerCallback: (() => void) | undefined;
		solveProblemMock.mockImplementationOnce(async (_problem, options) => {
			const {onTransferProgress} = options as {
				onTransferProgress?: (stats: {promptChars: number; responseChars: number}) => void;
			};
			if (typeof onTransferProgress !== 'function') {
				throw new TypeError('expected onTransferProgress callback');
			}

			onTransferProgress({promptChars: 1200, responseChars: 25});
			if (typeof timerCallback === 'function') {
				timerCallback();
			}
			onTransferProgress({promptChars: 1200, responseChars: 40});
			await Promise.resolve();

			return {
				problem: 'one',
				category: 'logic',
				program: 'code-1',
				passed: true,
				llm_metrics: llmMetrics(10, 300, 10),
			};
		});

		await executeProblems(
			[makeProblem('one')],
			{
				model: 'model-a',
				debug: false,
				llmTimeoutSecs: 75,
				vitestTimeoutSecs: 60,
				noCooldown: false,
				ollamaUrl: 'http://localhost:11434/v1',
			},
			{
				stream: {isTTY: true} as NodeJS.WriteStream,
				setIntervalFn: (tick) => {
					timerCallback = tick;
					return 1 as unknown as ReturnType<typeof setInterval>;
				},
				clearIntervalFn: () => {
					// no-op
				},
				now: () => 1000,
			},
		);

		expect(writeLiveLineMock).toHaveBeenCalledExactlyOnceWith(expect.anything(), expect.stringContaining('Thinking logic/one 0s'));
		expect(replaceLiveLineMock).toHaveBeenCalledExactlyOnceWith(expect.anything(), expect.stringContaining('↑300t ↓6t ~0 tok/s'));
	});

	test('skips already completed problems from resumed results', async () => {
		const log = vi.fn<(message: string) => void>();
		solveProblemMock.mockResolvedValueOnce({problem: 'two', category: 'logic', program: 'code-2', passed: true, llm_metrics: llmMetrics(12)});

		const resumedResult: Result = {problem: 'one', category: 'logic', program: 'code-1', passed: true, llm_metrics: llmMetrics(10)};
		const results = await executeProblems(
			[makeProblem('one'), makeProblem('two')],
			{
				model: 'model-a',
				debug: false,
				llmTimeoutSecs: 75,
				vitestTimeoutSecs: 60,
				noCooldown: false,
				ollamaUrl: 'http://localhost:11434/v1',
			},
			{log, initialResults: [resumedResult]},
		);

		expect(solveProblemMock).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({name: 'two'}), expect.anything());
		expect(log).toHaveBeenCalledWith(expect.stringContaining('PASS [ 1/2] logic/one (10ms)'));
		expect(log).toHaveBeenCalledWith(expect.stringContaining('↑0t ↓0t ~0 tok/s'));
		expect(log).not.toHaveBeenCalledWith(expect.stringContaining('(resumed)'));
		expect(results).toEqual([resumedResult, expect.objectContaining({problem: 'two'})]);
	});

	test('adds timeout failure kind tag to failed problems', async () => {
		const log = vi.fn<(message: string) => void>();
		solveProblemMock.mockResolvedValueOnce({
			problem: 'one',
			category: 'logic',
			passed: false,
			error: 'Request timed out.',
			llm_metrics: llmMetrics(42),
		});

		await executeProblems(
			[makeProblem('one')],
			{
				model: 'model-a',
				debug: true,
				llmTimeoutSecs: 75,
				vitestTimeoutSecs: 60,
				noCooldown: true,
				ollamaUrl: 'http://localhost:11434/v1',
			},
			{log},
		);

		expect(log).toHaveBeenCalledWith(expect.stringContaining('[timeout]'));
	});

	test('uses structured assertion failure kind tag when provided', async () => {
		const log = vi.fn<(message: string) => void>();
		solveProblemMock.mockResolvedValueOnce({
			problem: 'one',
			category: 'logic',
			passed: false,
			error: 'Expected values to be strictly equal',
			failure_kind: 'assertion',
			llm_metrics: llmMetrics(42),
		});

		await executeProblems(
			[makeProblem('one')],
			{
				model: 'model-a',
				debug: true,
				llmTimeoutSecs: 75,
				vitestTimeoutSecs: 60,
				noCooldown: true,
				ollamaUrl: 'http://localhost:11434/v1',
			},
			{log},
		);

		expect(log).toHaveBeenCalledWith(expect.stringContaining('[assertion]'));
	});

	test('shows runtime failure kind tag for resumed failures', async () => {
		const log = vi.fn<(message: string) => void>();
		const resumedResult: Result = {
			problem: 'one',
			category: 'logic',
			passed: false,
			error: 'Assignment to constant variable.',
			failure_kind: 'runtime',
			llm_metrics: llmMetrics(10),
		};

		await executeProblems(
			[makeProblem('one')],
			{
				model: 'model-a',
				debug: true,
				llmTimeoutSecs: 75,
				vitestTimeoutSecs: 60,
				noCooldown: true,
				ollamaUrl: 'http://localhost:11434/v1',
			},
			{log, initialResults: [resumedResult]},
		);

		expect(log).toHaveBeenCalledWith(expect.stringContaining('[runtime]'));
	});

	test('shows ETA in live running lines once prior durations exist', async () => {
		supportsLiveLineMock.mockReturnValue(true);
		solveProblemMock.mockResolvedValueOnce({
			problem: 'two',
			category: 'logic',
			program: 'code-2',
			passed: true,
			llm_metrics: llmMetrics(12),
		});

		await executeProblems(
			[makeProblem('one'), makeProblem('two')],
			{
				model: 'model-a',
				debug: false,
				llmTimeoutSecs: 75,
				vitestTimeoutSecs: 60,
				noCooldown: false,
				ollamaUrl: 'http://localhost:11434/v1',
			},
			{
				stream: {isTTY: true} as NodeJS.WriteStream,
				initialResults: [{problem: 'one', category: 'logic', program: 'code-1', passed: true, llm_metrics: llmMetrics(10_000)}],
				setIntervalFn: () => 1 as unknown as ReturnType<typeof setInterval>,
				clearIntervalFn: () => {
					// no-op
				},
				now: () => 1000,
			},
		);

		expect(writeLiveLineMock).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('ETA'));
	});

	test('applies minimum cooldown duration between problems', async () => {
		const log = vi.fn<(message: string) => void>();
		const sleepMs = vi.fn<(durationMs: number) => Promise<void>>().mockResolvedValue();
		solveProblemMock
			.mockResolvedValueOnce({problem: 'one', category: 'logic', program: 'code-1', passed: true, llm_metrics: llmMetrics(10_000)})
			.mockResolvedValueOnce({problem: 'two', category: 'logic', program: 'code-2', passed: true, llm_metrics: llmMetrics(12)});

		await executeProblems(
			[makeProblem('one'), makeProblem('two')],
			{
				model: 'model-a',
				debug: false,
				llmTimeoutSecs: 75,
				vitestTimeoutSecs: 60,
				noCooldown: false,
				ollamaUrl: 'http://localhost:11434/v1',
			},
			{
				log,
				sleepMs,
			},
		);

		expect(sleepMs).toHaveBeenCalledExactlyOnceWith(10_000);
		expect(log).toHaveBeenCalledWith('Cooldown 10s');
	});

	test('caps dynamic cooldown at one minute', async () => {
		const sleepMs = vi.fn<(durationMs: number) => Promise<void>>().mockResolvedValue();
		solveProblemMock
			.mockResolvedValueOnce({problem: 'one', category: 'logic', program: 'code-1', passed: true, llm_metrics: llmMetrics(200_000)})
			.mockResolvedValueOnce({problem: 'two', category: 'logic', program: 'code-2', passed: true, llm_metrics: llmMetrics(10)});

		await executeProblems(
			[makeProblem('one'), makeProblem('two')],
			{
				model: 'model-a',
				debug: false,
				llmTimeoutSecs: 75,
				vitestTimeoutSecs: 60,
				noCooldown: false,
				ollamaUrl: 'http://localhost:11434/v1',
			},
			{sleepMs},
		);

		expect(sleepMs).toHaveBeenCalledExactlyOnceWith(60_000);
	});
});
