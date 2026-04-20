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
import {inferFailureKindFromErrorText, isConnectivityErrorText} from './failure-kind.ts';
import {solveProblem} from './solveProblem.ts';
import {type Problem, type Result} from './types.ts';
import {DEFAULT_MAX_COOLDOWN_MS, DEFAULT_MIN_COOLDOWN_MS, DEFAULT_COOLDOWN_RATIO} from './config.ts';

export type ExecuteRunOptions = {
	model: string;
	provider?: string;
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

const classifyFailureKind = (result: Pick<Result, 'failure_kind' | 'error'>): string => result.failure_kind ?? inferFailureKindFromErrorText(result.error);

const summarizeErrorForDisplay = (error: string | undefined): string | undefined => {
	if (typeof error !== 'string') {
		return undefined;
	}

	const normalized = error.replaceAll(/\s+/g, ' ').trim();
	if (normalized.length === 0) {
		return undefined;
	}

	if (/^\d{3}\s*<html/i.test(normalized) || normalized.includes('challenge-platform')) {
		const statusMatch = /^(\d{3})\b/.exec(normalized);
		const statusCode = statusMatch === null ? 'HTTP error' : statusMatch[1];
		return `${statusCode} provider challenge page (auth/session rejected)`;
	}

	return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized;
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
	const pendingProblems = problems.filter((problem) => !completedProblemResults.has(problem.name));
	const observedProblemDurationsMs = initialResults
		.map((result) => result.llm_metrics.llm_duration_ms)
		.filter((durationMs) => Number.isFinite(durationMs) && durationMs >= 0);

	for (const [index, problem] of pendingProblems.entries()) {
		const problemDisplayName = formatProblemDisplayName(problem.category, problem.name);

		if (!showLiveTimer) {
			log(formatProblemStartLine(index, pendingProblems.length, problemDisplayName));
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
			const remainingAfterCurrent = pendingProblems.length - (index + 1);
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
				...(typeof options.provider === 'string' ? {provider: options.provider} : {}),
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

		const failureKind = classifyFailureKind(result);
		const errorSummary = summarizeErrorForDisplay(result.error);
		const detail = result.passed ? formatLlmMetricsSummary(result.llm_metrics) : `[${failureKind}]`;
		log(
			formatCompletedProblemLine({
				index,
				total: pendingProblems.length,
				name: problemDisplayName,
				passed: result.passed,
				durationMs: result.llm_metrics.llm_duration_ms,
				preferUnicode,
				detail,
			}),
		);
		if (!result.passed && typeof errorSummary === 'string') {
			log(`Error: ${errorSummary}`);
		}
		results.push(result);
		completedProblemResults.set(problem.name, result);
		observedProblemDurationsMs.push(result.llm_metrics.llm_duration_ms);
		if (typeof onProblemComplete === 'function') {
			// oxlint-disable-next-line no-await-in-loop
			await onProblemComplete([...results]);
		}

		if (!result.passed && isConnectivityErrorText(result.error)) {
			throw new TypeError(`Model connection failed while solving ${problemDisplayName}: ${errorSummary ?? 'provider authentication or connectivity error'}`);
		}

		const hasRemainingUnfinishedProblem = index < pendingProblems.length - 1;
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
