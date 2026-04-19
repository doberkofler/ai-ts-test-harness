import {mkdirSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {gunzipSync, gzipSync} from 'node:zlib';
import {DEFAULT_RESULTS_DIR} from './config.ts';
import {resolveModelFromAuth, toExecuteRunOptions, type ResolvedModel} from './model-resolution.ts';
import {loadProblems} from './load-problems.ts';
import {parseCategoryFilter, selectProblems, selectProblemsByFilters} from './core/problem-selection.ts';
import {executeProblems, type ExecuteRunOptions} from './run-execution.ts';
import {formatResultsFile, parseResultsFile} from './results-file.ts';
import {parseRunCommandOptions, type ParsedRunCommandOptions, type RunCommandOptions} from './run-options.ts';
import {type Problem, type Result, type ResultsFile, type RuntimeConfig} from './types.ts';
import {getSystemInfo} from './system-info.ts';
import {reportCommand} from './report.ts';

export {parseCategoryFilter, selectProblems, selectProblemsByFilters};
export {formatResultsFile};

const AUTO_RESUME_WINDOW_MS = 24 * 60 * 60 * 1000;

export type RunContext = {
	mode: 'run' | 'rerun-failed';
	parsedOptions: ParsedRunCommandOptions;
	problems: Problem[];
	runtimeConfig: RuntimeConfig;
	executeOptions: ExecuteRunOptions;
	previousResultsPath?: string;
	baselineResults?: Result[];
};

type RunOutputTargets = {
	openOutputPath: string;
	finalOutputPath: string;
	resumedResults: Result[];
	resumeReason: string;
};

type PreviousModelResults = {
	path: string;
	payload: ResultsFile;
};

const getResultsDirectory = (): string => resolve(DEFAULT_RESULTS_DIR);

const toSafeModelName = (model: string): string => model.replaceAll(/[^a-z0-9.-]/gi, '_');

const isCompressedResultsPath = (value: string): boolean => value.toLowerCase().endsWith('.json.gz');

const readResultsPayload = (pathValue: string): ResultsFile => {
	const content = isCompressedResultsPath(pathValue) ? gunzipSync(readFileSync(pathValue)).toString('utf8') : readFileSync(pathValue, 'utf8');
	return parseResultsFile(content);
};

const safeStat = (pathValue: string): ReturnType<typeof statSync> | undefined => {
	try {
		return statSync(pathValue);
	} catch {
		return undefined;
	}
};

const getModelResultPaths = (
	outputDirectory: string,
	model: string,
	compress: boolean,
): {
	openOutputPath: string;
	finalOutputPath: string;
	jsonPath: string;
	gzPath: string;
} => {
	const jsonPath = resolve(join(outputDirectory, `${toSafeModelName(model)}.json`));
	return {
		openOutputPath: jsonPath,
		finalOutputPath: compress ? `${jsonPath}.gz` : jsonPath,
		jsonPath,
		gzPath: `${jsonPath}.gz`,
	};
};

const findLatestModelResultsPath = (outputDirectory: string, model: string): string | undefined => {
	const paths = getModelResultPaths(outputDirectory, model, false);
	const candidates = [paths.jsonPath, paths.gzPath]
		.map((pathValue) => ({path: pathValue, stats: safeStat(pathValue)}))
		.filter((candidate): candidate is {path: string; stats: NonNullable<ReturnType<typeof safeStat>>} => {
			const {stats} = candidate;
			if (typeof stats === 'undefined') {
				return false;
			}
			return stats.isFile();
		})
		.sort((left, right) => Number(right.stats.mtimeMs) - Number(left.stats.mtimeMs));

	const [latest] = candidates;
	if (typeof latest === 'undefined') {
		return undefined;
	}
	return latest.path;
};

const loadLatestModelResults = (outputDirectory: string, model: string): PreviousModelResults | undefined => {
	const latestModelResultsPath = findLatestModelResultsPath(outputDirectory, model);
	if (typeof latestModelResultsPath === 'undefined') {
		return undefined;
	}

	return {
		path: latestModelResultsPath,
		payload: readResultsPayload(latestModelResultsPath),
	};
};

const shouldBlockFreshOverwrite = (outputPath: string, overwriteResults: boolean): boolean => {
	if (overwriteResults) {
		return false;
	}

	const stats = safeStat(outputPath);
	if (typeof stats === 'undefined') {
		return false;
	}

	return stats.isFile();
};

const areStringArraysEqual = (left: readonly string[] | undefined, right: readonly string[] | undefined): boolean => {
	if (!Array.isArray(left) && !Array.isArray(right)) {
		return true;
	}
	if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
		return false;
	}
	return left.every((value, index) => value === right[index]);
};

