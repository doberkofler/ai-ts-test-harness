import {writeFileSync, unlinkSync} from 'node:fs';
import {basename, join} from 'node:path';
import {createVitest, type CliOptions, type Vitest} from 'vitest/node';
import {parseFunctionNameFromSignature} from './core/signature.ts';
import {type Problem, type Result} from './types.ts';

const TIMEOUT_MS = 5000;

let persistentVitest: Vitest | undefined;
let persistentVitestRoot: string | undefined;

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

type VitestRunResultLike = {
	testModules: {
		ok: () => boolean;
		state: () => string;
		moduleId: string;
	}[];
	unhandledErrors: unknown[];
};

type StartVitestLike = (mode: 'test', cliFilters?: string[], options?: CliOptions) => Promise<VitestRunLike>;

export type RunProblemOptions = {
	debug?: boolean;
	startVitest?: StartVitestLike;
	cwd?: string;
};

const sanitizeForFileName = (value: string): string => value.replaceAll(/[^\w-]/g, '_');

const hashForFileName = (value: string): string => {
	let hash = 0;
	for (const character of value) {
		const codePoint = character.codePointAt(0) ?? 0;
		hash = (hash * 31 + codePoint) % 1_000_000_007;
	}
	return Math.trunc(hash).toString(36);
};

const indentBlock = (text: string, indent: string): string =>
	text
		.split('\n')
		.map((line) => `${indent}${line}`)
		.join('\n');

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

