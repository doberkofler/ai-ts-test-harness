import {mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
import {loadProblems} from './load-problems.ts';
import {parseCategoryFilter, selectProblems, selectProblemsByFilters} from './core/problem-selection.ts';
import {executeProblems, type ExecuteRunOptions} from './run-execution.ts';
import {formatResultsFile, parseResultsFile} from './results-file.ts';
import {parseRunCommandOptions, type ParsedRunCommandOptions, type RunCommandOptions} from './run-options.ts';
import {type Problem, type Result, type ResultsFile, type RuntimeConfig, type SystemInfo} from './types.ts';
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

const areSystemInfosEqual = (left: SystemInfo | undefined, right: SystemInfo | undefined): boolean => {
	if (typeof left === 'undefined' || typeof right === 'undefined') {
		return false;
	}
	return (
		left.hostname === right.hostname && left.os === right.os && left.cpu === right.cpu && left.ram_gb === right.ram_gb && (left.gpu ?? '') === (right.gpu ?? '')
	);
};

const isRecentPayload = (payload: ResultsFile, nowMs: number): boolean => {
	const generatedAtMs = Date.parse(payload.generated_at);
	if (Number.isNaN(generatedAtMs)) {
		return false;
	}
	return nowMs - generatedAtMs <= AUTO_RESUME_WINDOW_MS;
};

const isResumablePayload = (payload: ResultsFile, config: RuntimeConfig, plannedProblemNames: readonly string[], nowMs: number): boolean => {
	if (!isRecentPayload(payload, nowMs)) {
		return false;
	}

	const selectedCategories = Array.isArray(config.selectedCategories) ? config.selectedCategories : undefined;
	const plannedNames = Array.isArray(config.plannedProblemNames) ? config.plannedProblemNames : plannedProblemNames;
	const payloadCooldown = typeof payload.cooldown_period_secs === 'number' ? payload.cooldown_period_secs : 0;
	const configCooldown = typeof config.cooldownPeriodSecs === 'number' ? config.cooldownPeriodSecs : 0;

	if (payload.model !== config.model) {
		return false;
	}
	if (payload.ollama_url !== config.ollamaUrl) {
		return false;
	}
	if (payload.llm_timeout_secs !== config.llmTimeoutSecs) {
		return false;
	}
	if (payloadCooldown !== configCooldown) {
		return false;
	}
	if (payload.debug !== config.debug) {
		return false;
	}
	if (!areStringArraysEqual(payload.selected_categories, selectedCategories)) {
		return false;
	}
	if (!areStringArraysEqual(payload.planned_problem_names, plannedNames)) {
		return false;
	}
	if (!areSystemInfosEqual(payload.system_info, config.systemInfo)) {
		return false;
	}
	if (payload.results.length >= payload.total) {
		return false;
	}

	return payload.results.every((result) => plannedProblemNames.includes(result.problem));
};

const findResumableOpenResults = (
	outputDirectory: string,
	config: RuntimeConfig,
	plannedProblemNames: readonly string[],
	nowMs: number,
): {path: string; results: Result[]} | undefined => {
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

	for (const entry of entries) {
		try {
			const payload = readResultsPayload(entry.path);
			if (!isResumablePayload(payload, config, plannedProblemNames, nowMs)) {
				continue;
			}
			return {path: entry.path, results: payload.results};
		} catch {
			continue;
		}
	}

	return undefined;
};

const resolveOutputTargets = (output: string, config: RuntimeConfig, plannedProblemNames: readonly string[], nowMs: number): RunOutputTargets => {
	if (!isResultsOutputFilePath(output)) {
		mkdirSync(output, {recursive: true});

		const resumeCandidate = findResumableOpenResults(output, config, plannedProblemNames, nowMs);
		if (typeof resumeCandidate !== 'undefined') {
			return {
				openOutputPath: resumeCandidate.path,
				finalOutputPath: `${resumeCandidate.path}.gz`,
				resumedResults: resumeCandidate.results,
			};
		}

		const safeModelName = config.model.replaceAll(/[^a-z0-9.-]/gi, '_');
		const runBasePath = resolve(join(output, `run_${getTimestampString(nowMs)}_${safeModelName}`));
		return {
			openOutputPath: `${runBasePath}.json`,
			finalOutputPath: `${runBasePath}.json.gz`,
			resumedResults: [],
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
				if (isResumablePayload(payload, config, plannedProblemNames, nowMs)) {
					return {openOutputPath: resolvedOutputPath, finalOutputPath: resolvedOutputPath, resumedResults: payload.results};
				}
			} catch {
				// Ignore invalid file contents and overwrite with a fresh run.
			}
		}

		return {openOutputPath: resolvedOutputPath, finalOutputPath: resolvedOutputPath, resumedResults: []};
	}

	const openOutputPath = resolvedOutputPath.slice(0, -'.gz'.length);
	const openStats = safeStat(openOutputPath);
	// eslint-disable-next-line @typescript-eslint/prefer-optional-chain
	if ((openStats && openStats.isFile()) === true) {
		try {
			const payload = readResultsPayload(openOutputPath);
			if (isResumablePayload(payload, config, plannedProblemNames, nowMs)) {
				return {openOutputPath, finalOutputPath: resolvedOutputPath, resumedResults: payload.results};
			}
		} catch {
			// Ignore invalid file contents and overwrite with a fresh run.
		}
	}

	return {openOutputPath, finalOutputPath: resolvedOutputPath, resumedResults: []};
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
	const runtimeConfig = {
		...buildRuntimeConfig(parsedOptions, selectedCategories),
		plannedProblemNames: problems.map((problem) => problem.name),
	};
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
		console.log(`Resuming open run from ${outputTargets.openOutputPath} with ${outputTargets.resumedResults.length}/${context.problems.length} completed`);
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
