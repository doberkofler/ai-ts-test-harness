import {describe, expect, test} from 'vitest';
import {formatResultsFile, parseCategoryFilter, selectProblems, selectProblemsByFilters} from './run.ts';
import {formatResultsHtmlFile, parseResultsFile} from './report.ts';
import {type Problem, type Result} from './types.ts';

const problems: Problem[] = [
	{
		name: 'fizzbuzz',
		category: 'logic',
		description: ['Return fizzbuzz values'],
		signature: 'function fizzbuzz(n: number): string[]',
		tests: ({assert}) => {
			assert.strictEqual(1, 1);
		},
	},
	{
		name: 'renameVariables',
		category: 'refactor',
		kind: 'direct-refactor',
		description: ['Rename short variables'],
		input: 'function f(x:number){return x}',
		entry: 'f',
		tests: ({assert}) => {
			assert.strictEqual(1, 1);
		},
	},
];

describe('formatResultsFile', () => {
	test('includes summary and runtime config in payload', () => {
		const results: Result[] = [
			{problem: 'sum', category: 'arithmetic', program: 'return a + b;', passed: true, duration_ms: 10},
			{problem: 'max', category: 'arithmetic', program: 'return Math.max(a, b);', passed: false, error: 'boom', duration_ms: 12},
		];

		const output = formatResultsFile(results, {
			model: 'test-model',
			ollamaUrl: 'http://localhost:11434/v1',
			llmTimeoutSecs: 5,
			cooldownPeriodSecs: 10,
			debug: true,
		});

		expect(output.model).toBe('test-model');
		expect(output.ollama_url).toBe('http://localhost:11434/v1');
		expect(output.llm_timeout_secs).toBe(5);
		expect(output.cooldown_period_secs).toBe(10);
		expect(output.debug).toBe(true);
		expect(output.selected_categories).toBeUndefined();
		expect(output.total).toBe(2);
		expect(output.passed).toBe(1);
		expect(output.failed).toBe(1);
		expect(output.pass_rate_percent).toBe(50);
		expect(output.results).toEqual(results);
		expect(Date.parse(output.generated_at)).not.toBeNaN();
	});

	test('returns 0 percent pass rate for empty results', () => {
		const output = formatResultsFile([], {
			model: 'test-model',
			ollamaUrl: 'http://localhost:11434/v1',
			llmTimeoutSecs: 5,
			debug: false,
		});

		expect(output.total).toBe(0);
		expect(output.pass_rate_percent).toBe(0);
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
		expect(html).toContain('Generated Program:');
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
