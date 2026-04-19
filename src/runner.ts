import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, isAbsolute, join, resolve} from 'node:path';
import {type CliOptions, startVitest} from 'vitest/node';
import {DEFAULT_VITEST_TIMEOUT_SECS} from './config.ts';
import {isTimeoutErrorText} from './failure-kind.ts';
import {type ChangedFilesArtifact, type FailureKind, type Problem, type ProblemExecutionResult, type WorkspaceFile} from './types.ts';

type VitestTaskLike = {
	result?: {errors?: unknown[]};
	tasks?: VitestTaskLike[];
};

type VitestRunLike = {
	state: {
		getUnhandledErrors: () => unknown[];
		getFailedFilepaths: () => string[];
		getFiles: (keys?: string[]) => VitestTaskLike[];
		getCountOfFailedTests: () => number;
	};
	close: () => Promise<void>;
};

type StartVitestLike = (mode: 'test', cliFilters?: string[], options?: CliOptions) => Promise<VitestRunLike>;

export type RunProblemOptions = {
	debug?: boolean;
	startVitest?: StartVitestLike;
	cwd?: string;
	vitestTimeoutMs?: number;
};

const sanitizeErrorText = (value: string): string => {
	const withoutAnsiEscapeCodes = value.replaceAll(String.fromCodePoint(27), '').replaceAll(/\[(?:\d{1,3};)*\d{1,3}m/g, '');

	let sanitized = '';
	for (const character of withoutAnsiEscapeCodes) {
		const code = character.codePointAt(0);
		if (typeof code !== 'number') {
			continue;
		}

		const isAsciiControl = code < 32 || code === 127;
		const isAllowedWhitespace = character === '\n' || character === '\t';
		if (!isAsciiControl || isAllowedWhitespace) {
			sanitized += character;
		}
	}

	return sanitized.trim();
};

const getErrorOutput = (error: unknown): string => {
	if (typeof error === 'object' && error !== null) {
		const withOutput = error as {stdout?: unknown; stderr?: unknown; message?: unknown};
		const stderr = typeof withOutput.stderr === 'string' ? withOutput.stderr.trim() : '';
		const stdout = typeof withOutput.stdout === 'string' ? withOutput.stdout.trim() : '';

		if (stderr.length > 0) {
			return sanitizeErrorText(stderr);
		}

		if (stdout.length > 0) {
			return sanitizeErrorText(stdout);
		}

		if (typeof withOutput.message === 'string') {
			return sanitizeErrorText(withOutput.message);
		}
	}

	if (error instanceof Error) {
		return sanitizeErrorText(error.message);
	}

	return sanitizeErrorText(String(error));
};

const getErrorsFromTask = (task: VitestTaskLike): unknown[] => {
	const errors: unknown[] = [];
	const taskErrors = task.result ? task.result.errors : undefined;
	if (taskErrors) {
		errors.push(...taskErrors);
	}
	if (task.tasks) {
		for (const child of task.tasks) {
			errors.push(...getErrorsFromTask(child));
		}
	}
	return errors;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const readErrorStringField = (error: unknown, field: 'name' | 'code' | 'message'): string | undefined => {
	if (!isRecord(error)) {
		return undefined;
	}

	const raw = error[field];
	return typeof raw === 'string' ? raw : undefined;
};

const isAssertionError = (error: unknown): boolean => {
	const name = readErrorStringField(error, 'name') ?? (error instanceof Error ? error.name : undefined);
	if (typeof name === 'string' && name.toLowerCase().includes('assertion')) {
		return true;
	}

	const code = readErrorStringField(error, 'code');
	if (typeof code === 'string' && code.toUpperCase().includes('ASSERT')) {
		return true;
	}

	const message = readErrorStringField(error, 'message') ?? (error instanceof Error ? error.message : String(error));
	const normalized = message.toLowerCase();
	return (
		normalized.includes('assertionerror') ||
		normalized.includes('expected values to be') ||
		normalized.includes('did not match the regular expression') ||
		normalized.includes('!==')
	);
};

const classifyVitestErrors = (errors: readonly unknown[]): FailureKind => {
	if (errors.some((error) => isAssertionError(error))) {
		return 'assertion';
	}

	return 'runtime';
};

const getVitestFailureOutput = (runnerInstance: VitestRunLike): string => {
	const messages = new Set<string>();

	for (const unhandledError of runnerInstance.state.getUnhandledErrors()) {
		messages.add(getErrorOutput(unhandledError));
	}

	const failedFiles = runnerInstance.state.getFiles(runnerInstance.state.getFailedFilepaths());
	for (const failedFile of failedFiles) {
		for (const error of getErrorsFromTask(failedFile)) {
			messages.add(getErrorOutput(error));
		}
	}

	if (messages.size > 0) {
		return [...messages].join('\n\n');
	}

	const failedTests = runnerInstance.state.getCountOfFailedTests();
	if (failedTests > 0) {
		return `Failed tests: ${failedTests}`;
	}

	return 'Vitest run failed';
};

const collectVitestErrors = (runnerInstance: VitestRunLike): unknown[] => {
	const errors: unknown[] = [];
	for (const unhandledError of runnerInstance.state.getUnhandledErrors()) {
		errors.push(unhandledError);
	}

	const failedFiles = runnerInstance.state.getFiles(runnerInstance.state.getFailedFilepaths());
	for (const failedFile of failedFiles) {
		errors.push(...getErrorsFromTask(failedFile));
	}

	return errors;
};

const withMutedOutput = async <T>(run: () => Promise<T>): Promise<T> => {
	const originalStdoutWrite = process.stdout.write.bind(process.stdout);
	const originalStderrWrite = process.stderr.write.bind(process.stderr);
	const noopWrite = (() => true) as typeof process.stdout.write;

	process.stdout.write = noopWrite;
	process.stderr.write = noopWrite;

	try {
		return await run();
	} finally {
		process.stdout.write = originalStdoutWrite;
		process.stderr.write = originalStderrWrite;
	}
};

const ensureSafeRelativePath = (value: string): string => {
	if (isAbsolute(value)) {
		throw new TypeError(`Artifact file path must be relative: ${value}`);
	}

	if (value.includes('..')) {
		throw new TypeError(`Artifact file path must not include parent traversal: ${value}`);
	}

	return value;
};

const writeWorkspaceFiles = (rootDir: string, files: readonly WorkspaceFile[]): void => {
	for (const file of files) {
		const relativePath = ensureSafeRelativePath(file.path);
		const fullPath = resolve(join(rootDir, relativePath));
		mkdirSync(dirname(fullPath), {recursive: true});
		writeFileSync(fullPath, file.content, 'utf8');
	}
};

const readArtifactFromWorkspace = (rootDir: string, changedFiles: readonly WorkspaceFile[]): ChangedFilesArtifact => ({
	kind: 'changed-files-v1',
	files: changedFiles.map((file) => ({
		path: file.path,
		content: readFileSync(resolve(join(rootDir, ensureSafeRelativePath(file.path))), 'utf8'),
	})),
});

const buildResultFromRunner = (problem: Problem, artifact: ChangedFilesArtifact, runnerInstance: VitestRunLike): ProblemExecutionResult => {
	const executedFiles = runnerInstance.state.getFiles();
	if (executedFiles.length === 0) {
		return {
			problem: problem.name,
			category: problem.category,
			artifact,
			passed: false,
			error: 'No tests were executed by Vitest',
			failure_kind: 'vitest',
		};
	}

	const vitestErrors = collectVitestErrors(runnerInstance);
	const hasTaskErrors = executedFiles.some((task) => getErrorsFromTask(task).length > 0);
	if (hasTaskErrors || runnerInstance.state.getUnhandledErrors().length > 0) {
		return {
			problem: problem.name,
			category: problem.category,
			artifact,
			passed: false,
			error: getVitestFailureOutput(runnerInstance),
			failure_kind: classifyVitestErrors(vitestErrors),
		};
	}

	if (runnerInstance.state.getCountOfFailedTests() > 0) {
		return {
			problem: problem.name,
			category: problem.category,
			artifact,
			passed: false,
			error: getVitestFailureOutput(runnerInstance),
			failure_kind: 'assertion',
		};
	}

	return {
		problem: problem.name,
		category: problem.category,
		artifact,
		passed: true,
	};
};

export const runProblem = async (problem: Problem, artifact: ChangedFilesArtifact, options: RunProblemOptions = {}): Promise<ProblemExecutionResult> => {
	const runVitest = options.startVitest ?? startVitest;
	const problemFiles = Array.isArray(problem.files) ? problem.files : [];
	const problemTests = Array.isArray(problem.tests) ? problem.tests : [];
	const timeoutMs =
		typeof options.vitestTimeoutMs === 'number' && Number.isFinite(options.vitestTimeoutMs) ? options.vitestTimeoutMs : DEFAULT_VITEST_TIMEOUT_SECS * 1000;
	const tempWorkspace = mkdtempSync(join(tmpdir(), 'ai-ts-harness-'));
	let runnerInstance: VitestRunLike | undefined;

	try {
		writeWorkspaceFiles(tempWorkspace, problemFiles);
		writeWorkspaceFiles(tempWorkspace, artifact.files);
		writeWorkspaceFiles(tempWorkspace, problemTests);

		const testPaths = problemTests.map((testFile) => resolve(join(tempWorkspace, ensureSafeRelativePath(testFile.path))));
		if (testPaths.length === 0) {
			throw new TypeError(`Problem has no test files: ${problem.name}`);
		}

		const runVitestOnce = async (): Promise<VitestRunLike> => {
			const runner = await runVitest('test', testPaths, {
				run: true,
				watch: false,
				silent: true,
				color: false,
				testTimeout: timeoutMs,
				reporters: ['dot'],
				root: tempWorkspace,
			});
			return runner;
		};

		runnerInstance = options.debug === true ? await runVitestOnce() : await withMutedOutput(runVitestOnce);
		const persistedArtifact = readArtifactFromWorkspace(tempWorkspace, artifact.files);
		return buildResultFromRunner(problem, persistedArtifact, runnerInstance);
	} catch (error) {
		const errorText = getErrorOutput(error);
		return {
			problem: problem.name,
			category: problem.category,
			artifact,
			passed: false,
			error: errorText,
			failure_kind: isTimeoutErrorText(errorText) ? 'timeout' : 'vitest',
		};
	} finally {
		if (runnerInstance) {
			try {
				await runnerInstance.close();
			} catch {
				/* ignore */
			}
		}

		rmSync(tempWorkspace, {recursive: true, force: true});
	}
};
