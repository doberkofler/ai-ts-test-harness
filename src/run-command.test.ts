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
			cooldownPeriodSecs: '1',
			ollamaUrl: 'http://localhost:11434/v1',
			output,
			test: undefined,
			category: 'logic',
		});

		expect(executeProblemsMock).toHaveBeenCalledWith(
			[expect.objectContaining({name: 'fizzbuzz', category: 'logic'})],
			expect.objectContaining({llmTimeoutSecs: 90, cooldownPeriodSecs: 1}),
			expect.objectContaining({initialResults: []}),
		);
		expect(runResult.config.llmTimeoutSecs).toBe(90);
		expect(runResult.config.cooldownPeriodSecs).toBe(1);
		expect(runResult.config.selectedCategories).toEqual(['logic']);

		const content = parseResultsFile(readFileSync(output, 'utf8'));
		expect(content.total).toBe(1);
		expect(content.passed).toBe(1);
		expect(content.failed).toBe(0);
		expect(content.pass_rate_percent).toBe(100);
	});

	test('throws on invalid numeric input before execution', async () => {
		await expect(
			runCommand({
				model: 'test-model',
				debug: false,
				llmTimeoutSecs: '0',
				cooldownPeriodSecs: '1',
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
			debug: false,
			llmTimeoutSecs: '90',
			cooldownPeriodSecs: '1',
			ollamaUrl: 'http://localhost:11434/v1',
			output: tempDir,
			test: undefined,
			category: 'logic',
		});

		expect(runResult.outputPath.endsWith('.json.gz')).toBe(true);
		const uncompressed = gunzipSync(readFileSync(runResult.outputPath)).toString('utf8');
		const content = parseResultsFile(uncompressed);
		expect(content.total).toBe(1);
		expect(content.passed).toBe(1);
	});

	test('resumes from matching open json in output directory', async () => {
		loadProblemsMock.mockReturnValue([makeProblem('fizzbuzz', 'logic'), makeProblem('add', 'logic')]);

		const openPath = join(tempDir, 'run_20260101-000000_test-model.json');
		const resumedPayload = formatResultsFile([{problem: 'fizzbuzz', category: 'logic', program: 'code', passed: true, duration_ms: 5}], {
			model: 'test-model',
			debug: false,
			llmTimeoutSecs: 90,
			cooldownPeriodSecs: 1,
			ollamaUrl: 'http://localhost:11434/v1',
			selectedCategories: ['logic'],
			plannedProblemNames: ['fizzbuzz', 'add'],
			systemInfo: {
				hostname: 'host-a',
				os: 'darwin 24.0.0 (arm64)',
				cpu: 'CPU',
				ram_gb: 64,
				gpu: 'GPU',
			},
		});
		resumedPayload.total = 2;
		resumedPayload.passed = 1;
		resumedPayload.failed = 1;
		resumedPayload.pass_rate_percent = 50;
		writeFileSync(openPath, `${JSON.stringify(resumedPayload, undefined, 2)}\n`, 'utf8');

		executeProblemsMock.mockResolvedValue([
			{problem: 'fizzbuzz', category: 'logic', program: 'code', passed: true, duration_ms: 5},
			{problem: 'add', category: 'logic', program: 'code2', passed: true, duration_ms: 6},
		]);

		const runResult = await runCommand({
			model: 'test-model',
			debug: false,
			llmTimeoutSecs: '90',
			cooldownPeriodSecs: '1',
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
});
