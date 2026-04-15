import {writeFileSync, unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {type CliOptions, startVitest} from 'vitest/node';
import {parseFunctionNameFromSignature} from './core/signature.ts';
import {type Problem, type Result} from './types.ts';

const TIMEOUT_MS = 5000;

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

const IDENTIFIER_PATTERN = /^[a-z_$][\w$]*$/i;

const ensureIdentifier = (value: string, sourceLabel: string): string => {
	if (!IDENTIFIER_PATTERN.test(value)) {
		throw new TypeError(`Invalid function identifier from ${sourceLabel}: ${value}`);
	}

	return value;
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

const buildResultFromRunner = (problem: Problem, resultProgram: string, startedAtMs: number, runnerInstance: VitestRunLike): Result => {
	const executedFiles = runnerInstance.state.getFiles();
	if (executedFiles.length === 0) {
		return {
			problem: problem.name,
			category: problem.category,
			program: resultProgram,
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
			program: resultProgram,
			passed: false,
			error: getVitestFailureOutput(runnerInstance),
			duration_ms: Date.now() - startedAtMs,
		};
	}

	return {
		problem: problem.name,
		category: problem.category,
		program: resultProgram,
		passed: true,
		duration_ms: Date.now() - startedAtMs,
	};
};

/*
 * Assembles a self-contained TS file from the problem + generated code,
 * runs it with Vitest's Node API, and returns pass/fail.
 */
export const runProblem = async (problem: Problem, generatedCode: string, options: RunProblemOptions = {}): Promise<Result> => {
	const implementationEntry =
		problem.kind === 'direct-refactor' ? undefined : ensureIdentifier(parseFunctionNameFromSignature(problem.signature), 'problem signature');
	const refactorEntry = problem.kind === 'direct-refactor' ? ensureIdentifier(problem.entry, 'problem entry') : undefined;

	const implementFunctionSupport =
		problem.kind === 'direct-refactor'
			? []
			: [
					generatedCode,
					`const implementation = (() => {`,
					`	const extracted = typeof ${implementationEntry} !== 'undefined' ? ${implementationEntry} : undefined;`,
					`	if (typeof extracted === 'undefined') {`,
					`		throw new TypeError('Missing function in generated code: ${implementationEntry}');`,
					`	}`,
					`	if (typeof extracted !== 'function') {`,
					`		throw new TypeError('Generated symbol is not callable: ${implementationEntry}');`,
					`	}`,
					`	return extracted as ((...args: readonly unknown[]) => unknown);`,
					`})();`,
					`const code = {result: ${JSON.stringify(generatedCode)}};`,
					``,
				];

	const directRefactorSupport =
		problem.kind === 'direct-refactor'
			? [
					`import ts from 'typescript';`,
					``,
					`const input = ${JSON.stringify(problem.input)};`,
					`const result = ${JSON.stringify(generatedCode)};`,
					`const entry = ${JSON.stringify(refactorEntry)};`,
					``,
					`const evaluateRefactorFunction = (source: string, functionName: string): ((...args: readonly unknown[]) => unknown) => {`,
					`	const wrappedSource = [`,
					`		source,`,
					`		\`\`,`,
					`		\`module.exports = {__extracted: typeof \${functionName} !== 'undefined' ? \${functionName} : undefined};\`,`,
					`	].join('\\n');`,
					``,
					`	const transpiled = ts.transpileModule(wrappedSource, {`,
					`		compilerOptions: {`,
					`			target: ts.ScriptTarget.ES2022,`,
					`			module: ts.ModuleKind.CommonJS,`,
					`		},`,
					`	}).outputText;`,
					``,
					`	const moduleLike: {exports: Record<string, unknown>} = {exports: {}};`,
					`	const executeTranspiled = new Function('module', 'exports', transpiled) as (module: {exports: Record<string, unknown>}, exports: Record<string, unknown>) => void;`,
					`	executeTranspiled(moduleLike, moduleLike.exports);`,
					`	const extracted = moduleLike.exports.__extracted;`,
					``,
					`	if (typeof extracted === 'undefined') {`,
					`		throw new TypeError(\`Missing function in transformed code: \${functionName}\`);`,
					`	}`,
					``,
					`	if (typeof extracted !== 'function') {`,
					`		throw new TypeError(\`Transformed symbol is not callable: \${functionName}\`);`,
					`	}`,
					``,
					`	return extracted;`,
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
	const runVitest = options.startVitest ?? startVitest;
	let runnerInstance: VitestRunLike | undefined;

	try {
		const runVitestOnce = async (): Promise<VitestRunLike> => {
			const runner = await runVitest('test', [tmpFile], {
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

		runnerInstance = options.debug === true ? await runVitestOnce() : await withMutedOutput(runVitestOnce);

		return buildResultFromRunner(problem, generatedCode, start, runnerInstance);
	} catch (error) {
		const errorText = getErrorOutput(error);
		return {
			problem: problem.name,
			category: problem.category,
			program: generatedCode,
			passed: false,
			error: errorText,
			duration_ms: Date.now() - start,
		};
	} finally {
		if (runnerInstance) {
			try {
				await runnerInstance.close();
			} catch {
				/* ignore */
			}
		}

		try {
			unlinkSync(tmpFile);
		} catch {
			/* ignore */
		}
	}
};