const getVitestFailureOutputForModules = (runnerInstance: VitestRunLike, runResult: VitestRunResultLike, targetFile: string): string => {
	const messages = new Set<string>();

	for (const unhandledError of runResult.unhandledErrors) {
		messages.add(getErrorOutput(unhandledError));
	}

	const failedFiles = runnerInstance.state.getFiles([targetFile]);
	for (const failedFile of failedFiles) {
		for (const error of getErrorsFromTask(failedFile)) {
			messages.add(getErrorOutput(error));
		}
	}

	if (messages.size > 0) {
		return [...messages].join('\n\n');
	}

	const failedModuleIds = runResult.testModules.map((testModule) => testModule.moduleId);
	if (failedModuleIds.length > 0) {
		const failedModuleNames = failedModuleIds.map((moduleId) => basename(moduleId));
		return `Failed test modules: ${failedModuleNames.join(', ')}`;
	}

	return 'Vitest run failed';
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

const buildResultFromRunner = (problem: Problem, program: string, startedAtMs: number, runnerInstance: VitestRunLike): Result => {
	const executedFiles = runnerInstance.state.getFiles();
	if (executedFiles.length === 0) {
		return {
			problem: problem.name,
			category: problem.category,
			program,
			passed: false,
			error: 'No tests were executed by Vitest',
			duration_ms: Date.now() - startedAtMs,
		};
	}

	const hasTaskErrors = executedFiles.some((task) => getErrorsFromTask(task).length > 0);
	if (hasTaskErrors || runnerInstance.state.getUnhandledErrors().length > 0) {
		return {
			problem: problem.name,
			category: problem.category,
			program,
			passed: false,
			error: getVitestFailureOutput(runnerInstance),
			duration_ms: Date.now() - startedAtMs,
		};
	}

	return {
		problem: problem.name,
		category: problem.category,
		program,
		passed: true,
		duration_ms: Date.now() - startedAtMs,
	};
};

const buildResultFromRunResult = (
	problem: Problem,
	program: string,
	startedAtMs: number,
	runnerInstance: VitestRunLike,
	runResult: VitestRunResultLike,
	targetFile: string,
): Result => {
	const targetedFiles = runnerInstance.state.getFiles([targetFile]);
	if (targetedFiles.length === 0 && runResult.testModules.length === 0) {
		return {
			problem: problem.name,
			category: problem.category,
			program,
			passed: false,
			error: 'No tests were executed by Vitest',
			duration_ms: Date.now() - startedAtMs,
		};
	}

	const hasTaskErrors = targetedFiles.some((task) => getErrorsFromTask(task).length > 0);
	if (hasTaskErrors || runResult.unhandledErrors.length > 0) {
		return {
			problem: problem.name,
			category: problem.category,
			program,
			passed: false,
			error: getVitestFailureOutputForModules(runnerInstance, runResult, targetFile),
			duration_ms: Date.now() - startedAtMs,
		};
	}

	return {
		problem: problem.name,
		category: problem.category,
		program,
		passed: true,
		duration_ms: Date.now() - startedAtMs,
	};
};

const createPersistentVitest = async (root: string, debug: boolean): Promise<Vitest> => {
	if (persistentVitest && persistentVitestRoot === root) {
		return persistentVitest;
	}

	if (persistentVitest && persistentVitestRoot !== root) {
		try {
			await persistentVitest.close();
		} catch {
			/* ignore */
		}
		persistentVitest = undefined;
		persistentVitestRoot = undefined;
	}

	const createRunner = async (): Promise<Vitest> => {
		const runner = await createVitest('test', {
			run: false,
			watch: true,
			silent: true,
			color: false,
			testTimeout: TIMEOUT_MS,
			reporters: ['dot'],
			root,
		});
		await runner.standalone();
		return runner;
	};

	persistentVitest = debug ? await createRunner() : await withMutedOutput(createRunner);
	persistentVitestRoot = root;
	return persistentVitest;
};

export const closeVitestRunner = async (): Promise<void> => {
	if (!persistentVitest) {
		return;
	}

	try {
		await persistentVitest.close();
	} catch {
		/* ignore */
	} finally {
		persistentVitest = undefined;
		persistentVitestRoot = undefined;
	}
};

/*
 * Assembles a self-contained TS file from the problem + generated code,
 * runs it with Vitest's Node API, and returns pass/fail.
 */
export const runProblem = async (problem: Problem, generatedCode: string, options: RunProblemOptions = {}): Promise<Result> => {
	const implementFunctionSupport =
		problem.kind === 'direct-refactor'
			? []
			: [
					`import ts from 'typescript';`,
					``,
					`const generatedSource = ${JSON.stringify(generatedCode)};`,
					`const implementationEntry = ${JSON.stringify(parseFunctionNameFromSignature(problem.signature))};`,
					``,
					`const evaluateFunction = (source: string, functionName: string): ((...args: readonly unknown[]) => unknown) => {`,
					`\tconst wrappedSource = [`,
					`\t\tsource,`,
					`\t\t\`\`,`,
					`\t\t\`module.exports = {__extracted: typeof \${functionName} !== 'undefined' ? \${functionName} : undefined};\`,`,
					`\t].join('\\n');`,
					``,
					`\tconst transpiled = ts.transpileModule(wrappedSource, {`,
					`\t\tcompilerOptions: {`,
					`\t\t\ttarget: ts.ScriptTarget.ES2022,`,
					`\t\t\tmodule: ts.ModuleKind.CommonJS,`,
					`\t\t},`,
					`\t}).outputText;`,
					``,
					`\tconst moduleLike: {exports: Record<string, unknown>} = {exports: {}};`,
					`\tconst executeTranspiled = new Function('module', 'exports', transpiled) as (module: {exports: Record<string, unknown>}, exports: Record<string, unknown>) => void;`,
					`\texecuteTranspiled(moduleLike, moduleLike.exports);`,
					`\tconst extracted = moduleLike.exports.__extracted;`,
					``,
					`\tif (typeof extracted === 'undefined') {`,
					`\t\tthrow new TypeError(\`Missing function in generated code: \${functionName}\`);`,
					`\t}`,
					``,
					`\tif (typeof extracted !== 'function') {`,
					`\t\tthrow new TypeError(\`Generated symbol is not callable: \${functionName}\`);`,
					`\t}`,
					``,
					`\treturn extracted;`,
					`};`,
					``,
					`const implementation = evaluateFunction(generatedSource, implementationEntry);`,
					`const code = {result: generatedSource};`,
					``,
				];

	const directRefactorSupport =
		problem.kind === 'direct-refactor'
			? [
					`import ts from 'typescript';`,
					``,
					`const input = ${JSON.stringify(problem.input)};`,
					`const result = ${JSON.stringify(generatedCode)};`,
					`const entry = ${JSON.stringify(problem.entry)};`,
					``,
					`const evaluateRefactorFunction = (source: string, functionName: string): ((...args: readonly unknown[]) => unknown) => {`,
					`\tconst wrappedSource = [`,
					`\t\tsource,`,
					`\t\t\`\`,`,
					`\t\t\`module.exports = {__extracted: typeof \${functionName} !== 'undefined' ? \${functionName} : undefined};\`,`,
					`\t].join('\\n');`,
					``,
					`\tconst transpiled = ts.transpileModule(wrappedSource, {`,
					`\t\tcompilerOptions: {`,
					`\t\t\ttarget: ts.ScriptTarget.ES2022,`,
					`\t\t\tmodule: ts.ModuleKind.CommonJS,`,
					`\t\t},`,
					`\t}).outputText;`,
					``,
					`\tconst moduleLike: {exports: Record<string, unknown>} = {exports: {}};`,
					`\tconst executeTranspiled = new Function('module', 'exports', transpiled) as (module: {exports: Record<string, unknown>}, exports: Record<string, unknown>) => void;`,
					`\texecuteTranspiled(moduleLike, moduleLike.exports);`,
					`\tconst extracted = moduleLike.exports.__extracted;`,
					``,
					`\tif (typeof extracted === 'undefined') {`,
					`\t\tthrow new TypeError(\`Missing function in transformed code: \${functionName}\`);`,
					`\t}`,
					``,
					`\tif (typeof extracted !== 'function') {`,
					`\t\tthrow new TypeError(\`Transformed symbol is not callable: \${functionName}\`);`,
					`\t}`,
					``,
					`\treturn extracted;`,
					`};`,
					``,
					`const original = evaluateRefactorFunction(input, entry);`,
					`const transformed = evaluateRefactorFunction(result, entry);`,
					`const code = {input, result};`,
					``,
				]
			: [];

	const functionBasedTests = `const __problemTests = (${problem.tests.toString()});`;
	const testsBody =
		problem.kind === 'direct-refactor'
			? 'return __problemTests({assert, original, transformed, code});'
			: 'return __problemTests({assert, implementation, code});';

	const program = [
		`import {describe, test} from 'vitest';`,
		`import assert from 'node:assert';`,
		``,
		...implementFunctionSupport,
		...directRefactorSupport,
		...(problem.kind === 'direct-refactor' ? [] : [generatedCode]),
		functionBasedTests,
		``,
		`describe(${JSON.stringify(problem.name)}, () => {`,
		`\ttest('generated solution', () => {`,
		indentBlock(testsBody, '\t\t'),
		`\t});`,
		`});`,
	].join('\n');

	if (options.debug === true) {
		console.log('\n[debug] Program under test');
		console.log(program);
	}

	const root = options.cwd ?? process.cwd();
	const tmpFile = join(root, `eval_${sanitizeForFileName(problem.name)}_${hashForFileName(program)}.test.ts`);
	writeFileSync(tmpFile, program, 'utf8');

	const start = Date.now();

	try {
		if (options.startVitest) {
			const startVitestFn = options.startVitest;
			const runVitestOnce = async (): Promise<VitestRunLike> => {
				const runner = await startVitestFn('test', [tmpFile], {
					run: true,
					watch: false,
					silent: true,
					color: false,
					testTimeout: TIMEOUT_MS,
					reporters: ['dot'],
					root,
				});
				return runner;
			};

			let runnerInstance: VitestRunLike | undefined;
			try {
				runnerInstance = options.debug === true ? await runVitestOnce() : await withMutedOutput(runVitestOnce);
				return buildResultFromRunner(problem, program, start, runnerInstance);
			} finally {
				if (runnerInstance) {
					try {
						await runnerInstance.close();
					} catch {
						/* ignore */
					}
				}
			}
		}

		const runner = await createPersistentVitest(root, options.debug === true);
		const runTests = async (): Promise<VitestRunResultLike> => {
			runner.invalidateFile(tmpFile);
			runner.clearSpecificationsCache(tmpFile);
			const runResult = await runner.start([tmpFile]);
			await runner.waitForTestRunEnd();
			return runResult;
		};

		const runResult = await (options.debug === true ? runTests() : withMutedOutput(runTests));

		return buildResultFromRunResult(problem, program, start, runner, runResult, tmpFile);
	} catch (error) {
		const errorText = getErrorOutput(error);
		return {
			problem: problem.name,
			category: problem.category,
			program,
			passed: false,
			error: errorText,
			duration_ms: Date.now() - start,
		};
	} finally {
		try {
			unlinkSync(tmpFile);
		} catch {
			/* ignore */
		}
	}
};
