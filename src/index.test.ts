import {describe, expect, test} from 'vitest';
import {buildExecuteRunOptions, buildRuntimeConfig, formatResultsFile, parseCategoryFilter, selectProblems, selectProblemsByFilters} from './run.ts';
import {formatResultsHtmlFile, parseResultsFile} from './report.ts';
import {type Problem, type Result} from './types.ts';

const problems: Problem[] = [
	{
		name: 'fizzbuzz',
		category: 'logic',
		description: 'Return fizzbuzz values',
		timeout_ms: 5000,
		files: [],
		tests: [],
	},
	{
		name: 'renameVariables',
		category: 'refactor',
		description: 'Rename short variables',
		timeout_ms: 5000,
		files: [],
		tests: [],
	},
];

describe('formatResultsFile', () => {
	test('returns lean payload fields', () => {
		const results: Result[] = [
			{problem: 'sum', category: 'arithmetic', program: 'return a + b;', passed: true, duration_ms: 10},
			{problem: 'max', category: 'arithmetic', program: 'return Math.max(a, b);', passed: false, error: 'boom', duration_ms: 12},
		];

		const output = formatResultsFile(results, {
			model: 'test-model',
			ollamaUrl: 'http://localhost:11434/v1',
			llmTimeoutSecs: 5,
			noCooldown: false,
			debug: true,
		});

		expect(output.model).toBe('test-model');
		expect(output.ollama_url).toBe('http://localhost:11434/v1');
		expect(output.llm_timeout_secs).toBe(5);
		expect(output).not.toHaveProperty('selected_categories');
		expect(output).not.toHaveProperty('cooldown_period_secs');
		expect(output).not.toHaveProperty('debug');
		expect(output).not.toHaveProperty('system_info');
		expect(output.results).toEqual(results);
		expect(Date.parse(output.generated_at)).not.toBeNaN();
	});

	test('returns empty results for empty payload', () => {
		const output = formatResultsFile([], {
			model: 'test-model',
			ollamaUrl: 'http://localhost:11434/v1',
			llmTimeoutSecs: 5,
			debug: false,
		});

		expect(output.results).toEqual([]);
	});

	test('does not persist auth credentials into result payload', () => {
		const output = formatResultsFile([], {
			model: 'test-model',
			ollamaUrl: 'http://localhost:11434/v1',
			llmTimeoutSecs: 5,
			debug: false,
			apiKey: 'secret-key',
			oauthToken: 'secret-token',
		});

		expect(output).not.toHaveProperty('api_key');
		expect(output).not.toHaveProperty('oauth_token');
	});

	test('omits thinking from persisted results when disabled', () => {
		const output = formatResultsFile(
			[{problem: 'sum', category: 'arithmetic', program: 'return a + b;', thinking: 'chain of thought', passed: true, duration_ms: 10}],
			{
				model: 'test-model',
				ollamaUrl: 'http://localhost:11434/v1',
				llmTimeoutSecs: 5,
				debug: false,
				storeThinking: false,
			},
		);

		expect(output.results).toEqual([{problem: 'sum', category: 'arithmetic', program: 'return a + b;', passed: true, duration_ms: 10}]);
	});
});

describe('run context builders', () => {
	test('buildRuntimeConfig keeps selected categories and auth settings', () => {
		const config = buildRuntimeConfig(
			{
				model: 'test-model',
				debug: true,
				storeThinking: false,
				llmTimeoutSecs: 90,
				noCooldown: true,
				ollamaUrl: 'http://localhost:11434/v1',
				apiKey: 'secret',
				output: 'results.json',
				test: 'fizzbuzz',
				category: 'logic',
			},
			['logic'],
		);

		expect(config).toEqual({
			model: 'test-model',
			debug: true,
			storeThinking: false,
			llmTimeoutSecs: 90,
			noCooldown: true,
			ollamaUrl: 'http://localhost:11434/v1',
			apiKey: 'secret',
			selectedCategories: ['logic'],
		});
	});

	test('buildExecuteRunOptions contains only execution options', () => {
		const executeOptions = buildExecuteRunOptions({
			model: 'test-model',
			debug: false,
			storeThinking: false,
			llmTimeoutSecs: 90,
			noCooldown: false,
			ollamaUrl: 'http://localhost:11434/v1',
			oauthToken: 'oauth-token',
			output: 'results.json',
			test: undefined,
			category: undefined,
		});

		expect(executeOptions).toEqual({
			model: 'test-model',
			debug: false,
			storeThinking: false,
			llmTimeoutSecs: 90,
			noCooldown: false,
			ollamaUrl: 'http://localhost:11434/v1',
			oauthToken: 'oauth-token',
		});
	});
});

