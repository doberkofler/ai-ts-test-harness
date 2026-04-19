import {mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
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
	parsedOptions: ParsedRunCommandOptions;
	problems: Problem[];
	runtimeConfig: RuntimeConfig;
	executeOptions: ExecuteRunOptions;
};

type RunOutputTargets = {
	openOutputPath: string;
	finalOutputPath: string;
	resumedResults: Result[];
	resumeReason: string;
};

const isResultsOutputFilePath = (value: string): boolean => {
	const lowerCased = value.toLowerCase();
	return lowerCased.endsWith('.json') || lowerCased.endsWith('.json.gz');
};

const isOpenResultsFilePath = (value: string): boolean => value.toLowerCase().endsWith('.json') && !value.toLowerCase().endsWith('.json.gz');

const getTimestampString = (timestampMs = Date.now()): string => {
	const now = new Date(timestampMs);
	const yyyy = now.getFullYear();
	const mm = String(now.getMonth() + 1).padStart(2, '0');
	const dd = String(now.getDate()).padStart(2, '0');
	const hh = String(now.getHours()).padStart(2, '0');
	const min = String(now.getMinutes()).padStart(2, '0');
	const ss = String(now.getSeconds()).padStart(2, '0');
	return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
};

const readResultsPayload = (pathValue: string): ResultsFile => parseResultsFile(readFileSync(pathValue, 'utf8'));

