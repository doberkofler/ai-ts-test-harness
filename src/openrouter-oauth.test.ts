import {describe, expect, test} from 'vitest';
import {buildOpenRouterAuthUrl, exchangeOpenRouterAuthCode} from './openrouter-oauth.ts';

const fetchError403Mock: typeof fetch = async () => {
	const response = await Promise.resolve(new Response('nope', {status: 403}));
	return response;
};

describe('openrouter-oauth', () => {
	test('builds auth URL with callback, challenge, and state', () => {
		const url = buildOpenRouterAuthUrl('http://127.0.0.1:3000/oauth/callback', 'challenge-123', 'state-xyz');
		const parsed = new URL(url);

		expect(parsed.origin).toBe('https://openrouter.ai');
		expect(parsed.pathname).toBe('/auth');
		expect(parsed.searchParams.get('callback_url')).toBe('http://127.0.0.1:3000/oauth/callback');
		expect(parsed.searchParams.get('code_challenge')).toBe('challenge-123');
		expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
		expect(parsed.searchParams.get('state')).toBe('state-xyz');
	});

	test('exchanges oauth code into API key', async () => {
		const fetchMock: typeof fetch = async (_input, init) => {
			const body = typeof init === 'object' && typeof init.body === 'string' ? init.body : '';
			expect(body).toContain('"code":"abc"');
			expect(body).toContain('"code_verifier":"verifier"');
			const response = await Promise.resolve(Response.json({key: 'or-key'}, {status: 200}));
			return response;
		};

		await expect(exchangeOpenRouterAuthCode('abc', 'verifier', fetchMock)).resolves.toBe('or-key');
	});

	test('throws when exchange response is not ok', async () => {
		await expect(exchangeOpenRouterAuthCode('abc', 'verifier', fetchError403Mock)).rejects.toThrow('OpenRouter OAuth exchange failed (403)');
	});
});
