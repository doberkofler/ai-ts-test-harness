import {setTimeout as sleep} from 'node:timers/promises';
import {
	formatCompletedProblemLine,
	formatCooldownLiveLine,
	formatCooldownStaticLine,
	formatProblemStartLine,
	formatRunFooterLines,
	formatRunningLiveLine,
} from './run-progress.ts';
import {clearLiveLine, replaceLiveLine, supportsLiveLine, writeLiveLine} from './core/tty-live-line.ts';
import {closeVitestRunner} from './runner.ts';
import {solveProblem} from './solveProblem.ts';
import {type Problem, type Result} from './types.ts';

export type ExecuteRunOptions = {
	model: string;
	debug: boolean;
	llmTimeoutSecs: number;
	cooldownPeriodSecs: number;
	ollamaUrl: string;
	apiKey?: string;
	oauthToken?: string;
};

type ExecuteProblemsDeps = {
	stream?: NodeJS.WriteStream;
	log?: (message: string) => void;
	now?: () => number;
	sleepMs?: (durationMs: number) => Promise<void>;
	setIntervalFn?: (callback: () => void, delayMs: number) => ReturnType<typeof setInterval>;
	clearIntervalFn?: (timerId: ReturnType<typeof setInterval>) => void;
};

export const executeProblems = async (problems: Problem[], options: ExecuteRunOptions, deps: ExecuteProblemsDeps = {}): Promise<Result[]> => {
	const results: Result[] = [];
	const stream = deps.stream ?? process.stdout;
	const log = deps.log ?? console.log;
	const now = deps.now ?? Date.now;
	const sleepMs = deps.sleepMs ?? sleep;
	const setIntervalFn = deps.setIntervalFn ?? setInterval;
	const clearIntervalFn = deps.clearIntervalFn ?? clearInterval;
	const startedAtMs = now();
	const preferUnicode = stream.isTTY;
	const showLiveTimer = supportsLiveLine(stream) && !options.debug;

	try {
		for (const [index, problem] of problems.entries()) {
			if (!showLiveTimer) {
				log(formatProblemStartLine(index, problems.length, problem.name));
			}

			const startedAt = now();
			let timerId: ReturnType<typeof setInterval> | undefined;
			if (showLiveTimer) {
				writeLiveLine(stream, formatRunningLiveLine(problem.name, 0));
				timerId = setIntervalFn(() => {
					replaceLiveLine(stream, formatRunningLiveLine(problem.name, now() - startedAt));
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
					llmTimeoutSecs: options.llmTimeoutSecs,
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
					name: problem.name,
					passed: result.passed,
					durationMs: result.duration_ms,
					preferUnicode,
				}),
			);
			results.push(result);

			if (options.cooldownPeriodSecs > 0 && index < problems.length - 1) {
				if (showLiveTimer) {
					const cooldownStartedAt = now();
					writeLiveLine(stream, formatCooldownLiveLine(options.cooldownPeriodSecs * 1000));
					const cooldownTimerId = setIntervalFn(() => {
						const elapsed = now() - cooldownStartedAt;
						const remaining = Math.max(0, options.cooldownPeriodSecs * 1000 - elapsed);
						replaceLiveLine(stream, formatCooldownLiveLine(remaining));
					}, 1000);

					try {
						// oxlint-disable-next-line no-await-in-loop
						await sleepMs(options.cooldownPeriodSecs * 1000);
					} finally {
						clearIntervalFn(cooldownTimerId);
						clearLiveLine(stream);
					}
				} else {
					log(formatCooldownStaticLine(options.cooldownPeriodSecs * 1000));
					// oxlint-disable-next-line no-await-in-loop
					await sleepMs(options.cooldownPeriodSecs * 1000);
				}
			}
		}

		log('');
		for (const footerLine of formatRunFooterLines(results, startedAtMs, now())) {
			log(footerLine);
		}

		return results;
	} finally {
		await closeVitestRunner();
	}
};
