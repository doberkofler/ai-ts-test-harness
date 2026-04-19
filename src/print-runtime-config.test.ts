import {describe, expect, test, vi} from 'vitest';
import {printRuntimeConfig} from './print-runtime-config.ts';
import {type Problem} from './types.ts';

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
			debug: true,
			llmTimeoutSecs: 60,
			vitestTimeoutSecs: 60,
			noCooldown: false,
			ollamaUrl: 'http://localhost:11434/v1',
			apiKey: 'secret',
			selectedCategories: ['logic'],
		});

		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('AI Test Harness'));
		expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/^Auth:\s+api-key$/));
		expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/^Cooldown:\s+50% task duration \(min 10s, max 1m\)$/));
		expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/^Thinking:\s+stored$/));
		expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/^Categories:\s+logic$/));
		expect(loggedLines).toBeGreaterThan(0);
		logSpy.mockRestore();
	});
});
