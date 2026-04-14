import {setTimeout as sleep} from 'node:timers/promises';
import {formatElapsedClock} from './core/time-format.ts';
import {clearLiveLine, replaceLiveLine, supportsLiveLine, writeLiveLine} from './core/tty-live-line.ts';
import {solveProblem} from './solveProblem.ts';
import {type Problem, type Result} from './types.ts';
import {formatMs, STYLES, styleText} from './utils.ts';

export type ExecuteRunOptions = {
	model: string;
	debug: boolean;
	llmTimeoutSecs: number;
	cooldownPeriodSecs: number;
	ollamaUrl: string;
	apiKey?: string;
	oauthToken?: string;
};

export const executeProblems = async (problems: Problem[], options: ExecuteRunOptions): Promise<Result[]> => {
	const results: Result[] = [];

	for (const [index, problem] of problems.entries()) {
		const current = `[${String(index + 1).padStart(2, ' ')}/${problems.length}]`;
		console.log(`${styleText(current, STYLES.dim)} ${styleText(problem.name, STYLES.bold)}`);
		const startedAt = Date.now();

		const showLiveTimer = supportsLiveLine(process.stdout) && !options.debug;
		let timerId: ReturnType<typeof setInterval> | undefined;
		if (showLiveTimer) {
			writeLiveLine(process.stdout, `Running   : ${formatElapsedClock(0)}`);
			timerId = setInterval(() => {
				replaceLiveLine(process.stdout, `Running   : ${formatElapsedClock(Date.now() - startedAt)}`);
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
				clearInterval(timerId);
				clearLiveLine(process.stdout);
			}
		}

		const status = result.passed ? styleText('PASS', STYLES.green) : styleText('FAIL', STYLES.red);
		console.log(`${status} in ${formatMs(result.duration_ms)}\n`);
		results.push(result);

		if (options.cooldownPeriodSecs > 0 && index < problems.length - 1) {
			if (showLiveTimer) {
				const cooldownStartedAt = Date.now();
				writeLiveLine(process.stdout, `Cooldown  : ${formatElapsedClock(options.cooldownPeriodSecs * 1000)}`);
				const cooldownTimerId = setInterval(() => {
					const elapsed = Date.now() - cooldownStartedAt;
					const remaining = Math.max(0, options.cooldownPeriodSecs * 1000 - elapsed);
					replaceLiveLine(process.stdout, `Cooldown  : ${formatElapsedClock(remaining)}`);
				}, 1000);

				try {
					// oxlint-disable-next-line no-await-in-loop
					await sleep(options.cooldownPeriodSecs * 1000);
				} finally {
					clearInterval(cooldownTimerId);
					clearLiveLine(process.stdout);
				}
			} else {
				console.log(`Cooldown  : ${formatElapsedClock(options.cooldownPeriodSecs * 1000)}`);
				// oxlint-disable-next-line no-await-in-loop
				await sleep(options.cooldownPeriodSecs * 1000);
			}
		}
	}

	return results;
};
