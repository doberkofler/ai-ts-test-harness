import {existsSync, readFileSync} from 'node:fs';
import {describe, expect, test} from 'vitest';
import {runProblem} from './runner.ts';
import {type Problem} from './types.ts';

const problem: Problem = {
	name: 'sum-case',
	category: 'arithmetic',
	description: ['Add two numbers'],
	signature: 'function sum(a: number, b: number): number',
	tests: `assert.strictEqual(sum(1, 2), 3);`,
};

const directRefactorProblem: Problem = {
	name: 'rename-case',
	category: 'refactor',
	kind: 'direct-refactor',
	description: ['Rename local identifiers in provided TypeScript code.'],
	input: 'function rename(a: number): number { const tmp = a + 1; return tmp; }',
	entry: 'rename',
	tests: `
		assert.match(result, /function rename/);
		assert.doesNotMatch(result, /\btmp\b/);
	`,
};

const functionTestsProblem: Problem = {
	name: 'sum-function-tests',
	category: 'arithmetic',
	description: ['Add two numbers'],
	signature: 'function sum(a: number, b: number): number',
	tests: ({assert, implementation}) => {
		const callable = implementation;
		if (typeof callable !== 'function') {
			throw new TypeError('expected implementation to be callable');
		}

		if (Reflect.apply(callable, undefined, [2, 3]) !== 5) {
			assert.fail('expected sum(2, 3) to equal 5');
		}
	},
};

const createVitestMock = (
	state: {
		getCountOfFailedTests: () => number;
		getUnhandledErrors: () => unknown[];
		getFailedFilepaths: () => string[];
		getFiles: () => {result?: {errors?: unknown[]}}[];
	},
	onClose?: () => void,
): {
	state: {
		getCountOfFailedTests: () => number;
		getUnhandledErrors: () => unknown[];
		getFailedFilepaths: () => string[];
		getFiles: () => {result?: {errors?: unknown[]}}[];
	};
	close: () => Promise<void>;
} => ({
	state,
	close: async (): Promise<void> => {
		if (onClose) {
			onClose();
		}
		await Promise.resolve();
	},
});

const getWriteMethod = (stream: NodeJS.WriteStream): unknown => {
	const descriptor = Object.getOwnPropertyDescriptor(stream, 'write');
	if (typeof descriptor === 'undefined' || !('value' in descriptor)) {
		throw new TypeError('missing write descriptor');
	}

	return descriptor.value;
};