const isRecentPayload = (payload: ResultsFile, nowMs: number): boolean => {
	const generatedAtMs = Date.parse(payload.generated_at);
	if (Number.isNaN(generatedAtMs)) {
		return false;
	}
	return nowMs - generatedAtMs <= AUTO_RESUME_WINDOW_MS;
};

const uniqueCompletedProblemNames = (results: readonly Result[], plannedProblemNames: readonly string[]): string[] => [
	...new Set(results.map((result) => result.problem).filter((problemName) => plannedProblemNames.includes(problemName))),
];

const evaluateResumeCandidate = (
	payload: ResultsFile,
	config: RuntimeConfig,
	plannedProblemNames: readonly string[],
	nowMs: number,
): {resumable: boolean; reason: string} => {
	if (!isRecentPayload(payload, nowMs)) {
		return {resumable: false, reason: 'open run is older than 24 hours'};
	}

	const selectedCategories = Array.isArray(config.selectedCategories) ? config.selectedCategories : undefined;
	if (payload.model !== config.model) {
		return {resumable: false, reason: 'model mismatch'};
	}
	if (payload.ollama_url !== config.ollamaUrl) {
		return {resumable: false, reason: 'Ollama URL mismatch'};
	}
	if (payload.llm_timeout_secs !== config.llmTimeoutSecs) {
		return {resumable: false, reason: 'LLM timeout mismatch'};
	}
	if (payload.vitest_timeout_secs !== config.vitestTimeoutSecs) {
		return {resumable: false, reason: 'Vitest timeout mismatch'};
	}
	if (!areStringArraysEqual(payload.selected_categories, selectedCategories)) {
		return {resumable: false, reason: 'selected categories mismatch'};
	}
	if (!payload.results.every((result) => plannedProblemNames.includes(result.problem))) {
		return {resumable: false, reason: 'open run belongs to a different problem scope'};
	}

	const completedCount = uniqueCompletedProblemNames(payload.results, plannedProblemNames).length;
	if (completedCount >= plannedProblemNames.length) {
		return {resumable: false, reason: 'open run is already complete for current scope'};
	}

	return {resumable: true, reason: `resuming with ${completedCount}/${plannedProblemNames.length} completed`};
};

const resolveOutputTargets = (
	config: RuntimeConfig,
	plannedProblemNames: readonly string[],
	nowMs: number,
	options: {preferredExistingPath?: string} = {},
): RunOutputTargets => {
	const outputDirectory = getResultsDirectory();
	mkdirSync(outputDirectory, {recursive: true});
	const modelPaths = getModelResultPaths(outputDirectory, config.model, config.compress === true);
	const latestModelResultsPath = options.preferredExistingPath ?? findLatestModelResultsPath(outputDirectory, config.model);

	if (typeof latestModelResultsPath === 'undefined') {
		if (
			shouldBlockFreshOverwrite(modelPaths.openOutputPath, config.overwriteResults === true) ||
			shouldBlockFreshOverwrite(modelPaths.finalOutputPath, config.overwriteResults === true)
		) {
			throw new TypeError(`Refusing to overwrite existing results file. Re-run with --overwrite-results to replace ${modelPaths.finalOutputPath}`);
		}

		return {
			openOutputPath: modelPaths.openOutputPath,
			finalOutputPath: modelPaths.finalOutputPath,
			resumedResults: [],
			resumeReason: 'no previous run file found for model',
		};
	}

	let payload: ResultsFile;
	try {
		payload = readResultsPayload(latestModelResultsPath);
	} catch {
		return {
			openOutputPath: modelPaths.openOutputPath,
			finalOutputPath: modelPaths.finalOutputPath,
			resumedResults: [],
			resumeReason: `previous run file is invalid JSON: ${latestModelResultsPath}`,
		};
	}

	const candidate = evaluateResumeCandidate(payload, config, plannedProblemNames, nowMs);
	if (!candidate.resumable) {
		if (typeof options.preferredExistingPath === 'string') {
			const openOutputPath = isCompressedResultsPath(latestModelResultsPath) ? latestModelResultsPath.slice(0, -'.gz'.length) : latestModelResultsPath;
			const finalOutputPath = config.compress === true ? `${openOutputPath}.gz` : openOutputPath;
			return {
				openOutputPath,
				finalOutputPath,
				resumedResults: [],
				resumeReason: `${candidate.reason} (${latestModelResultsPath})`,
			};
		}

		if (
			shouldBlockFreshOverwrite(modelPaths.openOutputPath, config.overwriteResults === true) ||
			shouldBlockFreshOverwrite(modelPaths.finalOutputPath, config.overwriteResults === true)
		) {
			throw new TypeError(`Refusing to overwrite existing results file. Re-run with --overwrite-results to replace ${modelPaths.finalOutputPath}`);
		}

		return {
			openOutputPath: modelPaths.openOutputPath,
			finalOutputPath: modelPaths.finalOutputPath,
			resumedResults: [],
			resumeReason: `${candidate.reason} (${latestModelResultsPath})`,
		};
	}

	const openOutputPath = isCompressedResultsPath(latestModelResultsPath) ? latestModelResultsPath.slice(0, -'.gz'.length) : latestModelResultsPath;
	const finalOutputPath = config.compress === true ? `${openOutputPath}.gz` : openOutputPath;
	const completedCount = uniqueCompletedProblemNames(payload.results, plannedProblemNames).length;
	return {
		openOutputPath,
		finalOutputPath,
		resumedResults: payload.results,
		resumeReason: `resuming with ${completedCount}/${plannedProblemNames.length} completed`,
	};
};

