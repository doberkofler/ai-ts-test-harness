import {mkdirSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {loadProblems} from './load-problems.ts';
import {summarizeResults} from './core/results-summary.ts';
import {parseCategoryFilter, selectProblems, selectProblemsByFilters} from './core/problem-selection.ts';
import {executeProblems, type ExecuteRunOptions} from './run-execution.ts';
import {parseRunCommandOptions, type ParsedRunCommandOptions, type RunCommandOptions} from './run-options.ts';
import {type Problem, type Result, type RuntimeConfig, type ResultsFile} from './types.ts';
import {getSystemInfo} from './system-info.ts';
import {reportCommand} from './report.ts';

export {parseCategoryFilter, selectProblems, selectProblemsByFilters};

export type RunContext = {
	parsedOptions: ParsedRunCommandOptions;
	problems: Problem[];
	runtimeConfig: RuntimeConfig;
	executeOptions: ExecuteRunOptions;
};

export const buildRuntimeConfig = (parsedOptions: ParsedRunCommandOptions, selectedCategories: string[] | undefined): RuntimeConfig => ({
	model: parsedOptions.model,
	debug: parsedOptions.debug,
	llmTimeoutSecs: parsedOptions.llmTimeoutSecs,
	cooldownPeriodSecs: parsedOptions.cooldownPeriodSecs,
	ollamaUrl: parsedOptions.ollamaUrl,
	...(typeof parsedOptions.apiKey === 'string' ? {apiKey: parsedOptions.apiKey} : {}),
	...(typeof parsedOptions.oauthToken === 'string' ? {oauthToken: parsedOptions.oauthToken} : {}),
	...(Array.isArray(selectedCategories) ? {selectedCategories} : {}),
});

export const buildExecuteRunOptions = (parsedOptions: ParsedRunCommandOptions): ExecuteRunOptions => ({
	model: parsedOptions.model,
	debug: parsedOptions.debug,
	llmTimeoutSecs: parsedOptions.llmTimeoutSecs,
	cooldownPeriodSecs: parsedOptions.cooldownPeriodSecs,
	ollamaUrl: parsedOptions.ollamaUrl,
	...(typeof parsedOptions.apiKey === 'string' ? {apiKey: parsedOptions.apiKey} : {}),
	...(typeof parsedOptions.oauthToken === 'string' ? {oauthToken: parsedOptions.oauthToken} : {}),
});

export const formatResultsFile = (results: Result[], config: RuntimeConfig): ResultsFile => {
	const summary = summarizeResults(results);

	return {
		generated_at: new Date().toISOString(),
		model: config.model,
		total: summary.total,
		passed: summary.passed,
		failed: summary.failed,
		pass_rate_percent: summary.passRatePercent,
		results,
	};
};

export const writeResultsFile = (results: Result[], outputPath: string, config: RuntimeConfig): string => {
	const resolvedOutputPath = resolve(outputPath);
	const payload = formatResultsFile(results, config);
	writeFileSync(resolvedOutputPath, `${JSON.stringify(payload, undefined, 2)}\n`, 'utf8');
	return resolvedOutputPath;
};

export const createRunContext = (options: RunCommandOptions): RunContext => {
	const parsedOptions = parseRunCommandOptions(options);
	const allProblems = loadProblems('./src/problems');
	const selectedCategories = parseCategoryFilter(parsedOptions.category);
	const problems = selectProblemsByFilters(allProblems, parsedOptions.test, selectedCategories);
	const runtimeConfig = buildRuntimeConfig(parsedOptions, selectedCategories);
	const executeOptions = buildExecuteRunOptions(parsedOptions);

	return {
		parsedOptions,
		problems,
		runtimeConfig,
		executeOptions,
	};
};

export const runCommandWithContext = async (context: RunContext): Promise<{results: Result[]; outputPath: string; config: RuntimeConfig}> => {
	const results = await executeProblems(context.problems, context.executeOptions);

	const systemInfo = await getSystemInfo();
	context.runtimeConfig.systemInfo = systemInfo;

	const {output} = context.parsedOptions;
	let outputPath = output;
	if (!output.endsWith('.json')) {
		mkdirSync(output, {recursive: true});

		const now = new Date();
		const yyyy = now.getFullYear();
		const mm = String(now.getMonth() + 1).padStart(2, '0');
		const dd = String(now.getDate()).padStart(2, '0');
		const hh = String(now.getHours()).padStart(2, '0');
		const min = String(now.getMinutes()).padStart(2, '0');
		const ss = String(now.getSeconds()).padStart(2, '0');
		const timestamp = `${yyyy}${mm}${dd}-${hh}${min}${ss}`;

		const safeModelName = context.runtimeConfig.model.replaceAll(/[^a-z0-9.-]/gi, '_');
		outputPath = join(output, `run_${timestamp}_${safeModelName}.json`);
	} else {
		const dir = resolve(output, '..');
		mkdirSync(dir, {recursive: true});
	}

	outputPath = writeResultsFile(results, outputPath, context.runtimeConfig);
	console.log(`Saved JSON results to ${outputPath}`);
	reportCommand({output: outputPath, htmlOutput: undefined});

	return {results, outputPath, config: context.runtimeConfig};
};

export const runCommand = async (options: RunCommandOptions): Promise<{results: Result[]; outputPath: string; config: RuntimeConfig}> => {
	const context = createRunContext(options);
	const runResult = await runCommandWithContext(context);
	return runResult;
};
