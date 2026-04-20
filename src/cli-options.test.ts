import {describe, expect, test} from 'vitest';
import {toReportCommandOptions, toRunCommandOptions, toValidateCommandOptions} from './command-options.ts';
import {normalizeCliOpts, type CliOpts} from './cli-options.ts';
import {DEFAULT_COOLDOWN_TEMP_THRESHOLD} from './config.ts';

describe('normalizeCliOpts', () => {
	test('maps commander option keys to internal option names', () => {
		const normalized = normalizeCliOpts({
			model: 'test-model',
			debug: true,
			compress: true,
			llmTimeout: '75',
			vitestTimeout: '90',
			cooldownTemp: String(DEFAULT_COOLDOWN_TEMP_THRESHOLD),
		});

		expect(normalized).toEqual({
			model: 'test-model',
			debug: true,
			storeThinking: true,
			compress: true,
			overwriteResults: false,
			llmTimeout: '75',
			vitestTimeout: '90',
			cooldownTemp: String(DEFAULT_COOLDOWN_TEMP_THRESHOLD),
			llmTimeoutSecs: '75',
			vitestTimeoutSecs: '90',
		});
	});

	test('returns undefined for invalid option shape', () => {
		expect(normalizeCliOpts({debug: true})).toBeUndefined();
	});
});

describe('command option mappers', () => {
	test('maps cli options for run/validate/report command handlers', () => {
		const opts: CliOpts = {
			model: 'model-a',
			debug: false,
			storeThinking: false,
			compress: true,
			overwriteResults: true,
			llmTimeoutSecs: '120',
			vitestTimeoutSecs: '60',
			cooldownTemp: '0',
			htmlOutput: 'results.html',
			test: 'fizzbuzz',
			category: 'logic',
		};

		expect(toRunCommandOptions(opts)).toEqual({
			model: 'model-a',
			debug: false,
			storeThinking: false,
			compress: true,
			overwriteResults: true,
			llmTimeoutSecs: '120',
			vitestTimeoutSecs: '60',
			cooldownTemp: '0',
			test: 'fizzbuzz',
			category: 'logic',
		});

		expect(toValidateCommandOptions(opts)).toEqual({
			test: 'fizzbuzz',
			category: 'logic',
			debug: false,
		});

		expect(toReportCommandOptions(opts)).toEqual({
			model: 'model-a',
			htmlOutput: 'results.html',
		});
	});
});
