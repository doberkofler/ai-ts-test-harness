import {describe, expect, test, vi} from 'vitest';
import {DEFAULT_OLLAMA_URL} from './config.ts';
import {generate, type GenerateOptions} from './generate.ts';
import {type Problem} from './types.ts';

const problem: Problem = {
	name: 'sum',
	category: 'arithmetic',
	description: ['Add two integers'],
	signature: 'function sum(a: number, b: number): number',
	tests: ({assert}) => {
		assert.strictEqual(1, 1);
	},
};

const directRefactorProblem: Problem = {
	name: 'renameVariables',
	category: 'refactor',
	kind: 'direct-refactor',
	description: ['Rename weak local identifiers in provided code while preserving behavior.'],
	input: 'function rename(a: number): number { const tmp = a + 1; return tmp; }',
	entry: 'rename',
	tests: ({assert, code}) => {
		assert.match(code.result, /function rename/);
	},
};

const readLoggedOutput = (calls: readonly unknown[][]): string =>
	calls.map(([firstArg]) => (typeof firstArg === 'string' ? firstArg : String(firstArg))).join('\n');

describe('generate', () => {
	test('uses expected default ollama endpoint', () => {
		expect(DEFAULT_OLLAMA_URL).toBe('http://localhost:11434/v1');
	});

	test('strips markdown fences from model output', async () => {
		const result = await generate(problem, {
			model: 'test-model',
			createCompletion: async () => {
				const response = await Promise.resolve({
					choices: [{message: {content: '```ts\nreturn a + b;\n```'}}],
				});
				return response;
			},
		});

		expect(result).toBe('return a + b;');
	});

	test('logs request and response when debug is enabled', async () => {
		const logSpy = vi.spyOn(console, 'log');

		await generate(problem, {
			model: 'test-model',
			debug: true,
			createCompletion: async () => {
				const response = await Promise.resolve({
					choices: [{message: {content: 'return a + b;'}}],
				});
				return response;
			},
		});

		const output = readLoggedOutput(logSpy.mock.calls);
		expect(output).toContain('[debug] LLM request');
		expect(output).toContain('[debug] LLM response');
		logSpy.mockRestore();
	});

	test('logs model thinking when available in debug mode', async () => {
		const logSpy = vi.spyOn(console, 'log');

		await generate(problem, {
			model: 'test-model',
			debug: true,
			createCompletion: async () => {
				const response = await Promise.resolve({
					choices: [{message: {content: 'return a + b;', reasoning_content: 'I will add both inputs and return the result.'}}],
				});
				return response;
			},
		});

		const output = readLoggedOutput(logSpy.mock.calls);
		expect(output).toContain('[debug] LLM thinking');
		expect(output).toContain('I will add both inputs and return the result.');
		logSpy.mockRestore();
	});

	test('streams thinking and response line by line in debug mode', async () => {
		const logSpy = vi.spyOn(console, 'log');

		await generate(problem, {
			model: 'test-model',
			debug: true,
			async *createCompletionStream() {
				await Promise.resolve();
				yield {choices: [{delta: {reasoning_content: 'planning line 1\nplanning'}}]};
				yield {choices: [{delta: {reasoning_content: ' line 2\n'}}]};
				yield {choices: [{delta: {content: 'return a'}}]};
				yield {choices: [{delta: {content: ' + b;\nconst result = a + b;'}}]};
				yield {choices: [{delta: {content: '\nreturn result;'}}]};
			},
		});

		const output = readLoggedOutput(logSpy.mock.calls);
		expect(output).toContain('[debug] LLM thinking (stream)');
		expect(output).toContain('planning line 1');
		expect(output).toContain('planning line 2');
		expect(output).toContain('[debug] LLM response (stream)');
		expect(output).toContain('return a + b;');
		expect(output).toContain('const result = a + b;');
		expect(output).toContain('return result;');
		logSpy.mockRestore();
	});

	test('rejects invalid timeout values', async () => {
		await expect(
			generate(problem, {
				model: 'test-model',
				llmTimeoutSecs: 0,
				createCompletion: async () => {
					const response = await Promise.resolve({
						choices: [{message: {content: 'return a + b;'}}],
					});
					return response;
				},
			}),
		).rejects.toThrow('Invalid llm timeout: 0');
	});

	test('passes timeout to completion call', async () => {
		const createCompletion = vi.fn<() => Promise<{choices: {message: {content: string}}[]}>>(async () => {
			const response = await Promise.resolve({
				choices: [{message: {content: 'return a + b;'}}],
			});
			return response;
		});

		await generate(problem, {
			model: 'test-model',
			llmTimeoutSecs: 1234,
			createCompletion,
		});

		expect(createCompletion).toHaveBeenCalledWith(expect.objectContaining({model: 'test-model'}), {timeout: 1_234_000});
	});

	test('builds direct refactor prompt with input code', async () => {
		let capturedPrompt = '';
		const createCompletion: GenerateOptions['createCompletion'] = async (request) => {
			const [firstMessage] = request.messages;
			if (!firstMessage) {
				throw new Error('request should include one message');
			}

			capturedPrompt = firstMessage.content;
			const response = await Promise.resolve({
				choices: [{message: {content: 'function rename(value: number): number { const incrementedValue = value + 1; return incrementedValue; }'}}],
			});
			return response;
		};

		await generate(directRefactorProblem, {
			model: 'test-model',
			createCompletion,
		});

		expect(capturedPrompt).toContain('Input code:');
		expect(capturedPrompt).toContain(directRefactorProblem.input);
	});

	test('accepts single-string descriptions', async () => {
		let capturedPrompt = '';
		const createCompletion: GenerateOptions['createCompletion'] = async (request) => {
			const [firstMessage] = request.messages;
			if (!firstMessage) {
				throw new Error('request should include one message');
			}

			capturedPrompt = firstMessage.content;
			const response = await Promise.resolve({
				choices: [{message: {content: 'function sum(a: number, b: number): number { return a + b; }'}}],
			});
			return response;
		};

		await generate(
			{
				...problem,
				description: 'Add two integers',
			},
			{
				model: 'test-model',
				createCompletion,
			},
		);

		expect(capturedPrompt).toContain('Description:');
		expect(capturedPrompt).toContain('- Add two integers');
	});

	test('reports thinking and running phases while streaming', async () => {
		const phases: string[] = [];

		await generate(problem, {
			model: 'test-model',
			onPhaseChange: (phase) => {
				phases.push(phase);
			},
			async *createCompletionStream() {
				await Promise.resolve();
				yield {choices: [{delta: {reasoning_content: 'planning'}}]};
				yield {choices: [{delta: {content: 'return a + b;'}}]};
			},
			createCompletion: async () => {
				await Promise.resolve();
				throw new Error('completion fallback should not run when streaming succeeds');
			},
		});

		expect(phases).toEqual(['thinking', 'running']);
	});

	test('keeps thinking phase while streaming think tags until real response content appears', async () => {
		const phases: string[] = [];

		await generate(problem, {
			model: 'test-model',
			onPhaseChange: (phase) => {
				phases.push(phase);
			},
			async *createCompletionStream() {
				await Promise.resolve();
				yield {choices: [{delta: {content: '<think>planning'}}]};
				yield {choices: [{delta: {content: ' details</think>'}}]};
				yield {choices: [{delta: {content: 'return a + b;'}}]};
			},
			createCompletion: async () => {
				await Promise.resolve();
				throw new Error('completion fallback should not run when streaming succeeds');
			},
		});

		expect(phases).toEqual(['thinking', 'running']);
	});

	test('falls back to completion and still reports running phase', async () => {
		const phases: string[] = [];

		const result = await generate(problem, {
			model: 'test-model',
			onPhaseChange: (phase) => {
				phases.push(phase);
			},
			createCompletion: async () => {
				const response = await Promise.resolve({
					choices: [{message: {content: 'return a + b;'}}],
				});
				return response;
			},
			async *createCompletionStream() {
				await Promise.resolve();
				yield {choices: []};
				throw new Error('stream unsupported');
			},
		});

		expect(result).toBe('return a + b;');
		expect(phases).toEqual(['thinking', 'running']);
	});

	test('uses remaining timeout budget for fallback completion', async () => {
		const nowSpy = vi.spyOn(Date, 'now');
		let nowMs = 1000;
		nowSpy.mockImplementation(() => nowMs);
		const phases: string[] = [];

		let streamTimeoutArg = -1;
		const completionTimeoutArgs: number[] = [];

		const result = await generate(problem, {
			model: 'test-model',
			llmTimeoutSecs: 1,
			onPhaseChange: (phase) => {
				phases.push(phase);
			},
			createCompletion: async (_request, options) => {
				completionTimeoutArgs.push(options.timeout);
				const response = await Promise.resolve({
					choices: [{message: {content: 'return a + b;'}}],
				});
				return response;
			},
			async *createCompletionStream(_request, options) {
				streamTimeoutArg = options.timeout;
				yield {choices: []};
				nowMs = 1600;
				await Promise.resolve();
				throw new Error('stream unsupported by provider');
			},
		});

		expect(result).toBe('return a + b;');
		expect(streamTimeoutArg).toBe(1000);
		expect(completionTimeoutArgs).toEqual([400]);
		expect(phases).toEqual(['thinking', 'running']);
		nowSpy.mockRestore();
	});

	test('does not fallback when stream times out', async () => {
		const createCompletion = vi.fn<() => Promise<{choices: {message: {content: string}}[]}>>(async () => {
			const response = await Promise.resolve({
				choices: [{message: {content: 'return a + b;'}}],
			});
			return response;
		});
		const phases: string[] = [];

		await expect(
			generate(problem, {
				model: 'test-model',
				onPhaseChange: (phase) => {
					phases.push(phase);
				},
				createCompletion,
				async *createCompletionStream() {
					await Promise.resolve();
					yield {choices: []};
					throw new Error('Request timed out.');
				},
			}),
		).rejects.toThrow('Request timed out.');

		expect(createCompletion).not.toHaveBeenCalled();
		expect(phases).toContain('thinking');
	});

	test('reports transfer progress for streamed reasoning and content', async () => {
		const transferUpdates: {promptChars: number; responseChars: number}[] = [];

		await generate(problem, {
			model: 'test-model',
			onPhaseChange: () => {
				// no-op
			},
			onTransferProgress: (stats) => {
				transferUpdates.push(stats);
			},
			async *createCompletionStream() {
				await Promise.resolve();
				yield {choices: [{delta: {reasoning_content: 'abc'}}]};
				yield {choices: [{delta: {content: 'de'}}]};
			},
			createCompletion: async () => {
				await Promise.resolve();
				throw new Error('completion fallback should not run when streaming succeeds');
			},
		});

		expect(transferUpdates.length).toBeGreaterThanOrEqual(2);
		const [firstTransferUpdate] = transferUpdates;
		const lastTransferUpdate = transferUpdates.at(-1);
		if (typeof firstTransferUpdate === 'undefined' || typeof lastTransferUpdate === 'undefined') {
			throw new TypeError('expected transfer updates to be present');
		}
		expect(firstTransferUpdate.promptChars).toBeGreaterThan(0);
		expect(firstTransferUpdate.responseChars).toBe(0);
		expect(lastTransferUpdate).toMatchObject({promptChars: firstTransferUpdate.promptChars, responseChars: 5});
	});

	test('reports transfer progress for non-stream responses', async () => {
		const transferUpdates: {promptChars: number; responseChars: number}[] = [];

		await generate(problem, {
			model: 'test-model',
			onTransferProgress: (stats) => {
				transferUpdates.push(stats);
			},
			createCompletion: async () => {
				const response = await Promise.resolve({
					choices: [{message: {reasoning_content: 'abc', content: 'de'}}],
				});
				return response;
			},
		});

		expect(transferUpdates).toHaveLength(3);
		const [firstTransferUpdate, secondTransferUpdate] = transferUpdates;
		const finalTransferUpdate = transferUpdates.at(-1);
		if (typeof firstTransferUpdate === 'undefined' || typeof secondTransferUpdate === 'undefined' || typeof finalTransferUpdate === 'undefined') {
			throw new TypeError('expected transfer updates to be present');
		}
		expect(firstTransferUpdate.promptChars).toBeGreaterThan(0);
		expect(firstTransferUpdate.responseChars).toBe(0);
		expect(secondTransferUpdate).toMatchObject({promptChars: firstTransferUpdate.promptChars, responseChars: 3});
		expect(finalTransferUpdate).toMatchObject({promptChars: firstTransferUpdate.promptChars, responseChars: 5});
	});
});
