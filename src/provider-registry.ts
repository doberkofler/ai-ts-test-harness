import {DEFAULT_OLLAMA_URL} from './config.ts';
import {getModels as getPiModels, getProviders as getPiProviders} from '@mariozechner/pi-ai';
import {getOAuthProviders} from '@mariozechner/pi-ai/oauth';

export type ProviderId = string;

export type ProviderAuthKind = 'none' | 'api-key' | 'oauth' | 'oauth-or-api-key';

export type ProviderDefinition = {
	id: ProviderId;
	name: string;
	auth: ProviderAuthKind;
	defaultBaseUrl: string;
};

const toProviderDisplayName = (providerId: string): string =>
	providerId
		.split('-')
		.map((segment) => {
			if (segment.length === 0) {
				return segment;
			}

			const firstChar = segment.at(0);
			if (typeof firstChar !== 'string') {
				return segment;
			}

			return `${firstChar.toUpperCase()}${segment.slice(1)}`;
		})
		.join(' ');

const oauthProviderIds = new Set(getOAuthProviders().map((provider) => provider.id));

const piProviders: ProviderDefinition[] = getPiProviders().map((providerId) => {
	const models = getPiModels(providerId);
	const [firstModel] = models;
	const defaultBaseUrl = typeof firstModel === 'undefined' ? 'https://api.openai.com/v1' : firstModel.baseUrl;
	const auth: ProviderAuthKind = providerId === 'openrouter' ? 'oauth-or-api-key' : oauthProviderIds.has(providerId) ? 'oauth' : 'api-key';

	return {
		id: providerId,
		name: toProviderDisplayName(providerId),
		auth,
		defaultBaseUrl,
	};
});

const PROVIDERS: readonly ProviderDefinition[] = [
	{
		id: 'ollama',
		name: 'Ollama',
		auth: 'none',
		defaultBaseUrl: DEFAULT_OLLAMA_URL,
	},
	...piProviders,
];

const providerById = new Map<string, ProviderDefinition>(PROVIDERS.map((provider) => [provider.id, provider]));

export const getProviders = (): readonly ProviderDefinition[] => PROVIDERS;

export const getProviderById = (providerId: string): ProviderDefinition | undefined => providerById.get(providerId);