describe('formatResultsHtmlFile', () => {
	test('renders an interactive HTML report with summary and rows', () => {
		const results: Result[] = [
			{problem: 'sum', category: 'arithmetic', program: 'return a + b;', passed: true, duration_ms: 10},
			{problem: 'max', category: 'arithmetic', program: 'return Math.max(a, b);', passed: false, error: 'boom', duration_ms: 12},
		];

		const html = formatResultsHtmlFile(results, {
			model: 'test-model',
			ollamaUrl: 'http://localhost:11434/v1',
			llmTimeoutSecs: 5,
			debug: false,
		});

		expect(html).toContain('<title>AI Test Harness Results</title>');
		expect(html).toContain('const data = ');
		expect(html).toContain('Search by problem or category...');
		expect(html).toContain('Pass Rate');
		expect(html).toContain('test-model');
		expect(html).toContain('Category');
		expect(html).toContain('Details');
		expect(html).toContain('Show details');
		expect(html).toContain('data-toggle-key');
		expect(html).toContain('drilldown-row');
		expect(html).toContain('arithmetic');
		expect(html).toContain('sum');
		expect(html).toContain('max');
		expect(html).toContain('Generated Artifact:');
		expect(html).toContain('return a + b;');
	});
});

describe('parseResultsFile', () => {
	test('parses a valid results payload', () => {
		const payload = formatResultsFile([{problem: 'sum', category: 'arithmetic', program: 'return a + b;', passed: true, duration_ms: 10}], {
			model: 'test-model',
			ollamaUrl: 'http://localhost:11434/v1',
			llmTimeoutSecs: 5,
			debug: false,
		});

		expect(parseResultsFile(JSON.stringify(payload))).toEqual(payload);
	});

	test('throws for invalid results payload shape', () => {
		expect(() => parseResultsFile(JSON.stringify({generated_at: '2025-01-01T00:00:00.000Z'}))).toThrow();
	});
});

describe('parseCategoryFilter', () => {
	test('parses comma separated values', () => {
		expect(parseCategoryFilter('logic, refactor')).toEqual(['logic', 'refactor']);
	});

	test('deduplicates and normalizes values', () => {
		expect(parseCategoryFilter('Logic,logic')).toEqual(['logic']);
	});

	test('throws for blank values', () => {
		expect(() => parseCategoryFilter('  ')).toThrow('Invalid --category value');
	});

	test('throws for empty items', () => {
		expect(() => parseCategoryFilter('logic,')).toThrow('Invalid --category value');
	});
});

describe('selectProblems', () => {
	test('returns all problems when --test is not provided', () => {
		expect(selectProblems(problems)).toEqual(problems);
	});

	test('returns a single problem for an exact test name', () => {
		expect(selectProblems(problems, 'fizzbuzz')).toEqual([problems[0]]);
	});

	test('throws for unknown test names', () => {
		expect(() => selectProblems(problems, 'does-not-exist')).toThrow('Unknown --test value: does-not-exist');
	});

	test('throws for blank test value', () => {
		expect(() => selectProblems(problems, '   ')).toThrow('Invalid --test value:    ');
	});
});

describe('selectProblemsByFilters', () => {
	test('filters by category', () => {
		expect(selectProblemsByFilters(problems, undefined, ['refactor'])).toEqual([problems[1]]);
	});

	test('throws if no category matches', () => {
		expect(() => selectProblemsByFilters(problems, undefined, ['unknown'])).toThrow('No problems matched --category values: unknown');
	});
});
