import {stdin as input, stdout as output} from 'node:process';
import {createInterface} from 'node:readline/promises';
import OpenAI from 'openai';
import {getModels as getPiModels, getProviders as getPiProviders, type KnownProvider} from '@mariozechner/pi-ai';
import {getOAuthProvider, loginOpenAICodex} from '@mariozechner/pi-ai/oauth';
import {getAuthConfigPath} from './config.ts';
import {loginWithOpenRouterOAuth, openBrowserUrl} from './openrouter-oauth.ts';
import {
	getDefaultConnection,
	loadAuthStore,
	removeConnection,
	saveAuthStore,
	setDefaultConnection,
	type StoredOAuthCredentials,
	type UpsertConnectionInput,
	upsertConnection,
} from './auth-store.ts';
import {getProviderById, getProviders, type ProviderDefinition, type ProviderId} from './provider-registry.ts';

type LoginOptions = {
	apiKey?: string;
	oauthToken?: string;
	oauth?: boolean;
	url?: string;
	name?: string;
	defaultModel?: string;
	setDefault?: boolean;
};

const createPrompt = (): ReturnType<typeof createInterface> => createInterface({input, output});
const knownPiProviders = new Set<KnownProvider>(getPiProviders());
const isKnownPiProvider = (provider: string): provider is KnownProvider => {
	for (const knownProvider of knownPiProviders) {
		if (knownProvider === provider) {
			return true;
		}
	}

	return false;
};

const isOAuthCapableProvider = (provider: ProviderDefinition): boolean => provider.auth === 'oauth' || provider.auth === 'oauth-or-api-key';

const pickProviderInteractively = async (options: {oauthOnly?: boolean} = {}): Promise<ProviderDefinition> => {
	if (!input.isTTY || !output.isTTY) {
		throw new TypeError('Provider is required in non-interactive mode. Example: `ai-ts-test-harness login ollama --url http://localhost:11434/v1`.');
	}

	const providers = options.oauthOnly === true ? getProviders().filter((provider) => isOAuthCapableProvider(provider)) : getProviders();
	if (providers.length === 0) {
		throw new TypeError('No OAuth-capable providers are configured.');
	}

	console.log(options.oauthOnly === true ? 'Available OAuth providers:' : 'Available providers:');
	for (const provider of providers) {
		console.log(`- ${provider.id} (${provider.name})`);
	}

	const prompt = createPrompt();
	try {
		const rawAnswer = await prompt.question('Provider: ');
		const answer = rawAnswer.trim().toLowerCase();
		const selected = getProviderById(answer);
		if (!selected) {
			throw new TypeError(`Unknown provider: ${answer}`);
		}
		return selected;
	} finally {
		prompt.close();
	}
};

const promptForSecret = async (message: string): Promise<string> => {
	if (!input.isTTY || !output.isTTY) {
		throw new TypeError('Missing required credential in non-interactive mode. Provide it with command-line options.');
	}

	const prompt = createPrompt();
	try {
		const rawAnswer = await prompt.question(message);
		const answer = rawAnswer.trim();
		if (!answer) {
			throw new TypeError('Credential must not be empty.');
		}
		return answer;
	} finally {
		prompt.close();
	}
};

const promptForAuthChoice = async (): Promise<'oauth' | 'api-key'> => {
	if (!input.isTTY || !output.isTTY) {
		throw new TypeError('Missing credentials in non-interactive mode. Provide --api-key, --oauth-token, or --oauth.');
	}

	const prompt = createPrompt();
	try {
		const rawAnswer = await prompt.question('Authentication method (oauth/api-key) [oauth]: ');
		const answer = rawAnswer.trim().toLowerCase();
		if (answer.length === 0 || answer === 'oauth') {
			return 'oauth';
		}
		if (answer === 'api-key') {
			return 'api-key';
		}

		throw new TypeError('Invalid auth method. Use "oauth" or "api-key".');
	} finally {
		prompt.close();
	}
};

const loginWithOpenAICodexOAuth = async (): Promise<StoredOAuthCredentials> => {
	const credentials = await loginOpenAICodex({
		onAuth: ({url, instructions}) => {
			console.log('Opening browser for OpenAI Codex login...');
			console.log(`If the browser does not open, use this URL:\n${url}`);
			if (typeof instructions === 'string' && instructions.length > 0) {
				console.log(instructions);
			}
			openBrowserUrl(url);
		},
		onPrompt: async (prompt) => {
			const secret = await promptForSecret(`${prompt.message} `);
			return secret;
		},
		onProgress: (message) => {
			console.log(message);
		},
	});

	return {
		...credentials,
	};
};

