import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {loadProblems} from './load-problems.ts';
import {solveProblem} from './solveProblem.ts';
import {type Problem, type Result, type RuntimeConfig, type ResultsFile} from './types.ts';
import {STYLES, styleText, formatMs} from './utils.ts';

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
	console.log(styleText('AI Test Harness', STYLES.bold));
	console.log(styleText('----------------', STYLES.dim));
	console.log(`Model      : ${styleText(config.model, STYLES.cyan)}`);
	console.log(`Ollama URL : ${config.ollamaUrl}`);
	console.log(`Timeout    : ${config.timeoutMs}ms (${formatMs(config.timeoutMs)})`);
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
	ollamaUrl: string;
	output: string;
	test: string | undefined;
	category: string | undefined;
}): Promise<{results: Result[]; outputPath: string; config: RuntimeConfig}> => {
	const timeoutMs = Number.parseInt(options.llmTimeoutMs, 10);
	if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
		throw new TypeError(`Invalid --llm-timeout-ms value: ${options.llmTimeoutMs}`);
	}

	if (options.ollamaUrl.length === 0) {
		throw new TypeError(`Invalid --ollama-url value: ${options.ollamaUrl}`);
	}

	if (options.output.length === 0) {
		throw new TypeError(`Invalid --output value: ${options.output}`);
	}

	const allProblems = loadProblems('./problems');
	const selectedCategories = parseCategoryFilter(options.category);
	const problems = selectProblemsByFilters(allProblems, options.test, selectedCategories);
	const runtimeConfig: RuntimeConfig = {
		model: options.model,
		debug: options.debug,
		timeoutMs,
		ollamaUrl: options.ollamaUrl,
		...(Array.isArray(selectedCategories) ? {selectedCategories} : {}),
	};

	printRuntimeConfig(problems, runtimeConfig);

	const results: Result[] = [];

	for (let i = 0; i < problems.length; i++) {
		const problem = problems[i];
		if (problem) {
			const current = `[${String(i + 1).padStart(2, ' ')}/${problems.length}]`;
			console.log(`${styleText(current, STYLES.dim)} ${styleText(problem.name, STYLES.bold)}`);

			// oxlint-disable-next-line no-await-in-loop
			const result = await solveProblem(problem, {model: options.model, ollamaUrl: options.ollamaUrl, debug: options.debug, timeoutMs});

			const status = result.passed ? styleText('PASS', STYLES.green) : styleText('FAIL', STYLES.red);
			console.log(`${status} in ${formatMs(result.duration_ms)}\n`);
			results.push(result);
		}
	}

	const outputPath = writeResultsFile(results, options.output, runtimeConfig);
	console.log(`Saved JSON results to ${outputPath}`);
	return {results, outputPath, config: runtimeConfig};
};