const safeStat = (pathValue: string): ReturnType<typeof statSync> | undefined => {
	try {
		return statSync(pathValue);
	} catch {
		return undefined;
	}
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

const findResumableOpenResults = (
	outputDirectory: string,
	config: RuntimeConfig,
	plannedProblemNames: readonly string[],
	nowMs: number,
): {path: string; results: Result[]; mismatchReason?: string; mismatchPath?: string} | undefined => {
	const entries: {path: string; mtimeMs: number}[] = [];
	for (const entry of readdirSync(outputDirectory)) {
		if (!isOpenResultsFilePath(entry)) {
			continue;
		}
		const entryPath = resolve(join(outputDirectory, entry));
		const entryStats = safeStat(entryPath);
		if (typeof entryStats === 'undefined' || !entryStats.isFile()) {
			continue;
		}
		entries.push({path: entryPath, mtimeMs: Number(entryStats.mtimeMs)});
	}
	entries.sort((left, right) => right.mtimeMs - left.mtimeMs);

	let latestMismatchReason: string | undefined;
	let latestMismatchPath: string | undefined;

	for (const entry of entries) {
		try {
			const payload = readResultsPayload(entry.path);
			const candidate = evaluateResumeCandidate(payload, config, plannedProblemNames, nowMs);
			if (!candidate.resumable) {
				if (typeof latestMismatchReason === 'undefined') {
					latestMismatchReason = candidate.reason;
					latestMismatchPath = entry.path;
				}
				continue;
			}
			return {path: entry.path, results: payload.results};
		} catch {
			if (typeof latestMismatchReason === 'undefined') {
				latestMismatchReason = 'open run file is invalid JSON';
				latestMismatchPath = entry.path;
			}
			continue;
		}
	}

	if (typeof latestMismatchReason === 'string') {
		return {
			path: '',
			results: [],
			mismatchReason: latestMismatchReason,
			...(typeof latestMismatchPath === 'string' ? {mismatchPath: latestMismatchPath} : {}),
		};
	}

	return undefined;
};

const resolveOutputTargets = (output: string, config: RuntimeConfig, plannedProblemNames: readonly string[], nowMs: number): RunOutputTargets => {
	if (!isResultsOutputFilePath(output)) {
		mkdirSync(output, {recursive: true});
		const openFiles = readdirSync(output).filter((entry) => isOpenResultsFilePath(entry));
		if (openFiles.length === 0) {
			const safeModelName = config.model.replaceAll(/[^a-z0-9.-]/gi, '_');
			const runBasePath = resolve(join(output, `run_${getTimestampString(nowMs)}_${safeModelName}`));
			return {
				openOutputPath: `${runBasePath}.json`,
				finalOutputPath: `${runBasePath}.json.gz`,
				resumedResults: [],
				resumeReason: 'no open run file found',
			};
		}

		const resumeCandidate = findResumableOpenResults(output, config, plannedProblemNames, nowMs);
		if (typeof resumeCandidate !== 'undefined') {
			if (resumeCandidate.path.length === 0) {
				const safeModelName = config.model.replaceAll(/[^a-z0-9.-]/gi, '_');
				const runBasePath = resolve(join(output, `run_${getTimestampString(nowMs)}_${safeModelName}`));
				const mismatchSource = typeof resumeCandidate.mismatchPath === 'string' ? ` in ${resumeCandidate.mismatchPath}` : '';
				return {
					openOutputPath: `${runBasePath}.json`,
					finalOutputPath: `${runBasePath}.json.gz`,
					resumedResults: [],
					resumeReason: `open run files exist but latest candidate mismatched${mismatchSource}: ${resumeCandidate.mismatchReason ?? 'unknown reason'}`,
				};
			}
			const completedCount = uniqueCompletedProblemNames(resumeCandidate.results, plannedProblemNames).length;
			return {
				openOutputPath: resumeCandidate.path,
				finalOutputPath: `${resumeCandidate.path}.gz`,
				resumedResults: resumeCandidate.results,
				resumeReason: `resuming with ${completedCount}/${plannedProblemNames.length} completed`,
			};
		}

		const safeModelName = config.model.replaceAll(/[^a-z0-9.-]/gi, '_');
		const runBasePath = resolve(join(output, `run_${getTimestampString(nowMs)}_${safeModelName}`));
		return {
			openOutputPath: `${runBasePath}.json`,
			finalOutputPath: `${runBasePath}.json.gz`,
			resumedResults: [],
			resumeReason: 'open run files exist but none match current model/config/system/scope',
		};
	}

	const resolvedOutputPath = resolve(output);
	const dir = resolve(resolvedOutputPath, '..');
	mkdirSync(dir, {recursive: true});

	if (resolvedOutputPath.toLowerCase().endsWith('.json')) {
		const fileStats = safeStat(resolvedOutputPath);
		// eslint-disable-next-line @typescript-eslint/prefer-optional-chain
		if ((fileStats && fileStats.isFile()) === true) {
			try {
				const payload = readResultsPayload(resolvedOutputPath);
				const candidate = evaluateResumeCandidate(payload, config, plannedProblemNames, nowMs);
				if (candidate.resumable) {
					return {openOutputPath: resolvedOutputPath, finalOutputPath: resolvedOutputPath, resumedResults: payload.results, resumeReason: candidate.reason};
				}
				return {openOutputPath: resolvedOutputPath, finalOutputPath: resolvedOutputPath, resumedResults: [], resumeReason: candidate.reason};
			} catch {
				return {openOutputPath: resolvedOutputPath, finalOutputPath: resolvedOutputPath, resumedResults: [], resumeReason: 'open run file is invalid JSON'};
			}
		}

		return {openOutputPath: resolvedOutputPath, finalOutputPath: resolvedOutputPath, resumedResults: [], resumeReason: 'open run file does not exist yet'};
	}

	const openOutputPath = resolvedOutputPath.slice(0, -'.gz'.length);
	const openStats = safeStat(openOutputPath);
	// eslint-disable-next-line @typescript-eslint/prefer-optional-chain
	if ((openStats && openStats.isFile()) === true) {
		try {
			const payload = readResultsPayload(openOutputPath);
			const candidate = evaluateResumeCandidate(payload, config, plannedProblemNames, nowMs);
			if (candidate.resumable) {
				return {openOutputPath, finalOutputPath: resolvedOutputPath, resumedResults: payload.results, resumeReason: candidate.reason};
			}
			return {openOutputPath, finalOutputPath: resolvedOutputPath, resumedResults: [], resumeReason: candidate.reason};
		} catch {
			return {openOutputPath, finalOutputPath: resolvedOutputPath, resumedResults: [], resumeReason: 'open run file is invalid JSON'};
		}
	}

	return {openOutputPath, finalOutputPath: resolvedOutputPath, resumedResults: [], resumeReason: 'open run file not found'};
};

export const buildRuntimeConfig = (parsedOptions: ParsedRunCommandOptions, selectedCategories: string[] | undefined): RuntimeConfig => ({
	model: parsedOptions.model,
	debug: parsedOptions.debug,
	storeThinking: parsedOptions.storeThinking,
	llmTimeoutSecs: parsedOptions.llmTimeoutSecs,
	vitestTimeoutSecs: parsedOptions.vitestTimeoutSecs,
	noCooldown: parsedOptions.noCooldown,
	ollamaUrl: parsedOptions.ollamaUrl,
	...(typeof parsedOptions.apiKey === 'string' ? {apiKey: parsedOptions.apiKey} : {}),
	...(typeof parsedOptions.oauthToken === 'string' ? {oauthToken: parsedOptions.oauthToken} : {}),
	...(Array.isArray(selectedCategories) ? {selectedCategories} : {}),
});

export const buildExecuteRunOptions = (parsedOptions: ParsedRunCommandOptions): ExecuteRunOptions => ({
	model: parsedOptions.model,
	debug: parsedOptions.debug,
	storeThinking: parsedOptions.storeThinking,
	llmTimeoutSecs: parsedOptions.llmTimeoutSecs,
	vitestTimeoutSecs: parsedOptions.vitestTimeoutSecs,
	noCooldown: parsedOptions.noCooldown,
	ollamaUrl: parsedOptions.ollamaUrl,
	...(typeof parsedOptions.apiKey === 'string' ? {apiKey: parsedOptions.apiKey} : {}),
	...(typeof parsedOptions.oauthToken === 'string' ? {oauthToken: parsedOptions.oauthToken} : {}),
});

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
	const nowMs = Date.now();
	context.runtimeConfig.systemInfo = await getSystemInfo();

	const plannedProblemNames = context.problems.map((problem) => problem.name);
	const outputTargets = resolveOutputTargets(context.parsedOptions.output, context.runtimeConfig, plannedProblemNames, nowMs);

	if (outputTargets.resumedResults.length > 0) {
		console.log(`Resuming open run from ${outputTargets.openOutputPath} (${outputTargets.resumeReason})`);
	} else {
		console.log(`Starting fresh run (${outputTargets.resumeReason})`);
	}

	writeResultsFile(outputTargets.resumedResults, outputTargets.openOutputPath, context.runtimeConfig);

	const results = await executeProblems(context.problems, context.executeOptions, {
		initialResults: outputTargets.resumedResults,
		onProblemComplete: (currentResults) => {
			writeResultsFile(currentResults, outputTargets.openOutputPath, context.runtimeConfig);
		},
	});

	const outputPath = writeResultsFile(results, outputTargets.finalOutputPath, context.runtimeConfig);
	if (outputTargets.openOutputPath !== outputTargets.finalOutputPath) {
		rmSync(outputTargets.openOutputPath, {force: true});
	}

	console.log(`Saved JSON results to ${outputPath}`);
	reportCommand({output: outputPath, htmlOutput: undefined});

	return {results, outputPath, config: context.runtimeConfig};
};

export const runCommand = async (options: RunCommandOptions): Promise<{results: Result[]; outputPath: string; config: RuntimeConfig}> => {
	const context = createRunContext(options);
	const runResult = await runCommandWithContext(context);
	return runResult;
};