const loginWithPiOAuthProvider = async (providerId: string): Promise<StoredOAuthCredentials> => {
	const oauthProvider = getOAuthProvider(providerId);
	if (typeof oauthProvider === 'undefined') {
		throw new TypeError(`OAuth provider ${providerId} is not available.`);
	}

	const credentials = await oauthProvider.login({
		onAuth: ({url, instructions}) => {
			console.log(`Opening browser for ${oauthProvider.name} login...`);
			console.log(`If the browser does not open, use this URL:\n${url}`);
			if (typeof instructions === 'string' && instructions.length > 0) {
				console.log(instructions);
			}
			openBrowserUrl(url);
		},
		onPrompt: async (prompt) => {
			const secret = await promptForSecret(`${prompt.message} `);
			return secret;
		},
		onProgress: (message) => {
			console.log(message);
		},
	});

	return {
		...credentials,
	};
};

const buildConnectionInput = async (provider: ProviderDefinition, options: LoginOptions): Promise<UpsertConnectionInput> => {
	const baseUrl = typeof options.url === 'string' && options.url.trim().length > 0 ? options.url.trim() : provider.defaultBaseUrl;
	const name = typeof options.name === 'string' && options.name.trim().length > 0 ? options.name.trim() : provider.id;

	if (provider.auth === 'none') {
		return {
			provider: provider.id,
			name,
			baseUrl,
			authType: 'none',
			...(typeof options.defaultModel === 'string' && options.defaultModel.trim().length > 0 ? {defaultModel: options.defaultModel.trim()} : {}),
		};
	}

	if (provider.auth === 'api-key' && options.oauth === true) {
		if (provider.id === 'openai') {
			throw new TypeError(
				'OpenAI subscription OAuth uses `openai-codex`. Run `ai-ts-test-harness login openai-codex --oauth`, or use `ai-ts-test-harness login openai --api-key` for API keys.',
			);
		}
		throw new TypeError(`Provider ${provider.id} does not support OAuth login.`);
	}

	if (provider.auth === 'oauth') {
		if (provider.id === 'openai-codex') {
			const oauthCredentials = await loginWithOpenAICodexOAuth();
			return {
				provider: provider.id,
				name,
				baseUrl,
				authType: 'oauth-credentials',
				oauthProvider: 'openai-codex',
				oauthCredentials,
				...(typeof options.defaultModel === 'string' && options.defaultModel.trim().length > 0 ? {defaultModel: options.defaultModel.trim()} : {}),
			};
		}

		const oauthCredentials = await loginWithPiOAuthProvider(provider.id);
		return {
			provider: provider.id,
			name,
			baseUrl,
			authType: 'oauth-credentials',
			oauthProvider: provider.id,
			oauthCredentials,
			...(typeof options.defaultModel === 'string' && options.defaultModel.trim().length > 0 ? {defaultModel: options.defaultModel.trim()} : {}),
		};
	}

	if (typeof options.oauthToken === 'string' && options.oauthToken.trim().length > 0) {
		return {
			provider: provider.id,
			name,
			baseUrl,
			authType: 'oauth-token',
			oauthToken: options.oauthToken.trim(),
			...(typeof options.defaultModel === 'string' && options.defaultModel.trim().length > 0 ? {defaultModel: options.defaultModel.trim()} : {}),
		};
	}

	if (provider.auth === 'oauth-or-api-key') {
		const shouldUseOAuth = options.oauth === true ? true : !input.isTTY || !output.isTTY ? false : (await promptForAuthChoice()) === 'oauth';
		if (shouldUseOAuth) {
			const oauthResult = await loginWithOpenRouterOAuth();
			return {
				provider: provider.id,
				name,
				baseUrl,
				authType: 'api-key',
				apiKey: oauthResult.apiKey,
				...(typeof options.defaultModel === 'string' && options.defaultModel.trim().length > 0 ? {defaultModel: options.defaultModel.trim()} : {}),
			};
		}
	}

	const apiKey = typeof options.apiKey === 'string' && options.apiKey.trim().length > 0 ? options.apiKey.trim() : await promptForSecret('API key: ');

	return {
		provider: provider.id,
		name,
		baseUrl,
		authType: 'api-key',
		apiKey,
		...(typeof options.defaultModel === 'string' && options.defaultModel.trim().length > 0 ? {defaultModel: options.defaultModel.trim()} : {}),
	};
};

export const loginCommand = async (providerArg: string | undefined, options: LoginOptions): Promise<void> => {
	const provider =
		typeof providerArg === 'string' ? getProviderById(providerArg.trim().toLowerCase()) : await pickProviderInteractively({oauthOnly: options.oauth === true});
	if (!provider) {
		throw new TypeError(`Unknown provider: ${providerArg}`);
	}

	const connectionInput = await buildConnectionInput(provider, options);
	const store = loadAuthStore(getAuthConfigPath());
	const next = upsertConnection(store, connectionInput, {setAsDefault: options.setDefault === true});
	saveAuthStore(next, getAuthConfigPath());

	const defaultConnection = getDefaultConnection(next);
	const isDefault = typeof defaultConnection !== 'undefined' && defaultConnection.provider === provider.id && defaultConnection.name === connectionInput.name;
	console.log(`Saved connection ${connectionInput.name} (${provider.id})${isDefault ? ' as default' : ''} at ${getAuthConfigPath()}.`);
};

