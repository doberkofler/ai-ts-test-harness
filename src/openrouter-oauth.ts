import {spawn} from 'node:child_process';
import {createHash, randomBytes} from 'node:crypto';
import {once} from 'node:events';
import {createServer, type IncomingMessage, type ServerResponse} from 'node:http';
import {z} from 'zod';

export type OpenRouterOAuthResult = {
	apiKey: string;
};

const OPENROUTER_AUTH_URL = 'https://openrouter.ai/auth';
const OPENROUTER_AUTH_EXCHANGE_URL = 'https://openrouter.ai/api/v1/auth/keys';
const CALLBACK_PATH = '/oauth/callback';
const CALLBACK_HOST = '127.0.0.1';
const OAUTH_TIMEOUT_MS = 120_000;

const openRouterExchangeResponseSchema = z.object({
	key: z.string().min(1),
});

const toBase64Url = (value: Uint8Array): string => Buffer.from(value).toString('base64url');

const createPkceVerifier = (): string => toBase64Url(randomBytes(32));

const createPkceChallenge = (verifier: string): string => createHash('sha256').update(verifier, 'utf8').digest('base64url');

const createState = (): string => toBase64Url(randomBytes(16));

const sendHtmlResponse = (res: ServerResponse, statusCode: number, html: string): void => {
	res.statusCode = statusCode;
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	res.end(html);
};

export const buildOpenRouterAuthUrl = (callbackUrl: string, codeChallenge: string, state: string): string => {
	const authUrl = new URL(OPENROUTER_AUTH_URL);
	authUrl.searchParams.set('callback_url', callbackUrl);
	authUrl.searchParams.set('code_challenge', codeChallenge);
	authUrl.searchParams.set('code_challenge_method', 'S256');
	authUrl.searchParams.set('state', state);
	return authUrl.toString();
};

export const openBrowserUrl = (url: string): void => {
	const {platform} = process;
	const command = platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open';
	const args = platform === 'darwin' ? [url] : platform === 'win32' ? ['/c', 'start', '', url] : [url];
	const child = spawn(command, args, {stdio: 'ignore', detached: true});
	child.unref();
};

type OAuthCallbackWaiter = {
	handleRequest: (req: IncomingMessage, res: ServerResponse) => void;
	codePromise: Promise<string>;
	dispose: () => void;
};

const createOAuthCallbackWaiter = (expectedState: string, timeoutMs: number): OAuthCallbackWaiter => {
	const target = new EventTarget();
	let settled = false;
	const waitForCode = async (): Promise<string> => {
		const eventArgs: readonly unknown[] = await once(target, 'code');
		const [event] = eventArgs;
		if (event instanceof CustomEvent) {
			return String(event.detail);
		}
		throw new TypeError('Invalid OAuth callback event payload.');
	};
	const waitForError = async (): Promise<never> => {
		const eventArgs: readonly unknown[] = await once(target, 'error');
		const [event] = eventArgs;
		if (event instanceof CustomEvent) {
			throw event.detail;
		}
		throw new TypeError('Unknown OAuth callback error.');
	};
	const codePromise = Promise.race<string>([waitForCode(), waitForError()]);
	const timeoutHandle = setTimeout(() => {
		if (settled) {
			return;
		}
		settled = true;
		target.dispatchEvent(new CustomEvent('error', {detail: new TypeError('Timed out waiting for OAuth callback.')}));
	}, timeoutMs);

	const settle = (handler: () => void): void => {
		if (settled) {
			return;
		}
		settled = true;
		clearTimeout(timeoutHandle);
		handler();
	};

	const fail = (res: ServerResponse, message: string): void => {
		sendHtmlResponse(res, 400, `<h1>Login failed</h1><p>${message}</p><p>You can close this tab.</p>`);
		settle(() => {
			target.dispatchEvent(new CustomEvent('error', {detail: new TypeError(message)}));
		});
	};

	return {
		handleRequest: (req, res) => {
			const requestUrl = new URL(req.url ?? '/', `http://${CALLBACK_HOST}`);
			if (requestUrl.pathname !== CALLBACK_PATH) {
				sendHtmlResponse(res, 404, '<h1>Not found</h1>');
				return;
			}

			const state = requestUrl.searchParams.get('state');
			if (state !== expectedState) {
				fail(res, 'State mismatch while handling OAuth callback.');
				return;
			}

			const code = requestUrl.searchParams.get('code');
			if (typeof code !== 'string' || code.length === 0) {
				fail(res, 'Missing authorization code in OAuth callback.');
				return;
			}

			sendHtmlResponse(res, 200, '<h1>Login complete</h1><p>You can return to the terminal.</p>');
			settle(() => {
				target.dispatchEvent(new CustomEvent('code', {detail: code}));
			});
		},
		codePromise,
		dispose: () => {
			clearTimeout(timeoutHandle);
		},
	};
};

export const exchangeOpenRouterAuthCode = async (code: string, codeVerifier: string, fetchImpl: typeof fetch = fetch): Promise<string> => {
	const response = await fetchImpl(OPENROUTER_AUTH_EXCHANGE_URL, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
		},
		body: JSON.stringify({
			code,
			code_verifier: codeVerifier,
			code_challenge_method: 'S256',
		}),
	});

	if (!response.ok) {
		const bodyText = await response.text();
		throw new TypeError(`OpenRouter OAuth exchange failed (${response.status}): ${bodyText}`);
	}

	const payload = openRouterExchangeResponseSchema.parse(await response.json());
	return payload.key;
};

export const loginWithOpenRouterOAuth = async (): Promise<OpenRouterOAuthResult> => {
	const codeVerifier = createPkceVerifier();
	const codeChallenge = createPkceChallenge(codeVerifier);
	const state = createState();
	const callbackWaiter = createOAuthCallbackWaiter(state, OAUTH_TIMEOUT_MS);

	const server = createServer((req, res) => {
		callbackWaiter.handleRequest(req, res);
	});

	server.listen(0, CALLBACK_HOST);
	await Promise.race([
		once(server, 'listening'),
		once(server, 'error').then(([error]) => {
			throw error;
		}),
	]);

	const address = server.address();
	if (address === null || typeof address === 'string') {
		server.close();
		throw new TypeError('Failed to bind local OAuth callback server.');
	}

	const callbackUrl = `http://${CALLBACK_HOST}:${address.port}${CALLBACK_PATH}`;
	const authUrl = buildOpenRouterAuthUrl(callbackUrl, codeChallenge, state);

	console.log('Opening browser for OpenRouter login...');
	console.log(`If the browser does not open, use this URL:\n${authUrl}`);

	openBrowserUrl(authUrl);

	try {
		const code = await callbackWaiter.codePromise;
		const apiKey = await exchangeOpenRouterAuthCode(code, codeVerifier);
		return {apiKey};
	} finally {
		callbackWaiter.dispose();
		server.close();
		await once(server, 'close');
	}
};
