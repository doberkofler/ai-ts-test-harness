import {describe, expect, test} from 'vitest';
import {parseCategoryFilter} from './core/problem-selection.ts';
import {parseIntOption, parseOptionalNonEmptyOption, parseRequiredOption} from './core/parsing.ts';
import {summarizeResults} from './core/results-summary.ts';
import {parseFunctionNameFromSignature} from './core/signature.ts';
import {parseRunCommandOptions} from './run-options.ts';
import {type Result} from './types.ts';

const llmMetrics = (llmDurationMs: number): Result['llm_metrics'] => ({
	llm_duration_ms: llmDurationMs,
	tokens_sent: 0,
	tokens_received: 0,
	average_tokens_per_second: 0,
});

describe('parseIntOption', () => {
	test('parses valid integers', () => {
		expect(parseIntOption('120', {optionName: '--llm-timeout', minimum: 1})).toBe(120);
	});

	test('throws for values below minimum', () => {
		expect(() => parseIntOption('0', {optionName: '--llm-timeout', minimum: 1})).toThrow('Invalid --llm-timeout value: 0');
	});

	test('throws for non-numeric values', () => {
		expect(() => parseIntOption('abc', {optionName: '--llm-timeout', minimum: 1})).toThrow('Invalid --llm-timeout value: abc');
	});
});

describe('parseRequiredOption', () => {
	test('returns non-empty values', () => {
		expect(parseRequiredOption('results.json', '--output')).toBe('results.json');
	});

	test('throws for empty values', () => {
		expect(() => parseRequiredOption('', '--output')).toThrow('Invalid --output value: ');
	});
});

describe('parseOptionalNonEmptyOption', () => {
	test('accepts undefined', () => {
		expect(parseOptionalNonEmptyOption(undefined, '--api-key')).toBeUndefined();
	});

	test('returns non-empty optional value', () => {
		expect(parseOptionalNonEmptyOption('token', '--oauth-token')).toBe('token');
	});

	test('throws for empty optional value', () => {
		expect(() => parseOptionalNonEmptyOption('', '--api-key')).toThrow('Invalid --api-key value');
	});
});

describe('parseFunctionNameFromSignature', () => {
	test('extracts function names from signature strings', () => {
		expect(parseFunctionNameFromSignature('function sum(a: number, b: number): number')).toBe('sum');
	});

	test('throws when signature is invalid', () => {
		expect(() => parseFunctionNameFromSignature('const sum = (a: number, b: number): number => a + b;')).toThrow(
			'Unable to extract function name from signature',
		);
	});
});

describe('summarizeResults', () => {
	test('returns correct totals and pass rate', () => {
		const results: Result[] = [
			{problem: 'sum', category: 'arithmetic', program: 'return a + b;', passed: true, llm_metrics: llmMetrics(10)},
			{problem: 'max', category: 'arithmetic', program: 'return Math.max(a, b);', passed: false, llm_metrics: llmMetrics(11)},
			{problem: 'min', category: 'arithmetic', program: 'return Math.min(a, b);', passed: true, llm_metrics: llmMetrics(12)},
		];

		expect(summarizeResults(results)).toEqual({
			total: 3,
			passed: 2,
			failed: 1,
			passRatePercent: 67,
		});
	});

	test('handles empty result sets', () => {
		expect(summarizeResults([])).toEqual({
			total: 0,
			passed: 0,
			failed: 0,
			passRatePercent: 0,
		});
	});
});

describe('parseRunCommandOptions', () => {
	test('parses and validates run options', () => {
		expect(
			parseRunCommandOptions({
				model: 'test-model',
				debug: false,
				compress: false,
				overwriteResults: false,
				llmTimeoutSecs: '120',
				vitestTimeoutSecs: '60',
				cooldownTemp: '50',
				test: 'fizzbuzz',
				category: 'logic',
			}),
		).toEqual({
			model: 'test-model',
			debug: false,
			storeThinking: true,
			compress: false,
			overwriteResults: false,
			llmTimeoutSecs: 120,
			vitestTimeoutSecs: 60,
			cooldownTemp: 50,
			test: 'fizzbuzz',
			category: 'logic',
		});
	});

	test('throws for invalid timeout values', () => {
		expect(() =>
			parseRunCommandOptions({
				model: 'test-model',
				debug: false,
				compress: false,
				overwriteResults: false,
				llmTimeoutSecs: '0',
				vitestTimeoutSecs: '60',
				cooldownTemp: '50',
				test: undefined,
				category: undefined,
			}),
		).toThrow('Invalid --llm-timeout value: 0');
	});
});

describe('parseCategoryFilter', () => {
	test('normalizes and deduplicates categories', () => {
		expect(parseCategoryFilter('Logic, logic, Refactor')).toEqual(['logic', 'refactor']);
	});
});
