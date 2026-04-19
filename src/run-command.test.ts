import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {parseResultsFile} from './report.ts';
import {type Problem, type Result} from './types.ts';
import {formatResultsFile} from './results-file.ts';

const llmMetrics = (llmDurationMs: number): Result['llm_metrics'] => ({
	llm_duration_ms: llmDurationMs,
	tokens_sent: 0,
	tokens_received: 0,
	average_tokens_per_second: 0,
});

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

const {createRerunFailedContext, runCommand, runCommandWithContext} = await import('./run.ts');

const makeProblem = (name: string, category: string): Problem => ({
	name,
	category,
	description: 'test',
	files: [],
	tests: [],
});

describe('runCommand', () => {
	let tempDir = '';
	let originalCwd = '';
	let originalHome = '';

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'run-command-'));
		originalCwd = process.cwd();
		originalHome = process.env['HOME'] ?? '';
		process.env['HOME'] = tempDir;
		process.chdir(tempDir);
		mkdirSync(join(tempDir, '.ai-ts-test-harness'), {recursive: true});
		writeFileSync(
			join(tempDir, '.ai-ts-test-harness', 'auth.json'),
			`${JSON.stringify(
				{
					version: 1,
					defaultConnectionId: 'ollama:ollama',
					connections: [
						{
							id: 'ollama:ollama',
							name: 'ollama',
							provider: 'ollama',
							baseUrl: 'http://localhost:11434/v1',
							authType: 'none',
							createdAt: '2026-01-01T00:00:00.000Z',
							updatedAt: '2026-01-01T00:00:00.000Z',
						},
					],
				},
				undefined,
				2,
			)}\n`,
			'utf8',
		);
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
		process.chdir(originalCwd);
		process.env['HOME'] = originalHome;
		if (tempDir.length > 0) {
			rmSync(tempDir, {recursive: true, force: true});
		}
	});

	test('loads, filters, executes, and writes output payload', async () => {
		loadProblemsMock.mockReturnValue([makeProblem('fizzbuzz', 'logic'), makeProblem('add', 'arithmetic')]);
		executeProblemsMock.mockResolvedValue([{problem: 'fizzbuzz', category: 'logic', program: 'code', passed: true, llm_metrics: llmMetrics(5)}]);

		const output = join(tempDir, 'results', 'test-model.json');
		const runResult = await runCommand({
			model: 'test-model',
			debug: false,
			compress: false,
			overwriteResults: false,
			llmTimeoutSecs: '90',
			vitestTimeoutSecs: '60',
			noCooldown: false,
			test: undefined,
			category: 'logic',
		});

		expect(executeProblemsMock).toHaveBeenCalledWith(
			[expect.objectContaining({name: 'fizzbuzz', category: 'logic'})],
			expect.objectContaining({llmTimeoutSecs: 90, vitestTimeoutSecs: 60, noCooldown: false, storeThinking: true}),
			expect.objectContaining({initialResults: []}),
		);
		expect(runResult.config.llmTimeoutSecs).toBe(90);
		expect(runResult.config).toMatchObject({noCooldown: false});
		expect(runResult.config.selectedCategories).toEqual(['logic']);
		expect(runResult.outputPath.endsWith('/results/test-model.json')).toBe(true);

		const content = parseResultsFile(readFileSync(output, 'utf8'));
		expect(content.results).toEqual([expect.objectContaining({problem: 'fizzbuzz', passed: true})]);
	});

	test('does not persist thinking in output when storeThinking is disabled', async () => {
		loadProblemsMock.mockReturnValue([makeProblem('fizzbuzz', 'logic')]);
		executeProblemsMock.mockResolvedValue([
			{problem: 'fizzbuzz', category: 'logic', program: 'code', thinking: 'internal chain', passed: true, llm_metrics: llmMetrics(5)},
		]);

		const output = join(tempDir, 'results', 'test-model.json');
		await runCommand({
			model: 'test-model',
			debug: false,
			compress: false,
			overwriteResults: false,
			storeThinking: false,
			llmTimeoutSecs: '90',
			vitestTimeoutSecs: '60',
			noCooldown: false,
			test: undefined,
			category: 'logic',
		});

		expect(executeProblemsMock).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({storeThinking: false}), expect.any(Object));
		const content = parseResultsFile(readFileSync(output, 'utf8'));
		expect(content.results).toEqual([{problem: 'fizzbuzz', category: 'logic', program: 'code', passed: true, llm_metrics: llmMetrics(5)}]);
	});

	test('throws on invalid numeric input before execution', async () => {
		await expect(
			runCommand({
				model: 'test-model',
				debug: false,
				compress: false,
				overwriteResults: false,
				llmTimeoutSecs: '0',
				vitestTimeoutSecs: '60',
				noCooldown: false,
				test: undefined,
				category: undefined,
			}),
		).rejects.toThrow('Invalid --llm-timeout value: 0');

		expect(loadProblemsMock).not.toHaveBeenCalled();
		expect(executeProblemsMock).not.toHaveBeenCalled();
	});

	test('writes compressed JSON when compression is enabled', async () => {
		loadProblemsMock.mockReturnValue([makeProblem('fizzbuzz', 'logic')]);
		executeProblemsMock.mockResolvedValue([{problem: 'fizzbuzz', category: 'logic', program: 'code', passed: true, llm_metrics: llmMetrics(5)}]);

		const runResult = await runCommand({
			model: 'test-model',
			debug: true,
			compress: true,
			overwriteResults: false,
			llmTimeoutSecs: '90',
			vitestTimeoutSecs: '60',
			noCooldown: false,
			test: undefined,
			category: 'logic',
		});

		expect(runResult.outputPath.endsWith('/results/test-model.json.gz')).toBe(true);
		const uncompressed = gunzipSync(readFileSync(runResult.outputPath)).toString('utf8');
		const content = parseResultsFile(uncompressed);
		expect(content.results).toEqual([expect.objectContaining({problem: 'fizzbuzz', passed: true})]);
	});

	test('resumes from matching open json for same model', async () => {
		loadProblemsMock.mockReturnValue([makeProblem('fizzbuzz', 'logic'), makeProblem('add', 'logic')]);

		const openPath = join(tempDir, 'results', 'test-model.json');
		mkdirSync(join(tempDir, 'results'), {recursive: true});
		const resumedPayload = formatResultsFile([{problem: 'fizzbuzz', category: 'logic', program: 'code', passed: true, llm_metrics: llmMetrics(5)}], {
			model: 'test-model',
			debug: false,
			compress: true,
			llmTimeoutSecs: 90,
			vitestTimeoutSecs: 60,
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
			{problem: 'fizzbuzz', category: 'logic', program: 'code', passed: true, llm_metrics: llmMetrics(5)},
			{problem: 'add', category: 'logic', program: 'code2', passed: true, llm_metrics: llmMetrics(6)},
		]);

		const runResult = await runCommand({
			model: 'test-model',
			debug: false,
			compress: true,
			overwriteResults: false,
			llmTimeoutSecs: '90',
			vitestTimeoutSecs: '60',
			noCooldown: false,
			test: undefined,
			category: 'logic',
		});

		expect(executeProblemsMock).toHaveBeenCalledWith(
			expect.arrayContaining([expect.objectContaining({name: 'add', category: 'logic'})]),
			expect.any(Object),
			expect.objectContaining({
				initialResults: [expect.objectContaining({problem: 'fizzbuzz'})],
			}),
		);
		expect(runResult.outputPath.endsWith('/results/test-model.json.gz')).toBe(true);
	});

	test('throws before starting a fresh run when output file already exists', async () => {
		loadProblemsMock.mockReturnValue([makeProblem('fizzbuzz', 'logic')]);

		const openPath = join(tempDir, 'results', 'test-model.json');
		mkdirSync(join(tempDir, 'results'), {recursive: true});
		const mismatchedPayload = formatResultsFile([{problem: 'other', category: 'logic', program: 'code', passed: true, llm_metrics: llmMetrics(5)}], {
			model: 'test-model',
			debug: false,
			compress: false,
			llmTimeoutSecs: 90,
			vitestTimeoutSecs: 60,
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
		await expect(
			runCommand({
				model: 'test-model',
				debug: false,
				compress: false,
				overwriteResults: false,
				llmTimeoutSecs: '90',
				vitestTimeoutSecs: '60',
				noCooldown: false,
				test: undefined,
				category: 'logic',
			}),
		).rejects.toThrow('Refusing to overwrite existing results file');
		expect(executeProblemsMock).not.toHaveBeenCalled();
	});

	test('allows a fresh run when overwrite flag is enabled', async () => {
		loadProblemsMock.mockReturnValue([makeProblem('fizzbuzz', 'logic')]);

		const openPath = join(tempDir, 'results', 'test-model.json');
		mkdirSync(join(tempDir, 'results'), {recursive: true});
		const mismatchedPayload = formatResultsFile([{problem: 'other', category: 'logic', program: 'code', passed: true, llm_metrics: llmMetrics(5)}], {
			model: 'test-model',
			debug: false,
			compress: false,
			llmTimeoutSecs: 90,
			vitestTimeoutSecs: 60,
			ollamaUrl: 'http://localhost:11434/v1',
		});
		writeFileSync(openPath, `${JSON.stringify(mismatchedPayload, undefined, 2)}\n`, 'utf8');
		executeProblemsMock.mockResolvedValue([{problem: 'fizzbuzz', category: 'logic', program: 'code', passed: true, llm_metrics: llmMetrics(5)}]);

		await runCommand({
			model: 'test-model',
			debug: false,
			compress: false,
			overwriteResults: true,
			llmTimeoutSecs: '90',
			vitestTimeoutSecs: '60',
			noCooldown: false,
			test: undefined,
			category: 'logic',
		});

		expect(executeProblemsMock).toHaveBeenCalled();
	});

	test('creates rerun-failed context with only previously failed problems', () => {
		loadProblemsMock.mockReturnValue([makeProblem('fizzbuzz', 'logic'), makeProblem('add', 'logic')]);
		const previousPayload = formatResultsFile(
			[
				{problem: 'fizzbuzz', category: 'logic', program: 'code', passed: false, error: 'boom', llm_metrics: llmMetrics(5)},
				{problem: 'add', category: 'logic', program: 'code', passed: true, llm_metrics: llmMetrics(6)},
			],
			{
				model: 'test-model',
				debug: false,
				compress: false,
				llmTimeoutSecs: 90,
				vitestTimeoutSecs: 60,
				noCooldown: false,
				ollamaUrl: 'http://localhost:11434/v1',
			},
		);
		mkdirSync(join(tempDir, 'results'), {recursive: true});
		writeFileSync(join(tempDir, 'results', 'test-model.json'), `${JSON.stringify(previousPayload, undefined, 2)}\n`, 'utf8');

		const context = createRerunFailedContext({
			model: 'test-model',
			debug: false,
			compress: false,
			overwriteResults: false,
			llmTimeoutSecs: '90',
			vitestTimeoutSecs: '60',
			noCooldown: false,
			test: undefined,
			category: 'logic',
		});

		expect(context.problems.map((problem) => problem.name)).toEqual(['fizzbuzz']);
	});

	test('rerun-failed keeps previous passing results and replaces rerun failures', async () => {
		loadProblemsMock.mockReturnValue([makeProblem('fizzbuzz', 'logic'), makeProblem('add', 'logic')]);
		const previousPayload = formatResultsFile(
			[
				{problem: 'fizzbuzz', category: 'logic', program: 'old-code', passed: false, error: 'boom', llm_metrics: llmMetrics(5)},
				{problem: 'add', category: 'logic', program: 'stable-code', passed: true, llm_metrics: llmMetrics(6)},
			],
			{
				model: 'test-model',
				debug: false,
				compress: false,
				llmTimeoutSecs: 90,
				vitestTimeoutSecs: 60,
				noCooldown: false,
				ollamaUrl: 'http://localhost:11434/v1',
			},
		);
		mkdirSync(join(tempDir, 'results'), {recursive: true});
		const outputPath = join(tempDir, 'results', 'test-model.json');
		writeFileSync(outputPath, `${JSON.stringify(previousPayload, undefined, 2)}\n`, 'utf8');

		executeProblemsMock.mockResolvedValue([
			{problem: 'add', category: 'logic', program: 'stable-code', passed: true, llm_metrics: llmMetrics(6)},
			{problem: 'fizzbuzz', category: 'logic', program: 'new-code', passed: true, llm_metrics: llmMetrics(7)},
		]);

		const context = createRerunFailedContext({
			model: 'test-model',
			debug: false,
			compress: false,
			overwriteResults: false,
			llmTimeoutSecs: '90',
			vitestTimeoutSecs: '60',
			noCooldown: false,
			test: undefined,
			category: 'logic',
		});

		await runCommandWithContext(context);

		expect(executeProblemsMock).toHaveBeenCalledWith(
			expect.any(Array),
			expect.any(Object),
			expect.objectContaining({
				initialResults: [expect.objectContaining({problem: 'add'})],
			}),
		);

		const content = parseResultsFile(readFileSync(outputPath, 'utf8'));
		expect(content.results).toEqual([
			expect.objectContaining({problem: 'add', program: 'stable-code', passed: true}),
			expect.objectContaining({problem: 'fizzbuzz', program: 'new-code', passed: true}),
		]);
	});
});
