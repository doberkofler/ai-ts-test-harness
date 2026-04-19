import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
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
