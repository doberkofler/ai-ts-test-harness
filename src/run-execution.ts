import {setTimeout as sleep} from 'node:timers/promises';
import {
	formatCompletedProblemLine,
	formatCooldownLiveLine,
	formatProblemDisplayName,
	formatCooldownStaticLine,
	formatLlmMetricsSummary,
	formatProblemStartLine,
	formatRunFooterLines,
	formatRunningLiveLine,
} from './run-progress.ts';
import {type RunPhase} from './run-phase.ts';
import {type RunTransferStats} from './run-transfer.ts';
import {clearLiveLine, replaceLiveLine, supportsLiveLine, writeLiveLine} from './core/tty-live-line.ts';
import {solveProblem} from './solveProblem.ts';
import {type Problem, type Result} from './types.ts';
import {DEFAULT_MAX_COOLDOWN_MS, DEFAULT_MIN_COOLDOWN_MS, DEFAULT_COOLDOWN_RATIO} from './config.ts';

export type ExecuteRunOptions = {
	model: string;
	debug: boolean;
	storeThinking?: boolean;
	llmTimeoutSecs: number;
	vitestTimeoutSecs: number;
	noCooldown: boolean;
	ollamaUrl: string;
	apiKey?: string;
	oauthToken?: string;
};

const estimateCooldownDurationMs = (durationMs: number, noCooldown: boolean): number => {
	const dynamicCooldownDurationMs = Math.min(DEFAULT_MAX_COOLDOWN_MS, Math.floor(durationMs * DEFAULT_COOLDOWN_RATIO));
	if (noCooldown || dynamicCooldownDurationMs <= 0) {
		return 0;
	}

	return Math.max(DEFAULT_MIN_COOLDOWN_MS, dynamicCooldownDurationMs);
};

const classifyFailureKind = (error: string | undefined): 'timeout' | 'vitest' | 'other' => {
	if (typeof error !== 'string' || error.length === 0) {
		return 'other';
	}

	if (/timed?\s*out|request timed out|abort/i.test(error)) {
		return 'timeout';
	}

	if (/vitest|failed tests:|no tests were executed/i.test(error)) {
		return 'vitest';
	}

	return 'other';
};

type ExecuteProblemsDeps = {
	stream?: NodeJS.WriteStream;
	log?: (message: string) => void;
	now?: () => number;
	sleepMs?: (durationMs: number) => Promise<void>;
	setIntervalFn?: (callback: () => void, delayMs: number) => ReturnType<typeof setInterval>;
	clearIntervalFn?: (timerId: ReturnType<typeof setInterval>) => void;
	initialResults?: Result[];
	onProblemComplete?: (results: Result[]) => void | Promise<void>;
};