export const logoutCommand = (identifier: string | undefined): void => {
	if (typeof identifier !== 'string' || identifier.trim().length === 0) {
		throw new TypeError('Please provide a provider or connection name. Example: `ai-ts-test-harness logout ollama`.');
	}

	const store = loadAuthStore(getAuthConfigPath());
	const next = removeConnection(store, identifier.trim());
	saveAuthStore(next, getAuthConfigPath());
	console.log(`Removed connection matching ${identifier.trim()}.`);
};

export const authListCommand = (): void => {
	const store = loadAuthStore(getAuthConfigPath());
	if (store.connections.length === 0) {
		console.log('No saved connections. Run `ai-ts-test-harness login` first.');
		return;
	}

	const defaultConnection = getDefaultConnection(store);
	for (const connection of store.connections) {
		const marker = typeof defaultConnection !== 'undefined' && defaultConnection.id === connection.id ? '*' : ' ';
		const authLabel = connection.authType === 'none' ? 'none' : connection.authType;
		const modelSuffix = typeof connection.defaultModel === 'string' ? ` default-model=${connection.defaultModel}` : '';
		console.log(`${marker} ${connection.name} provider=${connection.provider} auth=${authLabel} url=${connection.baseUrl}${modelSuffix}`);
	}
};

export const authUseCommand = (identifier: string): void => {
	const trimmed = identifier.trim();
	if (!trimmed) {
		throw new TypeError('Please provide a connection identifier.');
	}

	const store = loadAuthStore(getAuthConfigPath());
	const next = setDefaultConnection(store, trimmed);
	saveAuthStore(next, getAuthConfigPath());
	console.log(`Default connection set to ${trimmed}.`);
};

type ModelListEntry = {
	provider: ProviderId;
	connection: string;
	models: string[];
	error?: string;
};

const listConnectionModels = async (connection: {
	provider: ProviderId;
	name: string;
	baseUrl: string;
	authType: 'none' | 'api-key' | 'oauth-token' | 'oauth-credentials';
	apiKey?: string;
	oauthToken?: string;
	oauthCredentials?: StoredOAuthCredentials;
}): Promise<ModelListEntry> => {
	if (isKnownPiProvider(connection.provider)) {
		const {provider} = connection;
		const models = getPiModels(provider)
			.map((model) => `${provider}/${model.id}`)
			.sort((left, right) => left.localeCompare(right));
		return {
			provider,
			connection: connection.name,
			models,
		};
	}

	try {
		const oauthCredentialsAccess = typeof connection.oauthCredentials === 'undefined' ? undefined : connection.oauthCredentials.access;
		const apiKey =
			connection.authType === 'api-key'
				? connection.apiKey
				: connection.authType === 'oauth-token'
					? connection.oauthToken
					: connection.authType === 'oauth-credentials'
						? oauthCredentialsAccess
						: undefined;
		const client = new OpenAI({
			baseURL: connection.baseUrl,
			apiKey: apiKey ?? 'ollama',
			maxRetries: 0,
		});
		const response = await client.models.list();
		const models = response.data.map((entry) => `${connection.provider}/${entry.id}`).sort((left, right) => left.localeCompare(right));
		return {
			provider: connection.provider,
			connection: connection.name,
			models,
		};
	} catch (error) {
		return {
			provider: connection.provider,
			connection: connection.name,
			models: [],
			error: error instanceof Error ? error.message : String(error),
		};
	}
};

export const modelsCommand = async (search: string | undefined): Promise<void> => {
	const store = loadAuthStore(getAuthConfigPath());
	if (store.connections.length === 0) {
		console.log('No saved connections. Run `ai-ts-test-harness login` first.');
		return;
	}

	const entries = await Promise.all(store.connections.map(listConnectionModels));
	const needle = typeof search === 'string' && search.trim().length > 0 ? search.trim().toLowerCase() : undefined;
	for (const entry of entries) {
		if (entry.models.length === 0) {
			const suffix = typeof entry.error === 'string' ? ` (${entry.error})` : '';
			console.log(`${entry.connection} [${entry.provider}] no model list available${suffix}`);
			continue;
		}

		const visibleModels = typeof needle === 'string' ? entry.models.filter((model) => model.toLowerCase().includes(needle)) : entry.models;
		for (const model of visibleModels) {
			console.log(model);
		}
	}
};
