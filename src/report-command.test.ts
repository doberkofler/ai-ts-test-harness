import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {formatResultsFile} from './run.ts';
import {deriveHtmlOutputPath, printSummary, reportCommand, writeResultsHtmlFile} from './report.ts';
import {type Result, type RuntimeConfig} from './types.ts';

const llmMetrics = (llmDurationMs: number): Result['llm_metrics'] => ({
	llm_duration_ms: llmDurationMs,
	tokens_sent: 0,
	tokens_received: 0,
	average_tokens_per_second: 0,
});

const runtimeConfig: RuntimeConfig = {
	model: 'test-model',
	debug: false,
	llmTimeoutSecs: 60,
	vitestTimeoutSecs: 60,
	noCooldown: false,
	ollamaUrl: 'http://localhost:11434/v1',
};

const sampleResults: Result[] = [
	{problem: 'sum', category: 'arithmetic', program: 'return a + b;', passed: true, llm_metrics: llmMetrics(10)},
	{problem: 'max', category: 'arithmetic', program: 'return Math.max(a, b);', passed: false, error: 'first line\nsecond line', llm_metrics: llmMetrics(12)},
];

describe('report helpers', () => {
	let tempDir = '';
	let originalCwd = '';

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'report-command-'));
		originalCwd = process.cwd();
		process.chdir(tempDir);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		if (tempDir.length > 0) {
			rmSync(tempDir, {recursive: true, force: true});
		}
	});

	test('derives html output path from json path', () => {
		const jsonPath = join(tempDir, 'nested', 'results.json');
		expect(deriveHtmlOutputPath(jsonPath)).toBe(join(tempDir, 'nested', 'results.html'));
	});

	test('derives html output path from compressed json path', () => {
		const jsonPath = join(tempDir, 'nested', 'results.json.gz');
		expect(deriveHtmlOutputPath(jsonPath)).toBe(join(tempDir, 'nested', 'results.html'));
	});

	test('writes html report to derived path when html output is omitted', () => {
		const jsonPath = join(tempDir, 'results.json');
		const htmlPath = writeResultsHtmlFile(sampleResults, jsonPath, undefined, runtimeConfig);

		expect(htmlPath).toBe(join(tempDir, 'results.html'));
		expect(existsSync(htmlPath)).toBe(true);
		expect(readFileSync(htmlPath, 'utf8')).toContain('<title>AI Test Harness Results</title>');
	});

	test('runs report command from json and writes html file', () => {
		const payload = formatResultsFile(sampleResults, runtimeConfig);
		const jsonPath = join(tempDir, 'results', 'test-model.json');
		mkdirSync(join(tempDir, 'results'), {recursive: true});
		const customHtmlPath = join(tempDir, 'custom-report.html');
		writeFileSync(jsonPath, `${JSON.stringify(payload, undefined, 2)}\n`, 'utf8');

		let loggedLines = 0;
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
			loggedLines += 1;
		});

		reportCommand({model: 'test-model', htmlOutput: customHtmlPath});

		expect(existsSync(customHtmlPath)).toBe(true);
		expect(loggedLines).toBeGreaterThan(0);
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Saved HTML report to file://'));
		logSpy.mockRestore();
	});

	test('runs report command from compressed json and writes html file', () => {
		const payload = formatResultsFile(sampleResults, runtimeConfig);
		const jsonPath = join(tempDir, 'results', 'test-model.json.gz');
		mkdirSync(join(tempDir, 'results'), {recursive: true});
		const customHtmlPath = join(tempDir, 'compressed-report.html');
		writeFileSync(jsonPath, gzipSync(`${JSON.stringify(payload, undefined, 2)}\n`));

		let loggedLines = 0;
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
			loggedLines += 1;
		});

		reportCommand({model: 'test-model', htmlOutput: customHtmlPath});

		expect(existsSync(customHtmlPath)).toBe(true);
		expect(loggedLines).toBeGreaterThan(0);
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Saved HTML report to file://'));
		logSpy.mockRestore();
	});

	test('rebuilds all reports and writes comparison report', () => {
		const firstPayload = formatResultsFile(sampleResults, {
			...runtimeConfig,
			model: 'model-a',
			selectedCategories: ['arithmetic'],
		});
		const secondPayload = formatResultsFile([{problem: 'sum', category: 'arithmetic', program: 'return a + b;', passed: true, llm_metrics: llmMetrics(30)}], {
			...runtimeConfig,
			model: 'model-b',
		});

		const resultsDir = join(tempDir, 'results');
		mkdirSync(resultsDir, {recursive: true});
		writeFileSync(join(resultsDir, 'model-a.json'), `${JSON.stringify(firstPayload, undefined, 2)}\n`, 'utf8');
		writeFileSync(join(resultsDir, 'model-b.json.gz'), gzipSync(`${JSON.stringify(secondPayload, undefined, 2)}\n`));

		let loggedLines = 0;
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
			loggedLines += 1;
		});

		reportCommand({model: 'unused-default', htmlOutput: undefined, allModels: true});

		expect(loggedLines).toBeGreaterThan(0);
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Rebuilt 2 HTML reports in'));
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Saved HTML index to file://'));
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Saved HTML comparison to file://'));

		expect(existsSync(join(resultsDir, 'model-a.html'))).toBe(true);
		expect(existsSync(join(resultsDir, 'model-b.html'))).toBe(true);
		expect(existsSync(join(resultsDir, 'index.html'))).toBe(true);
		expect(existsSync(join(resultsDir, 'comparison.html'))).toBe(true);

		const indexHtml = readFileSync(join(resultsDir, 'index.html'), 'utf8');
		expect(indexHtml).toContain('Open model comparison');

		const comparisonHtml = readFileSync(join(resultsDir, 'comparison.html'), 'utf8');
		expect(comparisonHtml).toContain('<title>AI Test Harness Model Comparison</title>');
		expect(comparisonHtml).toContain('Pass Rate');
		expect(comparisonHtml).toContain('model-a');
		expect(comparisonHtml).toContain('model-b');
		expect(comparisonHtml).toContain('different scopes');

		logSpy.mockRestore();
	});

	test('rebuilds all reports when model is set to all', () => {
		const firstPayload = formatResultsFile(sampleResults, {
			...runtimeConfig,
			model: 'model-a',
		});
		const secondPayload = formatResultsFile([{problem: 'sum', category: 'arithmetic', program: 'return a + b;', passed: true, llm_metrics: llmMetrics(18)}], {
			...runtimeConfig,
			model: 'model-b',
		});

		const resultsDir = join(tempDir, 'results');
		mkdirSync(resultsDir, {recursive: true});
		writeFileSync(join(resultsDir, 'model-a.json'), `${JSON.stringify(firstPayload, undefined, 2)}\n`, 'utf8');
		writeFileSync(join(resultsDir, 'model-b.json'), `${JSON.stringify(secondPayload, undefined, 2)}\n`, 'utf8');

		const logSpy = vi.spyOn(console, 'log').mockImplementation((line?: unknown) => {
			if (line === '__never__') {
				throw new TypeError('Unexpected log marker');
			}
		});

		reportCommand({model: 'all', htmlOutput: undefined});

		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Rebuilt 2 HTML reports in'));
		logSpy.mockRestore();
	});

	test('throws when html output is set for multi-model report generation', () => {
		const firstPayload = formatResultsFile(sampleResults, {
			...runtimeConfig,
			model: 'model-a',
		});
		const secondPayload = formatResultsFile([{problem: 'sum', category: 'arithmetic', program: 'return a + b;', passed: true, llm_metrics: llmMetrics(18)}], {
			...runtimeConfig,
			model: 'model-b',
		});

		const resultsDir = join(tempDir, 'results');
		mkdirSync(resultsDir, {recursive: true});
		writeFileSync(join(resultsDir, 'model-a.json'), `${JSON.stringify(firstPayload, undefined, 2)}\n`, 'utf8');
		writeFileSync(join(resultsDir, 'model-b.json'), `${JSON.stringify(secondPayload, undefined, 2)}\n`, 'utf8');

		expect(() => {
			reportCommand({model: 'all', htmlOutput: join(tempDir, 'combined.html')});
		}).toThrow('--html-output can only be used when a single .json/.json.gz file is selected');
	});

	test('picks latest result file per model when rebuilding all reports', () => {
		const oldPayload = formatResultsFile(
			[{problem: 'sum', category: 'arithmetic', program: 'return a + b;', passed: false, error: 'old run', llm_metrics: llmMetrics(10)}],
			{
				...runtimeConfig,
				model: 'model-a',
			},
		);
		const newPayload = formatResultsFile([{problem: 'sum', category: 'arithmetic', program: 'return a + b;', passed: true, llm_metrics: llmMetrics(11)}], {
			...runtimeConfig,
			model: 'model-a',
		});
		const secondModelPayload = formatResultsFile(
			[{problem: 'sum', category: 'arithmetic', program: 'return a + b;', passed: true, llm_metrics: llmMetrics(12)}],
			{
				...runtimeConfig,
				model: 'model-b',
			},
		);

		const resultsDir = join(tempDir, 'results');
		mkdirSync(resultsDir, {recursive: true});
		const oldPath = join(resultsDir, 'model-a.json');
		const newPath = join(resultsDir, 'model-a.json.gz');
		writeFileSync(oldPath, `${JSON.stringify(oldPayload, undefined, 2)}\n`, 'utf8');
		writeFileSync(newPath, gzipSync(`${JSON.stringify(newPayload, undefined, 2)}\n`));
		writeFileSync(join(resultsDir, 'model-b.json'), `${JSON.stringify(secondModelPayload, undefined, 2)}\n`, 'utf8');

		const oldDate = new Date('2024-01-01T00:00:00.000Z');
		const newDate = new Date('2024-01-01T00:00:10.000Z');
		utimesSync(oldPath, oldDate, oldDate);
		utimesSync(newPath, newDate, newDate);

		const logSpy = vi.spyOn(console, 'log').mockImplementation((line?: unknown) => {
			if (line === '__never__') {
				throw new TypeError('Unexpected log marker');
			}
		});

		reportCommand({model: 'all', htmlOutput: undefined});

		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Rebuilt 2 HTML reports in'));
		const modelAHtml = readFileSync(join(resultsDir, 'model-a.html'), 'utf8');
		expect(modelAHtml).toContain('PASS');
		expect(modelAHtml).not.toContain('old run');
		logSpy.mockRestore();
	});

	test('prints only the first line of failed error output in summary', () => {
		let capturedOutput = '';
		const logSpy = vi.spyOn(console, 'log').mockImplementation((line?: unknown) => {
			capturedOutput += `${String(line)}\n`;
		});

		printSummary(sampleResults);

		expect(capturedOutput).toContain('first line');
		expect(capturedOutput).not.toContain('second line');
		logSpy.mockRestore();
	});
});
