import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {parseResultsFile} from './report.ts';
import {type Problem, type Result} from './types.ts';

const loadProblemsMock = vi.fn<() => Problem[]>();
const executeProblemsMock = vi.fn<() => Promise<Result[]>>();

vi.mock(import('./load-problems.ts'), () => ({
	loadProblems: loadProblemsMock,
}));

vi.mock(import('./run-execution.ts'), () => ({
	executeProblems: executeProblemsMock,
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
});
