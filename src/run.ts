import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import {clearLine, cursorTo} from 'node:readline';
import {loadProblems} from './load-problems.ts';
import {solveProblem} from './solveProblem.ts';
import {type Problem, type Result, type RuntimeConfig, type ResultsFile} from './types.ts';
import {STYLES, styleText, formatMs} from './utils.ts';

const formatClockTime = (date: Date): string => {
	const hour = String(date.getHours()).padStart(2, '0');
	const minute = String(date.getMinutes()).padStart(2, '0');
	const second = String(date.getSeconds()).padStart(2, '0');
	return `${hour}:${minute}:${second}`;
};

const formatElapsedClock = (durationMs: number): string => {
	const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
	const hour = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
	const minute = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
	const second = String(totalSeconds % 60).padStart(2, '0');
	return `${hour}:${minute}:${second}`;
};

export const parseCategoryFilter = (value?: string): string[] | undefined => {
	if (typeof value !== 'string') {
		return undefined;
	}

	const normalizedValue = value.trim();
	if (normalizedValue.length === 0) {
		throw new TypeError(`Invalid --category value: ${value}`);
	}

	const categories = normalizedValue.split(',').map((category) => category.trim().toLowerCase());

	if (categories.some((category) => category.length === 0)) {
		throw new TypeError(`Invalid --category value: ${value}`);
	}

	return [...new Set(categories)];
};

export const selectProblemsByFilters = (problems: Problem[], testName?: string, categories?: string[]): Problem[] => {
	let selected = problems;

	if (typeof testName === 'string') {
		const normalizedTestName = testName.trim();
		if (normalizedTestName.length === 0) {
			throw new TypeError(`Invalid --test value: ${testName}`);
		}

		const found = selected.find((problem) => problem.name === normalizedTestName);
		if (typeof found === 'undefined') {
			const availableNames = problems.map((problem) => problem.name).join(', ');
			throw new TypeError(`Unknown --test value: ${normalizedTestName}. Available tests: ${availableNames}`);
		}

		selected = [found];
	}

	if (Array.isArray(categories) && categories.length > 0) {
		const categorySet = new Set(categories);
		selected = selected.filter((problem) => categorySet.has(problem.category));

		if (selected.length === 0) {
			const availableCategories = [...new Set(problems.map((problem) => problem.category))].sort().join(', ');
			throw new TypeError(`No problems matched --category values: ${categories.join(', ')}. Available categories: ${availableCategories}`);
		}
	}

	return selected;
};

export const selectProblems = (problems: Problem[], testName?: string): Problem[] => selectProblemsByFilters(problems, testName);

export const printRuntimeConfig = (problems: Problem[], config: RuntimeConfig): void => {
	const authMode = typeof config.apiKey === 'string' ? 'api-key' : typeof config.oauthToken === 'string' ? 'oauth-token' : 'ollama-default';
	const cooldownMs = config.cooldownMs ?? 0;

	console.log(styleText('AI Test Harness', STYLES.bold));
	console.log(styleText('----------------', STYLES.dim));
	console.log(`Model      : ${styleText(config.model, STYLES.cyan)}`);
	console.log(`Ollama URL : ${config.ollamaUrl}`);
	console.log(`Auth       : ${authMode}`);
	console.log(`Timeout    : ${config.timeoutMs}ms (${formatMs(config.timeoutMs)})`);
	console.log(`Cooldown   : ${cooldownMs}ms (${formatMs(cooldownMs)})`);
	console.log(`Debug      : ${config.debug ? styleText('enabled', STYLES.yellow) : 'disabled'}`);
	console.log(
		`Categories : ${Array.isArray(config.selectedCategories) && config.selectedCategories.length > 0 ? config.selectedCategories.join(', ') : 'all'}`,
	);
	console.log(`Problems   : ${problems.length}\n`);
};

export const formatResultsFile = (results: Result[], config: RuntimeConfig): ResultsFile => {
	const passed = results.filter((r) => r.passed).length;
	const total = results.length;

	return {
		generated_at: new Date().toISOString(),
		model: config.model,
		ollama_url: config.ollamaUrl,
		llm_timeout_ms: config.timeoutMs,
		...(typeof config.cooldownMs === 'number' ? {cooldown_ms: config.cooldownMs} : {}),
		debug: config.debug,
		...(Array.isArray(config.selectedCategories) ? {selected_categories: config.selectedCategories} : {}),
		total,
		passed,
		failed: total - passed,
		pass_rate_percent: total === 0 ? 0 : Math.round((passed / total) * 100),
		results,
	};
};

export const writeResultsFile = (results: Result[], outputPath: string, config: RuntimeConfig): string => {
	const resolvedOutputPath = resolve(outputPath);
	const payload = formatResultsFile(results, config);
	writeFileSync(resolvedOutputPath, `${JSON.stringify(payload, undefined, 2)}\n`, 'utf8');
	return resolvedOutputPath;
};

