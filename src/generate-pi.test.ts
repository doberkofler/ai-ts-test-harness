import {beforeEach, describe, expect, test, vi} from 'vitest';
import {type Problem} from './types.ts';

const streamSimpleMock = vi.fn<(model: unknown, context: unknown, options: unknown) => unknown>();

vi.mock(import('@mariozechner/pi-ai'), async (importOriginal) => {
	const original = await importOriginal();
	return {
		...original,
		streamSimple: ((model, context, options) => streamSimpleMock(model, context, options)) as typeof original.streamSimple,
	};
});

const problem: Problem = {
	name: 'sum',
	category: 'arithmetic',
	description: 'Add two integers',
	files: [],
	tests: [],
};

describe('generate with PI provider runtime', () => {
	beforeEach(() => {
		streamSimpleMock.mockReset();
	});

	test('uses PI stream path for openai-codex provider', async () => {
		streamSimpleMock.mockImplementation(async function* mockPiStream() {
			await Promise.resolve();
			yield {type: 'text_delta', delta: 'return a + b;', contentIndex: 0};
			yield {
				type: 'done',
				reason: 'stop',
				message: {
					role: 'assistant',
					content: [],
					api: 'openai-codex-responses',
					provider: 'openai-codex',
					model: 'gpt-5.3-codex',
					usage: {
						input: 0,
						output: 0,
						cacheRead: 0,
						cacheWrite: 0,
						totalTokens: 0,
						cost: {input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0},
					},
					stopReason: 'stop',
					timestamp: Date.now(),
				},
			};
		});

		const {generate} = await import('./generate.ts');
		const result = await generate(problem, {
			provider: 'openai-codex',
			model: 'gpt-5.3-codex',
			ollamaUrl: 'https://chatgpt.com/backend-api',
			oauthToken: 'oauth-token',
		});

		expect(result).toEqual({kind: 'changed-files-v1', files: [{path: 'solution.ts', content: 'return a + b;'}]});
		expect(streamSimpleMock).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({id: 'gpt-5.3-codex', provider: 'openai-codex', baseUrl: 'https://chatgpt.com/backend-api'}),
			expect.any(Object),
			expect.objectContaining({apiKey: 'oauth-token'}),
		);
	});
});
