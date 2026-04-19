import {setTimeout as sleep} from 'node:timers/promises';
import {STYLES, styleText} from './utils.ts';
import {
	formatCompletedProblemLine,
	formatCooldownLiveLine,
	formatProblemDisplayName,
	formatCooldownStaticLine,
	formatProblemStartLine,
	formatRunFooterLines,
	formatRunningLiveLine,
} from './run-progress.ts';
import {type RunPhase} from './run-phase.ts';
import {type RunTransferStats} from './run-transfer.ts';
import {clearLiveLine, replaceLiveLine, supportsLiveLine, writeLiveLine} from './core/tty-live-line.ts';
import {solveProblem} from './solveProblem.ts';
import {type Problem, type Result} from './types.ts';

export type ExecuteRunOptions = {
	model: string;
	debug: boolean;
	storeThinking?: boolean;
	llmTimeoutSecs: number;
	noCooldown: boolean;
	ollamaUrl: string;
	apiKey?: string;
	oauthToken?: string;
};

const MAX_COOLDOWN_MS = 60_000;
const MIN_COOLDOWN_MS = 10_000;
const COOLDOWN_RATIO = 0.5;

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

	for (const [index, problem] of problems.entries()) {
		const problemDisplayName = formatProblemDisplayName(problem.category, problem.name);
		const completedResult = completedProblemResults.get(problem.name);
		if (completedResult) {
			log(
				`${formatCompletedProblemLine({
					index,
					total: problems.length,
					name: problemDisplayName,
					passed: completedResult.passed,
					durationMs: completedResult.duration_ms,
					preferUnicode,
				})} ${styleText('(resumed)', STYLES.dim)}`,
			);
			continue;
		}

		if (!showLiveTimer) {
			log(formatProblemStartLine(index, problems.length, problemDisplayName));
		}

		const startedAt = now();
		let currentPhase: RunPhase = 'thinking';
		let currentTransferStats: RunTransferStats = {promptChars: 0, responseChars: 0};
		let timerId: ReturnType<typeof setInterval> | undefined;
		if (showLiveTimer) {
			writeLiveLine(stream, formatRunningLiveLine(problemDisplayName, 0, currentPhase, currentTransferStats));
			timerId = setIntervalFn(() => {
				replaceLiveLine(stream, formatRunningLiveLine(problemDisplayName, now() - startedAt, currentPhase, currentTransferStats));
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
				onPhaseChange: (phase) => {
					currentPhase = phase;
					if (showLiveTimer) {
						replaceLiveLine(stream, formatRunningLiveLine(problemDisplayName, now() - startedAt, currentPhase, currentTransferStats));
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

		log(
			formatCompletedProblemLine({
				index,
				total: problems.length,
				name: problemDisplayName,
				passed: result.passed,
				durationMs: result.duration_ms,
				preferUnicode,
			}),
		);
		results.push(result);
		completedProblemResults.set(problem.name, result);
		if (typeof onProblemComplete === 'function') {
			// oxlint-disable-next-line no-await-in-loop
			await onProblemComplete([...results]);
		}

		const hasRemainingUnfinishedProblem = problems.slice(index + 1).some((remainingProblem) => !completedProblemResults.has(remainingProblem.name));
		const dynamicCooldownDurationMs = Math.min(MAX_COOLDOWN_MS, Math.floor(result.duration_ms * COOLDOWN_RATIO));
		const cooldownDurationMs = options.noCooldown || dynamicCooldownDurationMs <= 0 ? 0 : Math.max(MIN_COOLDOWN_MS, dynamicCooldownDurationMs);
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
