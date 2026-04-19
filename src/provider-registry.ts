import {DEFAULT_OLLAMA_URL} from './config.ts';

export type ProviderId = 'ollama' | 'openai' | 'openrouter';

export type ProviderAuthKind = 'none' | 'api-key' | 'oauth-or-api-key';

export type ProviderDefinition = {
	id: ProviderId;
	name: string;
	auth: ProviderAuthKind;
	defaultBaseUrl: string;
};

const PROVIDERS: readonly ProviderDefinition[] = [
	{
		id: 'ollama',
		name: 'Ollama',
		auth: 'none',
		defaultBaseUrl: DEFAULT_OLLAMA_URL,
	},
	{
		id: 'openai',
		name: 'OpenAI',
		auth: 'api-key',
		defaultBaseUrl: 'https://api.openai.com/v1',
	},
	{
		id: 'openrouter',
		name: 'OpenRouter',
		auth: 'api-key',
		defaultBaseUrl: 'https://openrouter.ai/api/v1',
	},
];

const providerById = new Map<ProviderId, ProviderDefinition>(PROVIDERS.map((provider) => [provider.id, provider]));

export const getProviders = (): readonly ProviderDefinition[] => PROVIDERS;

export const getProviderById = (providerId: string): ProviderDefinition | undefined => {
	if (providerId !== 'ollama' && providerId !== 'openai' && providerId !== 'openrouter') {
		return undefined;
	}

	return providerById.get(providerId);
};