describe('runProblem', () => {
	test('runs generated code through vitest', async () => {
		let generatedPath = '';
		let closed = false;

		const result = await runProblem(problem, 'function sum(a: number, b: number): number { return a + b; }', {
			startVitest: async (mode, filters, vitestOptions) => {
				await Promise.resolve();
				expect(mode).toBe('test');
				expect(vitestOptions).toMatchObject({
					run: true,
					watch: false,
					silent: true,
					color: false,
					testTimeout: 5000,
					reporters: ['dot'],
				});

				const [maybePath] = filters ?? [];
				if (typeof maybePath !== 'string') {
					throw new TypeError('missing temp test path');
				}
				generatedPath = maybePath;

				const content = readFileSync(generatedPath, 'utf8');
				expect(content).toContain("import {describe, test} from 'vitest';");
				expect(content).toContain("import assert from 'node:assert';");
				expect(content).toContain('assert.strictEqual(sum(1, 2), 3);');

				return createVitestMock(
					{
						getCountOfFailedTests: () => 0,
						getUnhandledErrors: () => [],
						getFailedFilepaths: () => [],
						getFiles: () => [{}],
					},
					() => {
						closed = true;
					},
				);
			},
		});

		expect(result.passed).toBe(true);
		expect(result.error).toBeUndefined();
		expect(generatedPath).not.toBe('');
		expect(closed).toBe(true);
		expect(existsSync(generatedPath)).not.toBe(true);
	});

	test('uses vitest state for failure output when available', async () => {
		const result = await runProblem(problem, 'function sum(a: number, b: number): number { return a + b; }', {
			startVitest: async () => {
				await Promise.resolve();
				return createVitestMock({
					getCountOfFailedTests: () => 1,
					getUnhandledErrors: () => [new Error('AssertionError: expected 3')],
					getFailedFilepaths: () => ['sum-case.test.ts'],
					getFiles: () => [{result: {errors: [new Error('AssertionError: expected 3')]}}],
				});
			},
		});

		expect(result.passed).not.toBe(true);
		expect(result.error).toContain('AssertionError: expected 3');
	});

	test('mutes stdout and stderr during vitest run by default', async () => {
		const originalStdoutWrite = getWriteMethod(process.stdout);
		const originalStderrWrite = getWriteMethod(process.stderr);
		let writesMutedDuringRun = false;

		const result = await runProblem(problem, 'function sum(a: number, b: number): number { return a + b; }', {
			startVitest: async () => {
				await Promise.resolve();
				const currentStdoutWrite = getWriteMethod(process.stdout);
				const currentStderrWrite = getWriteMethod(process.stderr);
				writesMutedDuringRun = currentStdoutWrite !== originalStdoutWrite && currentStderrWrite !== originalStderrWrite;
				return createVitestMock({
					getCountOfFailedTests: () => 0,
					getUnhandledErrors: () => [],
					getFailedFilepaths: () => [],
					getFiles: () => [{}],
				});
			},
		});

		expect(result.passed).toBe(true);
		expect(writesMutedDuringRun).toBe(true);
	});

	test('does not mute stdout and stderr in debug mode', async () => {
		const originalStdoutWrite = getWriteMethod(process.stdout);
		const originalStderrWrite = getWriteMethod(process.stderr);
		let writesMutedDuringRun = false;

		const result = await runProblem(problem, 'function sum(a: number, b: number): number { return a + b; }', {
			debug: true,
			startVitest: async () => {
				await Promise.resolve();
				const currentStdoutWrite = getWriteMethod(process.stdout);
				const currentStderrWrite = getWriteMethod(process.stderr);
				writesMutedDuringRun = currentStdoutWrite !== originalStdoutWrite || currentStderrWrite !== originalStderrWrite;
				return createVitestMock({
					getCountOfFailedTests: () => 0,
					getUnhandledErrors: () => [],
					getFailedFilepaths: () => [],
					getFiles: () => [{}],
				});
			},
		});

		expect(result.passed).toBe(true);
		expect(writesMutedDuringRun).not.toBe(true);
	});

	test('fails when vitest did not execute any files', async () => {
		const result = await runProblem(problem, 'function sum(a: number, b: number): number { return a + b; }', {
			startVitest: async () => {
				await Promise.resolve();
				return createVitestMock({
					getCountOfFailedTests: () => 0,
					getUnhandledErrors: () => [],
					getFailedFilepaths: () => [],
					getFiles: () => [],
				});
			},
		});

		expect(result.passed).not.toBe(true);
		expect(result.error).toBe('No tests were executed by Vitest');
	});

	test('falls back to error message when no output streams are present', async () => {
		const result = await runProblem(problem, 'function sum(a: number, b: number): number { return a + b; }', {
			startVitest: async () => {
				await Promise.resolve();
				throw new Error('runner crashed');
			},
		});

		expect(result.passed).not.toBe(true);
		expect(result.error).toBe('runner crashed');
	});

	test('strips terminal control sequences from failure output', async () => {
		const result = await runProblem(problem, 'function sum(a: number, b: number): number { return a + b; }', {
			startVitest: async () => {
				await Promise.resolve();
				return createVitestMock({
					getCountOfFailedTests: () => 1,
					getUnhandledErrors: () => [
						{
							stderr: `${String.fromCodePoint(27)}[31mParse failed${String.fromCodePoint(27)}[0m\n[38;5;249mhelp text[0m`,
						},
					],
					getFailedFilepaths: () => ['sum-case.test.ts'],
					getFiles: () => [{}],
				});
			},
		});

		expect(result.passed).not.toBe(true);
		expect(result.error).toContain('Parse failed');
		expect(result.error).toContain('help text');
		expect(result.error).not.toContain('[31m');
		expect(result.error).not.toContain('[38;5;249m');
	});

	test('binds generated output to result for direct refactor problems', async () => {
		let generatedPath = '';

		const result = await runProblem(
			directRefactorProblem,
			'function rename(value: number): number { const incrementedValue = value + 1; return incrementedValue; }',
			{
				startVitest: async (mode, filters) => {
					await Promise.resolve();
					expect(mode).toBe('test');

					const [maybePath] = filters ?? [];
					if (typeof maybePath !== 'string') {
						throw new TypeError('missing temp test path');
					}
					generatedPath = maybePath;

					const content = readFileSync(generatedPath, 'utf8');
					expect(content).toContain('const result = ');
					expect(content).toContain('const input = ');
					expect(content).toContain("import vm from 'node:vm';");
					expect(content).toContain("import ts from 'typescript';");
					expect(content).toContain('const evaluateRefactorFunction = ');
					expect(content).toContain('assert.match(result, /function rename/);');

					return createVitestMock({
						getCountOfFailedTests: () => 0,
						getUnhandledErrors: () => [],
						getFailedFilepaths: () => [],
						getFiles: () => [{}],
					});
				},
			},
		);

		expect(result.passed).toBe(true);
		expect(result.error).toBeUndefined();
		expect(generatedPath).not.toBe('');
		expect(existsSync(generatedPath)).not.toBe(true);
	});

	test('supports function-based tests for implement problems', async () => {
		let generatedPath = '';

		const result = await runProblem(functionTestsProblem, 'function sum(a: number, b: number): number { return a + b; }', {
			startVitest: async (_mode, filters) => {
				await Promise.resolve();
				const [maybePath] = filters ?? [];
				if (typeof maybePath !== 'string') {
					throw new TypeError('missing temp test path');
				}
				generatedPath = maybePath;

				const content = readFileSync(generatedPath, 'utf8');
				expect(content).toContain('const implementation = evaluateFunction(generatedSource, implementationEntry);');
				expect(content).toContain('__problemTests({assert, implementation, code});');

				return createVitestMock({
					getCountOfFailedTests: () => 0,
					getUnhandledErrors: () => [],
					getFailedFilepaths: () => [],
					getFiles: () => [{}],
				});
			},
		});

		expect(result.passed).toBe(true);
		expect(existsSync(generatedPath)).not.toBe(true);
	});
});