export const executeProblems = async (problems: Problem[], options: ExecuteRunOptions, deps: ExecuteProblemsDeps = {}): Promise<Result[]> => {
	const {initialResults = [], onProblemComplete} = deps;
	const results: Result[] = [...initialResults];
	const stream = deps.stream ?? process.stdout;
	const log = deps.log ?? console.log;
	const now = deps.now ?? Date.now;
	const sleepMs = deps.sleepMs ?? sleep;
	const setIntervalFn = deps.setIntervalFn ?? setInterval;
	const clearIntervalFn = deps.clearIntervalFn ?? clearInterval;
	const startedAtMs = now();
	const preferUnicode = stream.isTTY;
	const showLiveTimer = supportsLiveLine(stream) && !options.debug;
	const completedProblemResults = new Map(initialResults.map((result) => [result.problem, result]));
	const observedProblemDurationsMs = initialResults
		.map((result) => result.llm_metrics.llm_duration_ms)
		.filter((durationMs) => Number.isFinite(durationMs) && durationMs >= 0);

	for (const [index, problem] of problems.entries()) {
		const problemDisplayName = formatProblemDisplayName(problem.category, problem.name);
		const completedResult = completedProblemResults.get(problem.name);
		if (completedResult) {
			log(
				formatCompletedProblemLine({
					index,
					total: problems.length,
					name: problemDisplayName,
					passed: completedResult.passed,
					durationMs: completedResult.llm_metrics.llm_duration_ms,
					preferUnicode,
					detail: completedResult.passed ? formatLlmMetricsSummary(completedResult.llm_metrics) : `[${classifyFailureKind(completedResult.error)}]`,
				}),
			);
			continue;
		}

		if (!showLiveTimer) {
			log(formatProblemStartLine(index, problems.length, problemDisplayName));
		}

		const startedAt = now();
		let currentPhase: RunPhase = 'thinking';
		let currentTransferStats: RunTransferStats = {promptChars: 0, responseChars: 0};
		const computeEtaMs = (): number | undefined => {
			if (observedProblemDurationsMs.length === 0) {
				return undefined;
			}

			const completedSum = observedProblemDurationsMs.reduce((sum, durationMs) => sum + durationMs, 0);
			const averageProblemDurationMs = completedSum / observedProblemDurationsMs.length;
			if (!Number.isFinite(averageProblemDurationMs) || averageProblemDurationMs <= 0) {
				return undefined;
			}

			const elapsedMs = now() - startedAt;
			const remainingAfterCurrent = problems.slice(index + 1).filter((remainingProblem) => !completedProblemResults.has(remainingProblem.name)).length;
			const estimatedCurrentRemainingMs = Math.max(0, averageProblemDurationMs - elapsedMs);
			const estimatedFutureProblemsMs = averageProblemDurationMs * remainingAfterCurrent;
			const estimatedCooldownMs = estimateCooldownDurationMs(averageProblemDurationMs, options.noCooldown) * remainingAfterCurrent;
			return Math.max(0, Math.round(estimatedCurrentRemainingMs + estimatedFutureProblemsMs + estimatedCooldownMs));
		};
		let timerId: ReturnType<typeof setInterval> | undefined;
		if (showLiveTimer) {
			writeLiveLine(stream, formatRunningLiveLine(problemDisplayName, 0, currentPhase, currentTransferStats, computeEtaMs()));
			timerId = setIntervalFn(() => {
				replaceLiveLine(stream, formatRunningLiveLine(problemDisplayName, now() - startedAt, currentPhase, currentTransferStats, computeEtaMs()));
			}, 1000);
		}

		let result: Result;
		try {
			// oxlint-disable-next-line no-await-in-loop
			result = await solveProblem(problem, {
				model: options.model,
				ollamaUrl: options.ollamaUrl,
				...(typeof options.apiKey === 'string' ? {apiKey: options.apiKey} : {}),
				...(typeof options.oauthToken === 'string' ? {oauthToken: options.oauthToken} : {}),
				debug: options.debug,
				storeThinking: options.storeThinking ?? true,
				llmTimeoutSecs: options.llmTimeoutSecs,
				vitestTimeoutSecs: options.vitestTimeoutSecs,
				onPhaseChange: (phase) => {
					currentPhase = phase;
					if (showLiveTimer) {
						replaceLiveLine(stream, formatRunningLiveLine(problemDisplayName, now() - startedAt, currentPhase, currentTransferStats, computeEtaMs()));
					}
				},
				onTransferProgress: (stats) => {
					currentTransferStats = stats;
				},
			});
		} finally {
			if (typeof timerId !== 'undefined') {
				clearIntervalFn(timerId);
				clearLiveLine(stream);
			}
		}

		const detail = result.passed ? formatLlmMetricsSummary(result.llm_metrics) : `[${classifyFailureKind(result.error)}]`;
		log(
			formatCompletedProblemLine({
				index,
				total: problems.length,
				name: problemDisplayName,
				passed: result.passed,
				durationMs: result.llm_metrics.llm_duration_ms,
				preferUnicode,
				detail,
			}),
		);
		results.push(result);
		completedProblemResults.set(problem.name, result);
		observedProblemDurationsMs.push(result.llm_metrics.llm_duration_ms);
		if (typeof onProblemComplete === 'function') {
			// oxlint-disable-next-line no-await-in-loop
			await onProblemComplete([...results]);
		}

		const hasRemainingUnfinishedProblem = problems.slice(index + 1).some((remainingProblem) => !completedProblemResults.has(remainingProblem.name));
		const cooldownDurationMs = estimateCooldownDurationMs(result.llm_metrics.llm_duration_ms, options.noCooldown);
		if (cooldownDurationMs > 0 && hasRemainingUnfinishedProblem) {
			if (showLiveTimer) {
				const cooldownStartedAt = now();
				writeLiveLine(stream, formatCooldownLiveLine(cooldownDurationMs));
				const cooldownTimerId = setIntervalFn(() => {
					const elapsed = now() - cooldownStartedAt;
					const remaining = Math.max(0, cooldownDurationMs - elapsed);
					replaceLiveLine(stream, formatCooldownLiveLine(remaining));
				}, 1000);

				try {
					// oxlint-disable-next-line no-await-in-loop
					await sleepMs(cooldownDurationMs);
				} finally {
					clearIntervalFn(cooldownTimerId);
					clearLiveLine(stream);
				}
			} else {
				log(formatCooldownStaticLine(cooldownDurationMs));
				// oxlint-disable-next-line no-await-in-loop
				await sleepMs(cooldownDurationMs);
			}
		}
	}

	log('');
	for (const footerLine of formatRunFooterLines(results, startedAtMs, now())) {
		log(footerLine);
	}

	return results;
};
