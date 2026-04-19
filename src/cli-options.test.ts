import {describe, expect, test} from 'vitest';
import {toReportCommandOptions, toRunCommandOptions, toValidateCommandOptions} from './command-options.ts';
import {normalizeCliOpts, type CliOpts} from './cli-options.ts';

describe('normalizeCliOpts', () => {
	test('maps commander option keys to internal option names', () => {
		const normalized = normalizeCliOpts({
			model: 'test-model',
			debug: true,
			llmTimeout: '75',
			vitestTimeout: '90',
			cooldown: true,
			ollamaUrl: 'http://localhost:11434/v1',
			output: 'results.json',
		});

		expect(normalized).toEqual({
			model: 'test-model',
			debug: true,
			storeThinking: true,
			llmTimeout: '75',
			vitestTimeout: '90',
			cooldown: true,
			llmTimeoutSecs: '75',
			vitestTimeoutSecs: '90',
			noCooldown: false,
			ollamaUrl: 'http://localhost:11434/v1',
			output: 'results.json',
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
			llmTimeoutSecs: '120',
			vitestTimeoutSecs: '60',
			noCooldown: true,
			ollamaUrl: 'http://localhost:11434/v1',
			apiKey: 'secret',
			output: 'results.json',
			htmlOutput: 'results.html',
			test: 'fizzbuzz',
			category: 'logic',
		};

		expect(toRunCommandOptions(opts)).toEqual({
			model: 'model-a',
			debug: false,
			storeThinking: false,
			llmTimeoutSecs: '120',
			vitestTimeoutSecs: '60',
			noCooldown: true,
			ollamaUrl: 'http://localhost:11434/v1',
			apiKey: 'secret',
			output: 'results.json',
			test: 'fizzbuzz',
			category: 'logic',
		});

		expect(toValidateCommandOptions(opts)).toEqual({
			test: 'fizzbuzz',
			category: 'logic',
			debug: false,
		});

		expect(toReportCommandOptions(opts)).toEqual({
			output: 'results.json',
			htmlOutput: 'results.html',
		});
	});
});
