import {describe, expect, test} from 'vitest';
import {runProblem} from './runner.ts';
import {type ChangedFilesArtifact, type Problem} from './types.ts';

const problem: Problem = {
	name: 'sum-case',
	category: 'arithmetic',
	description: 'Add two numbers',
	timeout_ms: 5000,
	files: [{path: 'src/sum.ts', content: 'export const sum = (a: number, b: number): number => 0;\n'}],
	tests: [
		{
			path: 'tests/sum.test.ts',
			content:
				"import {describe, expect, test} from 'vitest';\nimport {sum} from '../src/sum.js';\n\ndescribe('sum', () => {\n\ttest('adds values', () => {\n\t\texpect(sum(1, 2)).toBe(3);\n\t});\n});\n",
		},
	],
};

const artifact: ChangedFilesArtifact = {
	kind: 'changed-files-v1',
	files: [{path: 'src/sum.ts', content: 'export const sum = (a: number, b: number): number => a + b;\n'}],
};

const createVitestMock = (options: {
	files?: {result?: {errors?: unknown[]}}[];
	unhandledErrors?: unknown[];
	failedFilepaths?: string[];
	failedTests?: number;
}): {
	state: {
		getCountOfFailedTests: () => number;
		getUnhandledErrors: () => unknown[];
		getFailedFilepaths: () => string[];
		getFiles: () => {result?: {errors?: unknown[]}}[];
	};
	close: () => Promise<void>;
} => ({
	state: {
		getCountOfFailedTests: (): number => options.failedTests ?? 0,
		getUnhandledErrors: (): unknown[] => options.unhandledErrors ?? [],
		getFailedFilepaths: (): string[] => options.failedFilepaths ?? [],
		getFiles: (): {result?: {errors?: unknown[]}}[] => options.files ?? [{}],
	},
	close: async (): Promise<void> => {
		await Promise.resolve();
	},
});

describe('runProblem', () => {
	test('runs changed-file artifacts through vitest', async () => {
		const result = await runProblem(problem, artifact, {
			startVitest: async (mode, filters, vitestOptions) => {
				expect(mode).toBe('test');
				const filterCount = Array.isArray(filters) ? filters.length : 0;
				expect(filterCount).toBe(1);
				expect(vitestOptions).toMatchObject({testTimeout: 5000, root: expect.any(String)});
				await Promise.resolve();
				return createVitestMock({});
			},
		});

		expect(result.passed).toBe(true);
		expect(result.artifact).toEqual(artifact);
	});

	test('uses vitest failure output when task errors exist', async () => {
		const result = await runProblem(problem, artifact, {
			startVitest: async () => {
				await Promise.resolve();
				return createVitestMock({files: [{result: {errors: [new Error('AssertionError: expected 3')]}}], unhandledErrors: []});
			},
		});

		expect(result.passed).toBe(false);
		expect(result.error).toContain('AssertionError: expected 3');
	});

	test('fails when vitest executes no files', async () => {
		const result = await runProblem(problem, artifact, {
			startVitest: async () => {
				await Promise.resolve();
				return createVitestMock({files: []});
			},
		});

		expect(result.passed).toBe(false);
		expect(result.error).toBe('No tests were executed by Vitest');
	});

	test('falls back to thrown error message', async () => {
		const result = await runProblem(problem, artifact, {
			startVitest: async () => {
				await Promise.resolve();
				throw new Error('runner crashed');
			},
		});

		expect(result.passed).toBe(false);
		expect(result.error).toBe('runner crashed');
	});
});
