import {describe, expect, test, vi} from 'vitest';
import {printRuntimeConfig} from './print-runtime-config.ts';
import {type Problem} from './types.ts';
import {DEFAULT_COOLDOWN_TEMP_THRESHOLD} from './config.ts';

const makeProblem = (name: string, category = 'logic'): Problem => ({
	name,
	category,
	description: 'test problem',
	files: [],
	tests: [],
});

describe('printRuntimeConfig', () => {
	test('prints runtime summary with category filter and auth mode', () => {
		let loggedLines = 0;
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
			loggedLines += 1;
		});

		printRuntimeConfig([makeProblem('one')], {
			model: 'model-a',
			provider: 'openai',
			connection: 'openai',
			authType: 'api-key',
			debug: true,
			llmTimeoutSecs: 60,
			vitestTimeoutSecs: 60,
			cooldownTempThreshold: DEFAULT_COOLDOWN_TEMP_THRESHOLD,
			ollamaUrl: 'http://localhost:11434/v1',
			selectedCategories: ['logic'],
		});

		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('AI Test Harness'));
		expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/^Auth:\s+api-key$/));
		expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/^Cooldown:\s+55°C$/));
		expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/^Thinking:\s+stored$/));
		expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/^Results file:\s+model-a\.json$/));
		expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/^Categories:\s+logic$/));
		expect(loggedLines).toBeGreaterThan(0);
		logSpy.mockRestore();
	});
});
