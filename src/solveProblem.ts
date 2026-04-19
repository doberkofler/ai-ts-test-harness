import {generate, type GenerateOptions} from './generate.ts';
import {inferFailureKindFromErrorText} from './failure-kind.ts';
import {type RunPhase} from './run-phase.ts';
import {calculateAverageTokensPerSecond, estimateTokensFromChars, type RunTransferStats} from './run-transfer.ts';
import {runProblem} from './runner.ts';
import {type Problem, type Result} from './types.ts';

export type SolveProblemOptions = GenerateOptions & {
	onPhaseChange?: (phase: RunPhase) => void;
	storeThinking?: boolean;
	vitestTimeoutSecs?: number;
};

export const solveProblem = async (problem: Problem, options: SolveProblemOptions): Promise<Result> => {
	const llmStartedAtMs = Date.now();
	let thinking = '';
	let llmFinishedAtMs: number | undefined;
	let transferStats: RunTransferStats = {promptChars: 0, responseChars: 0};
	const shouldStoreThinking = options.storeThinking ?? true;
	const onThinkingDelta: ((thinkingDelta: string) => void) | undefined = shouldStoreThinking
		? (thinkingDelta: string): void => {
				thinking += thinkingDelta;
			}
		: undefined;
	const buildLlmMetrics = (): Result['llm_metrics'] => {
		const llmDurationMs = Math.max(0, (llmFinishedAtMs ?? Date.now()) - llmStartedAtMs);
		const tokensSent = estimateTokensFromChars(transferStats.promptChars);
		const tokensReceived = estimateTokensFromChars(transferStats.responseChars);

		return {
			llm_duration_ms: llmDurationMs,
			tokens_sent: tokensSent,
			tokens_received: tokensReceived,
			average_tokens_per_second: calculateAverageTokensPerSecond(tokensReceived, llmDurationMs),
		};
	};

	try {
		if (typeof options.onPhaseChange === 'function') {
			options.onPhaseChange('thinking');
		}
		// oxlint-disable-next-line no-await-in-loop
		const code = await generate(problem, {
			...options,
			...(typeof onThinkingDelta === 'function' ? {onThinkingDelta} : {}),
			onTransferProgress: (stats) => {
				transferStats = stats;
				if (typeof options.onTransferProgress === 'function') {
					options.onTransferProgress(stats);
				}
			},
		});
		llmFinishedAtMs = Date.now();

		if (typeof options.onPhaseChange === 'function') {
			options.onPhaseChange('testing');
		}
		// oxlint-disable-next-line no-await-in-loop
		const result = await runProblem(problem, code, {
			debug: options.debug ?? false,
			...(typeof options.vitestTimeoutSecs === 'number' ? {vitestTimeoutMs: options.vitestTimeoutSecs * 1000} : {}),
		});

		return {
			...result,
			...(shouldStoreThinking && thinking.length > 0 ? {thinking} : {}),
			llm_metrics: buildLlmMetrics(),
		};
	} catch (error) {
		const errorText = error instanceof Error ? error.message : String(error);
		const failureKind = typeof llmFinishedAtMs === 'number' ? 'vitest' : inferFailureKindFromErrorText(errorText);

		return {
			problem: problem.name,
			category: problem.category,
			...(shouldStoreThinking && thinking.length > 0 ? {thinking} : {}),
			passed: false,
			error: errorText,
			failure_kind: failureKind,
			llm_metrics: buildLlmMetrics(),
		};
	}
};