const collectFailedProblemNamesFromPreviousRun = (model: string): Set<string> => {
	const outputDirectory = getResultsDirectory();
	mkdirSync(outputDirectory, {recursive: true});
	const previousResults = loadLatestModelResults(outputDirectory, model);
	if (typeof previousResults === 'undefined') {
		throw new TypeError(`No previous results file found for model ${model} in ${outputDirectory}`);
	}

	return new Set(previousResults.payload.results.filter((result) => !result.passed).map((result) => result.problem));
};

export const buildRuntimeConfig = (
	parsedOptions: ParsedRunCommandOptions,
	selectedCategories: string[] | undefined,
	resolvedModel: ResolvedModel,
): RuntimeConfig => ({
	model: parsedOptions.model,
	provider: resolvedModel.provider,
	connection: resolvedModel.connectionName,
	authType: resolvedModel.authType,
	debug: parsedOptions.debug,
	storeThinking: parsedOptions.storeThinking,
	compress: parsedOptions.compress,
	overwriteResults: parsedOptions.overwriteResults,
	llmTimeoutSecs: parsedOptions.llmTimeoutSecs,
	vitestTimeoutSecs: parsedOptions.vitestTimeoutSecs,
	noCooldown: parsedOptions.noCooldown,
	ollamaUrl: resolvedModel.baseUrl,
	...(Array.isArray(selectedCategories) ? {selectedCategories} : {}),
});

export const buildExecuteRunOptions = (parsedOptions: ParsedRunCommandOptions, resolvedModel: ResolvedModel): ExecuteRunOptions =>
	toExecuteRunOptions(
		{
			debug: parsedOptions.debug,
			storeThinking: parsedOptions.storeThinking,
			llmTimeoutSecs: parsedOptions.llmTimeoutSecs,
			vitestTimeoutSecs: parsedOptions.vitestTimeoutSecs,
			noCooldown: parsedOptions.noCooldown,
		},
		resolvedModel,
	);

export const writeResultsFile = (results: Result[], outputPath: string, config: RuntimeConfig): string => {
	const resolvedOutputPath = resolve(outputPath);
	const payload = formatResultsFile(results, config);
	const serializedPayload = `${JSON.stringify(payload, undefined, 2)}\n`;
	if (resolvedOutputPath.toLowerCase().endsWith('.gz')) {
		writeFileSync(resolvedOutputPath, gzipSync(serializedPayload));
	} else {
		writeFileSync(resolvedOutputPath, serializedPayload, 'utf8');
	}
	return resolvedOutputPath;
};

