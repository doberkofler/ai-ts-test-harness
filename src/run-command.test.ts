import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {parseResultsFile} from './report.ts';
import {type Problem, type Result} from './types.ts';
import {formatResultsFile} from './results-file.ts';

const loadProblemsMock = vi.fn<() => Problem[]>();
const executeProblemsMock = vi.fn<() => Promise<Result[]>>();
const getSystemInfoMock = vi.fn<() => Promise<{hostname: string; os: string; cpu: string; ram_gb: number; gpu: string}>>();

vi.mock(import('./load-problems.ts'), () => ({
	loadProblems: loadProblemsMock,
}));

vi.mock(import('./run-execution.ts'), () => ({
	executeProblems: executeProblemsMock,
}));

vi.mock(import('./system-info.ts'), () => ({
	getSystemInfo: getSystemInfoMock,
}));

const {runCommand} = await import('./run.ts');

const makeProblem = (name: string, category: string): Problem => ({
	name,
	category,
	description: ['test'],
	signature: `function ${name}(input: number): number`,
	tests: ({assert}): void => {
		assert.strictEqual(true, true);
	},
});

describe('runCommand', () => {
	let tempDir = '';

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'run-command-'));
		loadProblemsMock.mockReset();
		executeProblemsMock.mockReset();
		getSystemInfoMock.mockReset();
		getSystemInfoMock.mockResolvedValue({
			hostname: 'host-a',
			os: 'darwin 24.0.0 (arm64)',
			cpu: 'CPU',
			ram_gb: 64,
			gpu: 'GPU',
		});
	});

	afterEach(() => {
		if (tempDir.length > 0) {
			rmSync(tempDir, {recursive: true, force: true});
		}
	});

	test('loads, filters, executes, and writes output payload', async () => {
		loadProblemsMock.mockReturnValue([makeProblem('fizzbuzz', 'logic'), makeProblem('add', 'arithmetic')]);
		executeProblemsMock.mockResolvedValue([{problem: 'fizzbuzz', category: 'logic', program: 'code', passed: true, duration_ms: 5}]);

		const output = join(tempDir, 'results.json');
		const runResult = await runCommand({
			model: 'test-model',
			debug: false,
			llmTimeoutSecs: '90',
			noCooldown: false,
			ollamaUrl: 'http://localhost:11434/v1',
			output,
			test: undefined,
			category: 'logic',
		});

		expect(executeProblemsMock).toHaveBeenCalledWith(
			[expect.objectContaining({name: 'fizzbuzz', category: 'logic'})],
			expect.objectContaining({llmTimeoutSecs: 90, noCooldown: false, storeThinking: true}),
			expect.objectContaining({initialResults: []}),
		);
		expect(runResult.config.llmTimeoutSecs).toBe(90);
		expect(runResult.config).toMatchObject({noCooldown: false});
		expect(runResult.config.selectedCategories).toEqual(['logic']);

		const content = parseResultsFile(readFileSync(output, 'utf8'));
		expect(content.results).toEqual([expect.objectContaining({problem: 'fizzbuzz', passed: true})]);
	});

	test('does not persist thinking in output when storeThinking is disabled', async () => {
		loadProblemsMock.mockReturnValue([makeProblem('fizzbuzz', 'logic')]);
		executeProblemsMock.mockResolvedValue([
			{problem: 'fizzbuzz', category: 'logic', program: 'code', thinking: 'internal chain', passed: true, duration_ms: 5},
		]);

		const output = join(tempDir, 'results.json');
		await runCommand({
			model: 'test-model',
			debug: false,
			storeThinking: false,
			llmTimeoutSecs: '90',
			noCooldown: false,
			ollamaUrl: 'http://localhost:11434/v1',
			output,
			test: undefined,
			category: 'logic',
		});

		expect(executeProblemsMock).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({storeThinking: false}), expect.any(Object));
		const content = parseResultsFile(readFileSync(output, 'utf8'));
		expect(content.results).toEqual([{problem: 'fizzbuzz', category: 'logic', program: 'code', passed: true, duration_ms: 5}]);
	});

	test('throws on invalid numeric input before execution', async () => {
		await expect(
			runCommand({
				model: 'test-model',
				debug: false,
				llmTimeoutSecs: '0',
				noCooldown: false,
				ollamaUrl: 'http://localhost:11434/v1',
				output: join(tempDir, 'results.json'),
				test: undefined,
				category: undefined,
			}),
		).rejects.toThrow('Invalid --llm-timeout value: 0');

		expect(loadProblemsMock).not.toHaveBeenCalled();
		expect(executeProblemsMock).not.toHaveBeenCalled();
	});

	test('writes compressed JSON when output is a directory', async () => {
		loadProblemsMock.mockReturnValue([makeProblem('fizzbuzz', 'logic')]);
		executeProblemsMock.mockResolvedValue([{problem: 'fizzbuzz', category: 'logic', program: 'code', passed: true, duration_ms: 5}]);

		const runResult = await runCommand({
			model: 'test-model',
			debug: true,
			llmTimeoutSecs: '90',
			noCooldown: false,
			ollamaUrl: 'http://localhost:11434/v1',
			output: tempDir,
			test: undefined,
			category: 'logic',
		});

		expect(runResult.outputPath.endsWith('.json.gz')).toBe(true);
		const uncompressed = gunzipSync(readFileSync(runResult.outputPath)).toString('utf8');
		const content = parseResultsFile(uncompressed);
		expect(content.results).toEqual([expect.objectContaining({problem: 'fizzbuzz', passed: true})]);
	});

	test('resumes from matching open json in output directory', async () => {
		loadProblemsMock.mockReturnValue([makeProblem('fizzbuzz', 'logic'), makeProblem('add', 'logic')]);

		const openPath = join(tempDir, 'run_20260101-000000_test-model.json');
		const resumedPayload = formatResultsFile([{problem: 'fizzbuzz', category: 'logic', program: 'code', passed: true, duration_ms: 5}], {
			model: 'test-model',
			debug: false,
			llmTimeoutSecs: 90,
			noCooldown: false,
			ollamaUrl: 'http://localhost:11434/v1',
			selectedCategories: ['logic'],
			systemInfo: {
				hostname: 'host-a',
				os: 'darwin 24.0.0 (arm64)',
				cpu: 'CPU',
				ram_gb: 64,
				gpu: 'GPU',
			},
		});
		writeFileSync(openPath, `${JSON.stringify(resumedPayload, undefined, 2)}\n`, 'utf8');

		executeProblemsMock.mockResolvedValue([
			{problem: 'fizzbuzz', category: 'logic', program: 'code', passed: true, duration_ms: 5},
			{problem: 'add', category: 'logic', program: 'code2', passed: true, duration_ms: 6},
		]);

		const runResult = await runCommand({
			model: 'test-model',
			debug: false,
			llmTimeoutSecs: '90',
			noCooldown: false,
			ollamaUrl: 'http://localhost:11434/v1',
			output: tempDir,
			test: undefined,
			category: 'logic',
		});

		expect(executeProblemsMock).toHaveBeenCalledWith(
			expect.any(Array),
			expect.any(Object),
			expect.objectContaining({
				initialResults: [expect.objectContaining({problem: 'fizzbuzz'})],
			}),
		);
		expect(runResult.outputPath).toBe(`${openPath}.gz`);
	});

	test('logs fresh run reason when open run does not match scope', async () => {
		loadProblemsMock.mockReturnValue([makeProblem('fizzbuzz', 'logic')]);

		const openPath = join(tempDir, 'run_20260101-000000_test-model.json');
		const mismatchedPayload = formatResultsFile([{problem: 'other', category: 'logic', program: 'code', passed: true, duration_ms: 5}], {
			model: 'test-model',
			debug: false,
			llmTimeoutSecs: 90,
			ollamaUrl: 'http://localhost:11434/v1',
			systemInfo: {
				hostname: 'host-a',
				os: 'darwin 24.0.0 (arm64)',
				cpu: 'CPU',
				ram_gb: 64,
				gpu: 'GPU',
			},
		});
		writeFileSync(openPath, `${JSON.stringify(mismatchedPayload, undefined, 2)}\n`, 'utf8');
		executeProblemsMock.mockResolvedValue([{problem: 'fizzbuzz', category: 'logic', program: 'code', passed: true, duration_ms: 5}]);

		let loggedLines = 0;
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
			loggedLines += 1;
		});
		await runCommand({
			model: 'test-model',
			debug: false,
			llmTimeoutSecs: '90',
			noCooldown: false,
			ollamaUrl: 'http://localhost:11434/v1',
			output: tempDir,
			test: undefined,
			category: 'logic',
		});

		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Starting fresh run'));
		expect(loggedLines).toBeGreaterThan(0);
		logSpy.mockRestore();
	});
});