export const runCommand = async (options: {
	model: string;
	debug: boolean;
	llmTimeoutMs: string;
	cooldownMs: string;
	ollamaUrl: string;
	apiKey?: string;
	oauthToken?: string;
	output: string;
	test: string | undefined;
	category: string | undefined;
}): Promise<{results: Result[]; outputPath: string; config: RuntimeConfig}> => {
	const timeoutMs = Number.parseInt(options.llmTimeoutMs, 10);
	if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
		throw new TypeError(`Invalid --llm-timeout-ms value: ${options.llmTimeoutMs}`);
	}

	const cooldownMs = Number.parseInt(options.cooldownMs, 10);
	if (!Number.isFinite(cooldownMs) || cooldownMs < 0) {
		throw new TypeError(`Invalid --cooldown-ms value: ${options.cooldownMs}`);
	}

	if (options.ollamaUrl.length === 0) {
		throw new TypeError(`Invalid --ollama-url value: ${options.ollamaUrl}`);
	}

	if (options.output.length === 0) {
		throw new TypeError(`Invalid --output value: ${options.output}`);
	}

	if (typeof options.apiKey === 'string' && options.apiKey.length === 0) {
		throw new TypeError('Invalid --api-key value');
	}

	if (typeof options.oauthToken === 'string' && options.oauthToken.length === 0) {
		throw new TypeError('Invalid --oauth-token value');
	}

	const allProblems = loadProblems('./src/problems');
	const selectedCategories = parseCategoryFilter(options.category);
	const problems = selectProblemsByFilters(allProblems, options.test, selectedCategories);
	const runtimeConfig: RuntimeConfig = {
		model: options.model,
		debug: options.debug,
		timeoutMs,
		cooldownMs,
		ollamaUrl: options.ollamaUrl,
		...(typeof options.apiKey === 'string' ? {apiKey: options.apiKey} : {}),
		...(typeof options.oauthToken === 'string' ? {oauthToken: options.oauthToken} : {}),
		...(Array.isArray(selectedCategories) ? {selectedCategories} : {}),
	};

	printRuntimeConfig(problems, runtimeConfig);

	const results: Result[] = [];

	for (let i = 0; i < problems.length; i++) {
		const problem = problems[i];
		if (problem) {
			const current = `[${String(i + 1).padStart(2, ' ')}/${problems.length}]`;
			console.log(`${styleText(current, STYLES.dim)} ${styleText(problem.name, STYLES.bold)}`);
			const startedAt = Date.now();
			console.log(`Started   : ${formatClockTime(new Date(startedAt))}`);

			const showLiveTimer = process.stdout.isTTY && !options.debug;
			let timerId: ReturnType<typeof setInterval> | undefined;
			if (showLiveTimer) {
				process.stdout.write(`Running   : ${formatElapsedClock(0)}`);
				timerId = setInterval(() => {
					cursorTo(process.stdout, 0);
					clearLine(process.stdout, 0);
					process.stdout.write(`Running   : ${formatElapsedClock(Date.now() - startedAt)}`);
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
					timeoutMs,
				});
			} finally {
				if (typeof timerId !== 'undefined') {
					clearInterval(timerId);
					cursorTo(process.stdout, 0);
					clearLine(process.stdout, 0);
				}
			}

			const status = result.passed ? styleText('PASS', STYLES.green) : styleText('FAIL', STYLES.red);
			console.log(`${status} in ${formatMs(result.duration_ms)}\n`);
			results.push(result);

			if (cooldownMs > 0 && i < problems.length - 1) {
				if (showLiveTimer) {
					const cooldownStartedAt = Date.now();
					process.stdout.write(`Cooldown  : ${formatElapsedClock(cooldownMs)}`);
					const cooldownTimerId = setInterval(() => {
						const elapsed = Date.now() - cooldownStartedAt;
						const remaining = Math.max(0, cooldownMs - elapsed);
						cursorTo(process.stdout, 0);
						clearLine(process.stdout, 0);
						process.stdout.write(`Cooldown  : ${formatElapsedClock(remaining)}`);
					}, 1000);

					try {
						// oxlint-disable-next-line no-await-in-loop
						await sleep(cooldownMs);
					} finally {
						clearInterval(cooldownTimerId);
						cursorTo(process.stdout, 0);
						clearLine(process.stdout, 0);
					}
				} else {
					console.log(`Cooldown  : ${formatElapsedClock(cooldownMs)}`);
					// oxlint-disable-next-line no-await-in-loop
					await sleep(cooldownMs);
				}
			}
		}
	}

	const outputPath = writeResultsFile(results, options.output, runtimeConfig);
	console.log(`Saved JSON results to ${outputPath}`);
	return {results, outputPath, config: runtimeConfig};
};