export const createRunContext = (options: RunCommandOptions): RunContext => {
	const parsedOptions = parseRunCommandOptions(options);
	const resolvedModel = resolveModelFromAuth(parsedOptions.model);
	const allProblems = loadProblems('./src/problems');
	const selectedCategories = parseCategoryFilter(parsedOptions.category);
	const problems = selectProblemsByFilters(allProblems, parsedOptions.test, selectedCategories);
	const runtimeConfig = buildRuntimeConfig(parsedOptions, selectedCategories, resolvedModel);
	const executeOptions = buildExecuteRunOptions(parsedOptions, resolvedModel);

	return {
		mode: 'run',
		parsedOptions,
		problems,
		runtimeConfig,
		executeOptions,
	};
};

export const createRerunFailedContext = (options: RunCommandOptions): RunContext => {
	const context = createRunContext(options);
	const outputDirectory = getResultsDirectory();
	mkdirSync(outputDirectory, {recursive: true});
	const previousResults = loadLatestModelResults(outputDirectory, context.runtimeConfig.model);
	if (typeof previousResults === 'undefined') {
		throw new TypeError(`No previous results file found for model ${context.runtimeConfig.model} in ${outputDirectory}`);
	}
	const failedProblemNames = collectFailedProblemNamesFromPreviousRun(context.runtimeConfig.model);
	const failedProblems = context.problems.filter((problem) => failedProblemNames.has(problem.name));
	if (failedProblems.length === 0) {
		throw new TypeError('No previously failed problems matched the current filter scope');
	}

	return {
		...context,
		mode: 'rerun-failed',
		problems: failedProblems,
		previousResultsPath: previousResults.path,
		baselineResults: previousResults.payload.results,
	};
};

export const runCommandWithContext = async (context: RunContext): Promise<{results: Result[]; outputPath: string; config: RuntimeConfig}> => {
	const nowMs = Date.now();
	context.runtimeConfig.systemInfo = await getSystemInfo();

	const plannedProblemNames = context.problems.map((problem) => problem.name);
	const rerunOutputOptions = typeof context.previousResultsPath === 'string' ? {preferredExistingPath: context.previousResultsPath} : undefined;
	const outputTargets =
		context.mode === 'rerun-failed'
			? resolveOutputTargets(context.runtimeConfig, plannedProblemNames, nowMs, rerunOutputOptions)
			: resolveOutputTargets(context.runtimeConfig, plannedProblemNames, nowMs);

	const initialResults =
		context.mode === 'rerun-failed' && Array.isArray(context.baselineResults)
			? context.baselineResults.filter((result) => !plannedProblemNames.includes(result.problem))
			: outputTargets.resumedResults;
	const initialProblemNames = new Set(initialResults.map((result) => result.problem));
	const pendingProblems = context.problems.filter((problem) => !initialProblemNames.has(problem.name));

	const startMessage =
		context.mode === 'rerun-failed'
			? `Updating existing run from ${outputTargets.openOutputPath} (re-running ${plannedProblemNames.length} previously failed problem${plannedProblemNames.length === 1 ? '' : 's'})`
			: outputTargets.resumedResults.length > 0
				? `Resuming open run from ${outputTargets.openOutputPath} (${outputTargets.resumeReason})`
				: `Starting fresh run (${outputTargets.resumeReason})`;

	console.log(startMessage);

	writeResultsFile(initialResults, outputTargets.openOutputPath, context.runtimeConfig);

	const results = await executeProblems(pendingProblems, context.executeOptions, {
		initialResults,
		onProblemComplete: (currentResults) => {
			writeResultsFile(currentResults, outputTargets.openOutputPath, context.runtimeConfig);
		},
	});

	const outputPath = writeResultsFile(results, outputTargets.finalOutputPath, context.runtimeConfig);
	if (outputTargets.openOutputPath !== outputTargets.finalOutputPath) {
		rmSync(outputTargets.openOutputPath, {force: true});
	}

	console.log(`Saved JSON results to ${outputPath}`);
	reportCommand({model: context.runtimeConfig.model, htmlOutput: undefined});

	return {results, outputPath, config: context.runtimeConfig};
};

export const runCommand = async (options: RunCommandOptions): Promise<{results: Result[]; outputPath: string; config: RuntimeConfig}> => {
	const context = createRunContext(options);
	const runResult = await runCommandWithContext(context);
	return runResult;
};
